# UniGo HK — Changelog

All notable changes to UniGo HK. Most-recent version first.

---

## v9 — Plaza Polish 2: Settings, Perf, Ambience *(2026-05-08)*

Seven items off the v8 follow-up list. No DB migration, no env-var
changes, no new runtime dependencies (the lucide-react alias is a
build-time config only).

### Day/Night settings panel

The v6 cycler-icon (real-hk → accelerated → fixed-noon, by tap) was
fine for a demo but made it impossible to tune cycle length, pick a
non-noon fixed hour, or turn off stars. Replaced with a proper
settings dialog.

- New `client/src/components/plaza/DayNightSettings.tsx` — compact
  dialog mirroring `AvatarCustomizer`'s layout. Mode is a 3-button
  radio group (`real-hk` / `accelerated` / `fixed`); the cycle-length
  and fixed-hour controls only render in their respective modes.
  Sliders for `cycleMinutes` (2–30) and `fixedHour` (0–23.75 in 15-min
  steps) plus four golden-hour preset buttons (sunrise / noon /
  sunset / midnight) for one-tap iconic lighting. A separate stars
  toggle. Reset button restores the defaults.
- `DayNightCycle.tsx` — new `starsEnabled` prop. Implementation gates
  the keyframed `starOpacity` to 0 when disabled, so the user can
  toggle without remounting the points geometry.
- `Plaza.tsx` — replaced `dayNightMode` state with a full
  `dayNightSettings` object. Persists to `plaza:dayNightSettings`
  localStorage key. v6's `plaza:dayNightMode` value is read once and
  migrated forward, so existing users don't lose their preference on
  the upgrade. The settings dialog and `AvatarCustomizer` share the
  top-right panel slot, so opening one closes the other.

### Animated water on the fountain

`Fountain` in `Environment3D.tsx` now uses a custom shader for all
three basin water discs:

- Two scrolling layers of value-noise (cheap hash + smoothed lerp;
  no texture fetches) → ripple.
- Two perpendicular sine bands → caustic-style sun-glint shimmer.
- Radial falloff darkens the rim slightly so the water reads as
  sitting *inside* the bowl.
- Same uniforms object passed to all three meshes — sync stays
  perfect across tiers without per-frame copies.

Removed the rotating mesh trick (`useFrame` y-rotation on the outer
basin) since the shader now drives all the visual motion.

### Frustum/distance culling for NPCs and other players

- New `client/src/components/plaza/playerPosBus.ts` — module-level
  singleton holding the live player (x, z). Written every frame by
  `PlayerController.tsx`, read by `NPCs.tsx`, `OtherPlayers.tsx`, and
  `Environment3D.tsx` *inside their own useFrame loops*. Avoids the
  cost of putting per-frame position state through React.
- `NPCs.tsx` — the shared frame loop now toggles each NPC group's
  `.visible` based on squared distance to the player vs. the
  `CULL_DIST.AVATAR` (~40m) cutoff. Behaviour state machine still
  ticks for hidden NPCs so they don't visibly teleport when they
  re-enter range.
- `OtherPlayers.tsx` — same cutoff applied to remote-player avatars.
  Hides the entire subtree (avatar, billboarded nameplate, emote
  popup) in one `.visible = false`.
- Three `CULL_DIST` presets exported from `playerPosBus.ts` so future
  scene additions inherit consistent thresholds.

### LOD for distant trees

`InstancedTrees` in `Environment3D.tsx` keeps the same instanced
sub-meshes for near trees, but trees beyond `CULL_DIST.TREE_LOD`
(~30m) swap to a 2-quad cross-card billboard. Reclassification runs
at 4Hz inside a useFrame (per-frame is overkill for what's a slow
visual change and would flicker right at the cutoff). The trunk
cylinder stays visible at all distances so the silhouette doesn't
break.

### Footprint / dust trail

New `client/src/components/plaza/FootprintTrail.tsx`. Ring buffer of
24 small dark discs allocated once and recycled round-robin. A new
print is dropped every 0.55m of player travel, with alternating
left/right offset relative to travel direction so it reads as a
two-foot trail. 5-second fade tied to a hold-then-decay curve. Read
position from the same `playerPosBus`. Mounted only in
`PlazaScene.tsx` (outdoor only).

### Birds + butterflies (ambient creatures)

New `client/src/components/plaza/AmbientCreatures.tsx`. Four
billboarded birds in slow circular orbits at ~6m altitude (with
gentle vertical drift). Six butterflies meandering between random
anchor points, retargeting every 6–14s. Wing flap is faked by
animating the X scale of each billboarded plane (3D rotation would
break the billboard alignment). Birds use the wider AVATAR cull
cutoff so the sky doesn't feel empty; butterflies cull at the
tighter AMBIENT cutoff (~25m) since they're sub-pixel beyond that.

### Bundle: split lucide-react imports

- `vite.config.ts` — new `lucide-react/icons` alias mapping to the
  package's `dist/esm/icons` directory.
- `client/src/lucide.d.ts` — module declaration so TypeScript
  recognises the per-icon import path.
