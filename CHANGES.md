# Plaza upgrade v3 — HUD polish, waypoints, feedback

Build on top of v2 (which added limb walk-cycle and collision). This drop
targets the UI polish list: clearer zone affordances, better mini-map,
click-to-travel, polished name tags, auto-collapsing movement-log pill,
zone-transition feedback, and a dev FPS meter.

## Files in this zip

```
client/src/components/plaza/Environment3D.tsx   (modified)
client/src/components/plaza/PlayerController.tsx (modified — builds on v2)
client/src/components/plaza/MiniMap.tsx         (rewritten)
client/src/components/plaza/OtherPlayers.tsx    (rewritten)
client/src/components/plaza/FPSMeter.tsx        (new)
client/src/components/plaza/Avatar3D.tsx        (carried over from v2)
client/src/components/plaza/colliders.ts        (carried over from v2)
client/src/pages/Plaza.tsx                      (modified)
diffs/Environment3D.diff                        (vs original repo)
diffs/MiniMap.diff                              (vs original repo)
diffs/OtherPlayers.diff                         (vs original repo)
diffs/Plaza.diff                                (vs original repo)
diffs/PlayerController.vs-v2.diff               (vs v2 drop)
CHANGES.md                                      (this file)
```

To apply:

```bash
# From your repo root (the one containing client/, server/, package.json).
# If you haven't applied v2 yet, this zip also contains v2's Avatar3D,
# PlayerController, and colliders.ts — so unzipping this alone is enough.
unzip -o ~/Downloads/unigo-plaza-upgrade-v3.zip
```

No new dependencies. No changes to `package.json`.

---

## What shipped

### 1. Zone approach affordance (`Environment3D.tsx`)

The light-blue zone discs used to just sit there. Now they react to your
proximity:

- A **pulsing glow ring** fades in as you get within 10m of a zone and peaks
  at the 5m "enter ring", drawn as a ring mesh above the disc so it renders
  cleanly without z-fighting.
- A **floating bilingual "Enter ⟶ <zone>" prompt** appears above the
  landmark, styled as a glassy pill in the zone's colour. Slides out once
  you're clearly inside the zone (< 3.5m) so it doesn't sit on top of you.
- Position updates are driven by a **shared `playerPosRef`** written by
  `PlayerController` every frame and read inside `ZoneMarker`'s frame loop.
  No React re-renders — the pill toggles `display`/`opacity` directly.

Tuning constants at the top of the ZoneMarker section:

```ts
const APPROACH_DIST = 10;  // prompt starts fading in
const ENTER_DIST = 5;      // prompt peaks
const INSIDE_DIST = 3.5;   // prompt fades out (you've arrived)
```

### 2. Mini-map overhaul (`MiniMap.tsx`)

- **20 % bigger** (`w-40 h-40` → `w-48 h-48`).
- **Player facing arrow** — a chevron rotates around the player dot, driven
  by a new `myRotation` prop.
- **Click to set a waypoint** — tap anywhere on the map and a gold pin
  appears at that world position; a dashed route line connects you to it.
- **Right-click (desktop) or "Cancel ✕" button (mobile)** clears the
  waypoint.
- A small **"Tap to travel"** hint replaces the bottom-left badge when no
  waypoint is active.
- Distinct zone icons (library, stage, heart, café) were already there and
  are preserved.

SVG coord conversion is straightforward:
`worldX = svgX / SCALE - MAP_SIZE / 2` (and same for Z). The scale is
`SCALE = 100 / MAP_SIZE` with `MAP_SIZE = 140` — covers the full playable
region (±45 in X/Z) with margin.

### 3. Waypoint auto-walk (`PlayerController.tsx`)

Tapping the mini-map sets `waypointRef.current`. Each frame, if the user
isn't actively steering, the controller:

1. Computes the vector from player to target.
2. Normalises it, applies a gentle slow-down under 2.5m from the target so
   you don't skid into a wall.
3. Feeds it into the existing velocity/collision pipeline — so auto-walk
   respects every collider from v2 automatically.
4. Clears the waypoint on arrival (< 0.6m), on manual input, or if the
   collision resolver stops progress (`< 3mm` of actual movement ⇒ the
   path is blocked, cancel).

No pathfinding here — it's a straight-line "magnet" with collision bounce.
Good enough for an open plaza; if you later add enclosed rooms, this is the
place to slot in A* over a coarse grid.

### 4. Name-tag polish (`OtherPlayers.tsx`)

Old tag: one dark plane + two text lines. New tag: a layered glass pill:

```
[ drop shadow ] [ dark body 72% ] [ bottom accent tint ] [ top accent strip ] [ speaker dot ]
```

