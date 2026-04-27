# UniGo HK — v5 Interiors System (Drop 1)

This drop builds the **infrastructure** for walk-in interior scenes
(Library, Café, Social, Dating Corner). Drop 1 ships the system; Drop 2
will fill in the four real interiors with custom geometry, NPCs, and
per-scene ambient tracks.

After applying this drop, the plaza behaves exactly as before — *plus*
glowing entry rings appear in front of each zone landmark. Walking
into an entry ring shows a "Press E to enter [scene]" prompt; confirming
fades the screen to black, swaps the scene, and respawns the player
inside a placeholder room with the scene's name on the back wall and a
glowing exit pad near the front. Walking onto the exit pad fades back to
the plaza at the right spot.

Multiplayer is scene-scoped: students in the plaza only see other
students in the plaza, students in the library only see other students
in the library, etc.

---

## Deploy order (IMPORTANT)

1. **Apply `migration-v7-interiors.sql` to Supabase first.**
   - Adds `scene` columns + indexes + CHECK constraint.
   - Idempotent — safe to re-run.
   - If you deploy the new code before the migration, presence updates
     will fail with a "column does not exist" error for everyone.
2. **Then push to git and deploy** (or run `vercel --prod`).
3. (Optional) Drop ambient sound files into `client/public/audio/`
   (see "Ambient sound" below). Without these, scenes are silent —
   no error, just no audio.

---

## What changed

### New files

| Path | Purpose |
|------|---------|
| `migration-v7-interiors.sql` | Adds `scene` to `plaza_presence` & `plaza_bubbles`, indexes, CHECK constraint. |
| `client/src/lib/scenes.ts` | Scene config registry (single source of truth). |
| `client/src/contexts/SceneContext.tsx` | Global current-scene state + transition state machine + mute state. |
| `client/src/components/plaza/SceneRouter.tsx` | Picks `<PlazaScene>` or `<InteriorScene>` based on context. |
| `client/src/components/plaza/SceneTransition.tsx` | Fade-to-black overlay with destination label. |
| `client/src/components/plaza/EntryTrigger.tsx` | Proximity-detected "Press E to enter" prompt. |
| `client/src/components/plaza/AmbientSound.tsx` | Web Audio crossfade between scene tracks. |
| `client/src/components/plaza/ZoneParticles.tsx` | Per-scene particle system (petals/sparkles/dust/leaves/motes). |
| `client/src/components/plaza/scenes/PlazaScene.tsx` | Wraps existing `Environment3D`; mounts entry triggers. |
| `client/src/components/plaza/scenes/InteriorScene.tsx` | Generic placeholder room (Drop 2 will replace per-scene). |
| `diffs/Plaza.interiors-drop1.diff` | Diff against the previous `Plaza.tsx`. |
| `diffs/plaza-api.interiors.diff` | Diff against the previous `api/plaza.mjs`. |
| `diffs/plaza-lib.interiors.diff` | Diff against the previous `client/src/lib/plaza.ts`. |

### Modified files

- **`api/plaza.mjs`** — `update-position`, `get-players`, `send-bubble`,
  `get-bubbles` all accept and filter by `scene`. Missing `scene` defaults
  to `'plaza'` (backward-compat for half-deployed states).
- **`client/src/lib/plaza.ts`** — exports `SceneId` type. `updatePosition`
  takes a `scene` field. `getPlayers`, `getBubbles`, `sendBubble` all
  take `scene` as a required parameter.
- **`client/src/pages/Plaza.tsx`** — wrapped in `<SceneProvider>`,
  inner component renamed to `PlazaInner`. Replaces `<Environment3D>`
  with `<SceneRouter>`. Adds `<SceneTransition>`, `<AmbientSound>`,
  `<ZoneParticles>`. Threads `currentScene` through API calls. Adds
  a mute toggle button to the top-right HUD. Wires `teleportRef` to
  `PlayerController` so scene changes respawn the player at the
  destination's spawn point.

### Notes on PlayerController