- Plaza-track files (`Plaza.tsx`, `JourneyLog.tsx`, `EmoteBar.tsx`)
  now use one import line per icon instead of the destructured
  barrel. Production builds tree-shook the barrel anyway, but dev
  mode would bundle the entire icon set; this also marginally
  speeds dev cold-start.

### Tech-stack housekeeping cleanup

- Removed `Avatar3D.diff` and `PlayerController.diff` from repo
  root — they were marked as removed in v7 but the file deletion
  hadn't actually been applied to the repo. (The `diffs/` folder
  remains; those are intentional historical reference.)
- Removed `CHANGES.md`, `CHANGES_v4_npcs.md`, `CHANGES_v5_interiors_drop1.md`,
  `CHANGES_v5_interiors_fixes.md`, `CHANGES_v6_daynight_emotes.md` —
  same situation. Their content lives in this `CHANGELOG.md` already.

### LocalStorage migration (automatic, no user action)

```
plaza:dayNightMode         → plaza:dayNightSettings (read-once migration)
```

If a user has the v6 mode key, it's lifted into the new settings
object on first load and the new key is written. The old key is
left in place (cheap, no harm) so a downgrade to v6/v7/v8 still
works.

---

## v8 — Plaza Polish: Bench Sit, Long-Press Wave, Gesture Emoji, A11y *(2026-05-08)*

Six small-but-visible upgrades to the 3D plaza, plus the missing v7 SQL migration.

### Networked-emote schema (catch-up from v7)
- New `migration-v8-emotes.sql` — adds the `emote` (text, nullable) and `emote_start_ms` (bigint, default 0) columns to `plaza_presence` that v7's API code already references but v7 never shipped a migration for. Idempotent. Includes a `CHECK` constraint mirroring `VALID_EMOTES` and a partial index for the (small) emoting subset.

### Sit emote: anchor to benches
- New `client/src/components/plaza/benches.ts` — single source of truth for bench positions (previously duplicated literal in `Environment3D.tsx`) and a `findNearestBench(x, z, radius)` helper. `Environment3D.tsx` now imports from it instead of redeclaring.
- `PlayerController.tsx` — when the active emote transitions to `sit`, the player snaps to the nearest bench within `BENCH_SNAP_RADIUS` (1.5m) and rotates to face the bench's facing direction. If no bench is in range, behaviour falls back to the v6 "sit in place".

### Avatar shadow during sit
- `Avatar3D.tsx` — the shadow disc was a child of the scaled avatar group, so it sank into the ground at sit emote (`bodyY = -0.35`) and floated visibly at cheer (`bodyY > 0`). The disc now counters the group's y each frame so it stays anchored to world y ≈ 0.01, with a subtle scale + opacity ramp tied to body height for a contact-patch feel.

### Reduced-motion / accessibility mode
- `Avatar3D.tsx` — new `usePrefersReducedMotion` hook reads `(prefers-reduced-motion: reduce)` via `matchMedia` (with Safari < 14 `addListener` fallback). When set, body bounce drops to ~50%, walk arm/leg amplitudes are halved, and idle sway is dampened. Emotes still play at full amplitude — they're an explicit user opt-in.

### Long-press joystick = wave
- `VirtualJoystick.tsx` — new optional `onLongPress` + `longPressMs` (default 500) props. A timer is armed on `pointerdown` and cleared if the knob moves past an 8px dead-zone. Once fired, the press is "consumed" so the user can't accidentally retrigger by dragging back to centre. Cleanup on unmount prevents orphaned timers.
- `Plaza.tsx` — wires `onLongPress` to write `{ name: 'wave', startMs: Date.now() }` into `emoteRef`. Since v7 broadcasts emotes, other players see the wave too.

### Player gestures broadcast (emoji popup)
- `OtherPlayers.tsx` — when a remote player has an active emote, a billboarded emoji bubble pops above their name tag using drei's `<Html>` (drei's `<Text>` can't render colour emoji because it uses Troika SDF). 200ms pop-in → hold → 400ms fade-out, with a subtle bob. Self-expires when the emote duration elapses; mirrors the EmoteBar's emoji table for visual consistency.

### Migration required
```sql
-- See migration-v8-emotes.sql for the full version with constraints/indexes.
ALTER TABLE plaza_presence ADD COLUMN IF NOT EXISTS emote TEXT;
ALTER TABLE plaza_presence ADD COLUMN IF NOT EXISTS emote_start_ms BIGINT NOT NULL DEFAULT 0;
```

---

## v7 — Networked Emotes, AI NPCs, Interior Tap-to-Walk *(2026-05-07)*

### Networked emotes
- Emotes now broadcast to all players in the same scene. Other players see your wave/dance/clap/bow/cheer/sit/point in real time.
- `lib/plaza.ts` — `updatePosition` now accepts `emote` and `emote_start_ms` fields; `PlazaPlayer` type carries them.
- `api/plaza.mjs` — `update-position` stores the validated emote in `plaza_presence`; 5-second TTL prevents stuck emotes on disconnected players; `get-players` returns both fields.
- `OtherPlayers.tsx` — `RemotePlayer` passes `emote` / `emoteStartMs` props down to `<Avatar3D>`.
- `Plaza.tsx` — the position broadcast now includes the live emote from `emoteRef`.