- The **top accent strip** picks up the player's own shirt colour by
  default — subtle personal identifier — and switches to gold when the
  player has an active chat bubble (a pulsing dot also appears next to the
  name).
- We can't actually run `backdrop-filter` inside Three.js; layered planes
  at different opacities fake the glassy look well enough.

I did **not** wire a real "friends" colour because no friends system exists
in the codebase. If you add one, replace `isSpeaking` with something like
`player.friend_status === 'friends'` and it'll just work.

### 5. Zone transition feedback (`Plaza.tsx`)

When you cross a zone boundary:

- The existing HUD pill pulses (was already there).
- A **radial colour wash** in the new zone's hue fades in over 600ms and
  out again — rendered as an absolute-positioned gradient with
  `mix-blend-mode: screen` so it tints the scene rather than obscuring it.
- Reuses the same `zoneChangeFlash` state that already drives the pill
  animation, so both effects stay in sync.

### 6. Movement-log pill auto-collapse (`Plaza.tsx`)

The pill that opens the journey log used to sit at full width at all
times. Now:

- It expands on mount, then **auto-collapses to an icon-only pill after 3 s**.
- Zone change → re-expands for another 3 s.
- First tap on the collapsed pill expands it; second tap opens the journey
  log. The `AnimatePresence` + `layout` animation keeps the transition
  smooth.

This reclaims about 180 px of bottom-left screen real estate after the
first few seconds.

### 7. FPS / frame-time meter (`FPSMeter.tsx`)

New component. Hidden by default. Press **Shift+F** to toggle.

- Samples the last 60 frames via `requestAnimationFrame`.
- Shows averaged FPS and "peak ms" (worst frame in the window — a rough
  1% low proxy, which is actually what perception of smoothness tracks).
- Colour-coded: green ≥ 55 fps, amber ≥ 30, red below.
- Updates its displayed numbers only ~4× per second so the meter itself
  doesn't show up in its own measurements.

No dependency on Three.js or drei — pure React + RAF, so it keeps running
even if the canvas unmounts during hot reloads.

---

## What was intentionally NOT shipped

Everything below was in your list but depends on a system that doesn't exist
in the current codebase. Building a convincing-looking fake for any of
these would be worse than not having them at all — users would think the
feature works when it doesn't. Called out here so you know they're not
forgotten, just waiting for the underlying system.

- **Proximity voice chat indicators**. There is no voice transport in the
  plaza today — no WebRTC, no audio mixer. I hinted at this by making the
  name-tag speaker state driven by the presence of a chat bubble, so the
  visual hook is ready; when real voice state exists, replace `isSpeaking`
  in `OtherPlayers.tsx` with the real flag.
- **Friend colour-coding on name tags**. No friends system in the code.
  Same story: the accent-colour pipeline is there, feed it the real status.
- **"Join Table" quick-action near grouped NPCs**. `NPCs.tsx` doesn't know
  about seats or tables as first-class entities — they're just positions.
  Needs a data model (which bench belongs to which group, how many seats)
  before a UI makes sense.
- **Focus Mode notification mute in the study zone**. There's no generic
  notification stream to mute; `toast()` calls are scattered ad-hoc.
  Needs a central notification service first.
- **Interactive books / laptops / whiteboards triggering collab tools**.
  That's a product, not a polish pass. The collab tools don't exist yet.
- **Gazebo availability (N/M seats taken)**. Needs seat semantics on the
  pergola and some way to reserve them — out of scope for a UI commit.
- **Progressive LOD on props**. The props are already instanced (one draw
  call per prop type from v2's instancing work). LOD would need per-prop
  detail levels and a distance-based switcher; not worth half-doing, and
  the FPS meter now ships so you can actually measure whether it's needed.
- **Quick-emote wheel (wave / sit / dance)**. Would need avatar animation
  support beyond the walk cycle — an `action` state on `Avatar3D` plus
  animation curves. Doable but it's its own commit; the UI button layout
  in `Plaza.tsx` has space reserved for it next to the joystick.

---

## Known limitations

- **Auto-walk is straight-line only.** If a collider sits between you and
  the waypoint, the player will push against it until stall-detection
  cancels the trip (< 3mm of movement). Feels like "oh, can't get there
  from here" rather than a smart reroute.
- **`<Html>` in `ZoneMarker`.** Four zones = four DOM nodes added to the
  Canvas portal. That's fine, but if you add more zones the performance
  tradeoff vs. a pure-3D Billboard prompt is worth revisiting.
- **I couldn't run `tsc` or a dev-server build** (no `node_modules`,
  network disabled). Hand-verified: braces / parens / brackets balanced
  across all files, imports resolve to real module paths, all new props
  are consumed by their targets. If the build surfaces anything, paste it
  and I'll fix it.