The previous drop already added a `teleportRef` prop to
`PlayerController` with comments referencing the scene-switching system.
Drop 1 wires it up — no changes to `PlayerController.tsx` itself.

---

## How the system works (architecture)

### State

`SceneContext` exposes:
- `currentScene: SceneId` — what scene we're rendering right now.
- `targetScene: SceneId` — what scene we're heading to during a fade
  (equals `currentScene` when idle).
- `transitionState: 'idle' | 'fading-out' | 'fading-in'` — fade phase.
- `spawnPointRef` — the spawn point for the *currently entering* scene,
  consumed by Plaza.tsx's teleport effect.
- `requestSceneChange(id, opts?)` — kick off a transition. Idempotent
  during a fade.
- `muted` / `setMuted` — ambient sound mute toggle.

### Transition lifecycle

```
EntryTrigger.confirm()
  └── requestSceneChange('library')
        ├── transitionState = 'fading-out'   ─┐
        ├── (wait fadeOut + hold = 800ms)     │ SceneTransition fades
        ├── currentScene = 'library'          │ to black during this
        ├── spawnPointRef.current = [0,0,6]   │ window
        ├── transitionState = 'fading-in'    ─┤
        ├── (Plaza.tsx teleportRef effect    ─┘
        │   fires; PlayerController warps
        │   the avatar on the next frame)
        ├── (wait fadeIn + hold = 800ms)
        └── transitionState = 'idle'
```

### Multiplayer scoping

Every API call now carries a `scene` query param or body field. The
server filters `plaza_presence` and `plaza_bubbles` by that scene before
returning. Two students in different scenes don't see each other or
each other's chat bubbles. The HUD's "students online" counter shows
players in the *current* scene only (plus the NPC count from Drop 4 if
`COUNT_NPCS_AS_PLAYERS` is true — which it currently is).

### Entry triggers

`PlazaScene` mounts one `EntryTrigger` per interior, positioned in
front of the corresponding zone landmark. Trigger positions come from
`scenes.ts`'s `entryFromPlaza` field — change them there, not in
component code. The trigger renders a soft glowing ring on the ground
plus a confirmation pill that appears when the player is within range.
'E' on keyboard or click/tap on the pill confirms.

### Exit pads

`InteriorScene` renders a glowing tile near the front of the room and
mounts an `EntryTrigger` with `sceneId="plaza"` and a `targetSpawn`
override pulled from the scene's `exitToPlaza` config. Same component,
different target — that's it.

### Ambient sound