### AI-powered NPCs
- Five special NPCs (Ms. Chan / Librarian, Leo / Barista, Mia / Social Host, Uncle Raymond / Dating Advisor, Kai / Study Buddy) now respond via Claude.
- `api/npc-chat.mjs` (new) — POST endpoint; validates + rate-limits (10 req/user/hour); routes to personality-specific system prompts; uses `claude-haiku-4-5-20251001` for low latency.
- `NPCs.tsx` — added `aiNpcId` field to `NPCData`; AI NPCs rendered with purple nameplate + 💬 badge; clicking opens an inline bilingual chat panel with full conversation history (client-side only, resets on reload).

### Tap-to-walk in interiors
- `InteriorScene.tsx` — accepts `onSetWaypoint` prop and mounts `<TapToWalk>` clamped to interior bounds. Same double-tap touch / single-click mouse behaviour as the outdoor plaza.
- `SceneRouter.tsx` — forwards `onSetWaypoint` to `InteriorScene`.

### Cleanup
- Removed `Avatar3D.diff` and `PlayerController.diff` from repo root (authoritative code lives in `client/src/components/plaza/`).
- Consolidated `CHANGES.md`, `CHANGES_v4_npcs.md`, `CHANGES_v5_interiors_drop1.md`, `CHANGES_v5_interiors_fixes.md`, `CHANGES_v6_daynight_emotes.md` into this single `CHANGELOG.md`.

### DB migration required
Add `emote` (text, nullable) and `emote_start_ms` (bigint, default 0) columns to `plaza_presence`:

```sql
ALTER TABLE plaza_presence ADD COLUMN IF NOT EXISTS emote text;
ALTER TABLE plaza_presence ADD COLUMN IF NOT EXISTS emote_start_ms bigint NOT NULL DEFAULT 0;
```

### New env var required
```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## v6 — Day/Night Cycle, Emotes, Mobile Polish

Six client-side upgrades to the 3D Plaza. No DB migration, no new dependencies, no env-var changes.

- Real Hong Kong day/night cycle (`DayNightCycle.tsx`) — sun/moon arc, star field, city-glow horizon.
- Emote bar (`EmoteBar.tsx`) — wave, dance, clap, bow, cheer, sit, point; local-only in v6 (networked in v7).
- Ambient sound system (`AmbientSound.tsx`) — zone-reactive procedural audio.
- Journey log (`JourneyLog.tsx`) — records zone visits with timestamps.
- Mobile joystick polish (`VirtualJoystick.tsx`).
- Scene transition animations (`SceneTransition.tsx`).

---

## v5 — Interiors System Drop 1

Infrastructure for walk-in interior scenes (Library, Café, Social, Dating Corner).

- `SceneRouter.tsx`, `InteriorScene.tsx`, `EntryTrigger.tsx` — scene-switching pipeline.
- `SceneContext.tsx` — global scene state.
- `lib/scenes.ts` — scene registry (bounds, theme colours, spawn points).
- `migration-v7-interiors.sql` — `scene` column on `plaza_presence`.
- Entry portals in `Environment3D.tsx` for all four interiors.
- Zone-entry toasts and scene-transition overlays.
- v5 fixes: 3D plaza audio restored; Dating page latency (instant-message optimistic UI).

---

## v4 — NPC Scale-up

- ~30 procedurally generated NPCs (seeded RNG, stable across reloads).
- Behaviour types: static, path-walker, wanderer with collision avoidance.
- Bilingual zone-aware chat bubbles.
- NPC count integrated into online-player HUD display.

---

## v3 — HUD Polish, Waypoints, Feedback

- Zone approach affordance (pulsing glow ring + bilingual enter prompt).
- Mini-map overhaul: player arrow, click-to-set-waypoint, dashed route line.
- Waypoint auto-walk in `PlayerController.tsx` (straight-line + collision).
- Name-tag glass pill with shirt-colour accent strip and speaker dot.
- Zone-transition radial colour wash.
- Movement-log pill auto-collapse.
- FPS / frame-time meter (Shift+F).

---

## v2 — Walk Cycle & Collision

- Avatar limb walk-cycle animation.
- Collision resolver (`colliders.ts`) — buildings, trees, fountain.
- Instanced geometry for trees / lamp posts.

---

## v1 — Initial 3D Plaza

- Basic Three.js / React Three Fiber plaza scene.
- Avatar customiser.
- Multiplayer presence via `plaza_presence` table.
- Chat bubbles.
- Zone detection.

---

## Pre-plaza (v0) — Login / Social / Dating / Navigation

- Login / Signup with .edu.hk verification.
- Social platform feed (posts, reactions, images).
- Dating page (profile cards, matching, chat).
- Navigation, campus tools, landing page.
