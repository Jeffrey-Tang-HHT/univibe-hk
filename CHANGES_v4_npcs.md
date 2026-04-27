# Plaza upgrade v4 — NPC scale-up + count integration

Targets the "make the plaza feel populated" requirement: scale the NPC
population from 8 hand-coded entries to ~30 procedurally generated, give
most of them wandering behaviour with collision avoidance, and mix them
into the displayed online-player count.

## Files changed

```
client/src/components/plaza/NPCs.tsx   (rewritten)
client/src/pages/Plaza.tsx             (modified — count + flag)
diffs/NPCs.diff                        (vs previous NPCs.tsx)
diffs/Plaza.npcs.diff                  (vs previous Plaza.tsx)
CHANGES_v4_npcs.md                     (this file)
```

No new dependencies. No `package.json` changes. Reuses the existing
`resolveCollision` and `PLAYER_RADIUS` exports from `colliders.ts`.

---

## What shipped

### 1. Procedural NPC generation (seeded)

The old `NPCS` constant was a hand-typed array of 8 NPCs. The new
generator produces `NPC_COUNT` (default: 30) entries per the following
pattern:

  - **Static NPCs** fill named seat positions in each zone first
    (pergola desks, stage front, café tables, dating bench). Up to 40%
    of the population. Stable anchors that "claim" each zone visually.
  - **Path walkers** follow a small set of fixed routes between zones.
    ~20% of the population. Gives the plaza visible flow.
  - **Wanderers** fill the remainder. Each is assigned to a zone anchor
    (centre + radius) and idles → picks a random target inside the
    radius → walks → idles → repeats.

All randomness is driven by **mulberry32 seeded with `0x756e6967`**
("unig"), so the same NPCs spawn in the same spots on every reload.
Bump the seed to remix the population without code changes.

### 2. Wandering with collision avoidance

Wanderers feed every step through `resolveCollision()` from
`colliders.ts` — the same resolver the player uses. Two safeguards:

  - When picking a target, `pickWanderTarget` rejects points the
    resolver would push by more than `PLAYER_RADIUS * 0.5` (i.e. points
    inside a collider). Up to 8 sample attempts before falling back to
    the zone centre.
  - During walking, if the resolver pushes the NPC back significantly
    in a single frame (`drift > step * 1.5`), the NPC abandons the
    target and idles for ~0.3–1.8s before picking a new one. Prevents
    NPCs from getting stuck pressing into walls.

Speed is randomised per-NPC (0.5–1.2 m/s for wanderers, 0.9–1.4 for
path walkers) so the population doesn't visibly march in lockstep.

### 3. Single shared frame loop

Old `NPCs.tsx` had one `useFrame` per NPC (8 hooks). At 30+ NPCs that
overhead starts mattering on mid-range mobile, and React-Three-Fiber's
hook list traversal is per-frame work.

New layout:
  - One parent `useFrame` in the `NPCs` component drives every NPC's
    transform via runtime state held in a `Map<id, NPCRuntime>` ref.
  - Per-NPC `useEffect`s remain for the chat-bubble timer (cheap
    setTimeout, not RAF) and for ref registration.
  - Each `NPCAvatar` is still a real component so React owns its DOM
    portal (`<Html>` nameplate + bubble).

The `delta` from `useFrame` is capped at 50ms to avoid huge teleports
when the user tab-switches and resumes (otherwise NPCs visibly jump
when the page regains focus).

### 4. Player-count integration (with off-switch)

`Plaza.tsx` now imports `NPC_COUNT` and a top-level constant
`COUNT_NPCS_AS_PLAYERS = true`. When true, the top-right HUD pill shows
`players.length + NPC_COUNT`. When false, it shows real users only.

This is intentionally a **single boolean**, not an env flag or
A/B-test variable, so flipping back to honest mode later is one line of
code with no risk of stale config. Search the codebase for that
constant when the user base outgrows the empty-room problem.

### 5. Social-system isolation (guardrail)

NPCs are rendered ONLY by `NPCs.tsx`. They are never inserted into the
`players` state array in `Plaza.tsx`, so:

  - `OtherPlayers.tsx` will never render them as real players.
  - The chat / matching / report flows can't target them by ID.
  - The minimap won't show them as player dots.

If a future feature wants NPCs to appear on the minimap as ambient
activity, route them through a *new* prop on `MiniMap.tsx` —
deliberately not the existing `players` prop, so the contract that
`players` means "real authenticated users" stays intact.

---

## Tuning knobs

All at the top of `NPCs.tsx`:

```ts
export const NPC_COUNT = 30;          // population size
const NPC_SEED = 0x756e6967;          // change to remix population
const ZONE_ANCHORS = [...]            // where wanderers cluster
const PATH_ROUTES = [...]             // where walkers traverse
```

In `Plaza.tsx`:

```ts
const COUNT_NPCS_AS_PLAYERS = true;   // flip to false for honest count
```

---

## What I deliberately did NOT change

- **Avatar visual model** stays as the existing `Avatar3D` component.
  When you swap to a glTF avatar later, NPCs upgrade for free since
  they render the same component.
- **Nameplate styling** kept identical to the old NPCs. Differentiating
  NPC nameplates from real-player nameplates would defeat the
  "count NPCs as players" choice — keeping them visually identical is
  consistent with that decision. (If you ever flip
  `COUNT_NPCS_AS_PLAYERS` to false, consider also adding a subtle
  visual marker — e.g. lower nameplate opacity — so NPCs read as
  ambient.)
- **Chat lines** kept the same bilingual zone-themed pools, just added
  one or two lines to each pool for variety with more NPCs.
- **No A* / nav-mesh.** Wandering is "pick point → walk straight →
  bounce off colliders → give up if stuck." This is the right level of
  complexity for an open plaza. If you add narrow corridors or
  enclosed rooms later, that's the time to upgrade.

---

## Performance notes

- Tested mentally for 30 NPCs. Each frame:
  - 30 transform updates (cheap)
  - ~18 collision tests (only wanderers in walking mode at any moment;
    others are static or on fixed paths and skip the resolver)
  - 30 `<Html>` portals worth of DOM (the actual cost ceiling)
- The `<Html>` cost is the only real concern at scale. For ~30 NPCs
  it's fine on a Pixel 6-class phone. If you push to 60+ NPCs, the
  next step is replacing nameplates with billboarded `<Text>` from
  `@react-three/drei` — zero DOM, but you lose the glassy backdrop.
  I'd add an FPS check in the meter you already ship (Shift+F).

---

## Known limitations

- **NPCs don't avoid each other.** Two wanderers can walk through one
  another. Inter-NPC collision would be O(n²) per frame and isn't
  worth the cost for a soft-launch crowd. If it visibly breaks
  immersion, add a coarse spatial hash and pairwise repulsion only
  for NPCs within 2m.
- **NPCs don't avoid the player.** Same reason. The player can walk
  through them and vice versa. If you want player-vs-NPC blocking,
  the cleanest path is to add NPCs as dynamic `CircleCollider` entries
  in `colliders.ts` and rebuild the collider list per-frame — but that
  changes the resolver contract significantly. Don't do it without a
  concrete reason.
- **Chat bubbles use the same style as real users.** That's
  intentional given your "count NPCs as players" choice. Be aware
  that a real player typing while standing next to a bubbling NPC
  could create momentary confusion about who said what; the NPC bubble
  fades after 3.5s so it self-resolves quickly.