`AmbientSound` is mounted once at the top of `PlazaInner` (outside the
Canvas — it's a regular DOM `<audio>` wrapper). It watches
`currentScene` from the context and crossfades between two HTMLAudioElement
instances when the scene changes. If the configured file is missing
or autoplay is blocked, it fails silently — sound is decorative, never
blocking.

To add tracks, drop CC0 ambient loops at:

```
client/public/audio/library.mp3
client/public/audio/cafe.mp3
client/public/audio/social.mp3
client/public/audio/dating.mp3
```

Recommended sources: Pixabay Music (free, no attribution required),
freepd.com, tabletopaudio.com.

The plaza itself has no ambient track configured by default. You can
add one by setting `ambientSound: '/audio/plaza.mp3'` in `scenes.ts`.

### Particles

`ZoneParticles` renders a single `<points>` cloud sized to the active
scene's bounds. Behaviour varies by `kind`:

- `petals` — falling, gentle horizontal sway (Dating Corner).
- `sparkles` — twinkling, slight upward drift (Social Stage).
- `dust` — slow upward drift, low density (Library).
- `leaves` — falling, drifting (unused in Drop 1 but available).
- `motes` — gentle upward drift (Plaza, Café default).

Particles are recycled (re-spawned at top/bottom) when they leave the
scene bounds, so density stays steady.

---

## Database schema change (`migration-v7-interiors.sql`)

```sql
ALTER TABLE plaza_presence
  ADD COLUMN IF NOT EXISTS scene TEXT NOT NULL DEFAULT 'plaza';

ALTER TABLE plaza_bubbles
  ADD COLUMN IF NOT EXISTS scene TEXT NOT NULL DEFAULT 'plaza';

CREATE INDEX IF NOT EXISTS idx_plaza_presence_scene_updated
  ON plaza_presence(scene, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_plaza_bubbles_scene_created
  ON plaza_bubbles(scene, created_at DESC);

-- + CHECK constraints limiting scene to the valid set
```

The CHECK constraint allowlist:
`('plaza', 'library', 'cafe', 'social', 'dating')`. Mirrors
`VALID_SCENES` in `api/plaza.mjs` and the `SceneId` union in
`client/src/lib/plaza.ts`. Adding a new scene later means touching all
three of these in one change (plus an entry in `scenes.ts`).

---

## Testing checklist after deploy

1. Plaza loads as before — no visible change to the outdoor environment.
2. Glowing rings appear in front of the four zone landmarks (Library,
   Café, Social, Dating).
3. Walking into a ring shows the "Press E to enter [scene]" prompt.
4. Pressing E (or clicking the prompt) fades to black, then drops the
   player into a small placeholder room with the scene's name on the
   back wall.
5. The room has a glowing white tile near the front. Walking onto it
   triggers a fade back to the plaza, landing near where you entered.
6. The mute button (speaker icon) in the top-right HUD toggles audio.
7. Two browsers logged in as different users:
   - Both in plaza → see each other.
   - One enters Library, other stays in plaza → they no longer see
     each other.
   - Other one also enters Library → they see each other again.

---

## What's intentionally NOT in Drop 1

- **Real interior geometry.** All four interiors share the placeholder
  room. Drop 2 will replace `InteriorScene.tsx` with per-scene
  components (or branch internally on `sceneId`).
- **NPCs inside interiors.** None for now. Drop 2 will add them.
- **Custom particles per scene with full polish.** The system supports
  it; Drop 1 just uses the kind/color/density from `scenes.ts` with
  generic motion. Drop 2 may tune drift directions or add per-particle
  rotation for petals/leaves.
- **Audio files.** Shipping CC0 audio in the zip would bloat it and
  you should pick tracks you actually like (see "Ambient sound" above).

---

## Known issues / things to watch

- **First scene change requires a user gesture for audio.** This is a
  browser autoplay rule, not something we can work around. Since the
  user clicks/taps the entry trigger, that gesture activates audio
  fine — but if the player walks into a ring and presses E *via
  keyboard only* before having clicked anywhere, audio may stay
  silent until any subsequent click. This is a UX edge case worth
  remembering when testing.
- **The `?action=...` URL pattern.** `getPlayers` and `getBubbles`
  pass scene by inlining `&scene=...` in the action string
  (e.g. `'get-players&scene=library'`). This is a slight hack against
  the existing `plazaFetch` helper — the cleaner refactor is to give
  the helper a `params` argument. Not done here to keep the diff
  small. Reasonable to revisit when you next touch the API lib.
- **Fade timing is hard-coded.** `FADE_OUT_MS = 600`, `HOLD_MS = 200`,
  `FADE_IN_MS = 600`. Total transition is ~1.6s. Adjust in
  `SceneContext.tsx` and the matching constants in
  `SceneTransition.tsx` if it feels too slow/fast.

---

## Verification

I ran `tsc --noEmit` against the project tsconfig with `--noResolve`
(needed because `node_modules` isn't installed in this environment).
**No genuine type errors in any new or modified files.** The only errors
reported are:

1. `Cannot find type definition file for 'node'` — pre-existing,
   environmental (no `@types/node` in `node_modules`).
2. `Cannot find type definition file for 'vite/client'` — same.
3. `Option 'baseUrl' is deprecated` — pre-existing in `tsconfig.json`,
   already noted in the v4 NPCs CHANGES.

I also ran `node --check` against `api/plaza.mjs` — clean.

When you actually run `npm run check` (or `npx tsc --noEmit`) with
deps installed, those three pre-existing warnings should be the only
output, just like after Drop 4.
