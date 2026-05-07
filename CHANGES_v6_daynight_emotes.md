# CHANGES — v6: day/night cycle, emotes, mobile polish

Six upgrades to the 3D Plaza, all client-side. No DB migration, no
new dependencies, no env-var changes. Drop the files in and redeploy.

## What's in this drop

| File | Status | Purpose |
|---|---|---|
| `client/src/components/plaza/DayNightCycle.tsx` | **new** | Animated sun, sky, fog, stars |
| `client/src/components/plaza/EmoteBar.tsx` | **new** | UI for triggering avatar emotes |
| `client/src/components/plaza/TapToWalk.tsx` | **new** | Click / double-tap ground to walk |
| `client/src/components/plaza/PlazaLoader.tsx` | **new** | Polished Suspense fallback |
| `client/src/components/plaza/Avatar3D.tsx` | modified | Emote animation system |
| `client/src/components/plaza/PlayerController.tsx` | modified | Wires emote + camera-zoom refs |
| `client/src/components/plaza/Environment3D.tsx` | modified | Removes static sky (now in DayNightCycle) |
| `client/src/components/plaza/SceneRouter.tsx` | modified | Forwards `onSetWaypoint` |
| `client/src/components/plaza/scenes/PlazaScene.tsx` | modified | Mounts `<TapToWalk>` |
| `client/src/pages/Plaza.tsx` | modified | New refs, EmoteBar, pinch zoom, day/night toggle |
| `client/src/App.tsx` | modified | Uses `<PlazaLoader>` as Suspense fallback |

## 1. Day / Night Cycle  🌅🌃

**What.** The sun, sky, ambient and fog now animate through 8 keyframes
across a 24-hour cycle (deep night → pre-dawn → sunrise → morning →
midday → late afternoon → sunset → night). A procedural starfield
appears at night with animated opacity. All transitions are smoothly
interpolated.

**Where.** `DayNightCycle.tsx` is dropped *inside* the `<Canvas>` and
*replaces* the previous static `<ambientLight>` + 2× `<directionalLight>`
+ `<hemisphereLight>` + `<fog>` block in `Plaza.tsx`. It also owns the
sky dome (so the dome was removed from `Environment3D.tsx`).

**Three modes** (cycled via the new HUD button next to the theme
toggle, persisted to `localStorage`):

| Mode | Icon | Behaviour |
|---|---|---|
| `real-hk` | 🕒 Clock | Sun follows real Hong Kong time (UTC+8) |
| `accelerated` | ⏩ FastForward | Full 24h cycle every 8 minutes (great for demos) |
| `fixed` | 🌅 Sunrise | Pinned to noon (the original "always golden hour" feel) |

**Tuning.** Each phase has its own keyframe with `sunIntensity`,
`sunColor`, `ambientIntensity`, hemisphere colours, fog colour + range,
3-band sky shader colours, and sun azimuth/elevation. To re-tune the
mood of a phase, edit the `KEYFRAMES` array in `DayNightCycle.tsx`.

**Performance.** Same number of lights and same shadow setup as before.
The sky shader is the same one shipped previously, just with animated
uniforms instead of constant ones. Stars are 600 points in a single
draw call. Net cost vs. v5: ~0.

**Autopause.** When the sun is below the horizon (`elevation <= 0`),
`castShadow` is automatically disabled — you save the shadow-pass cost
during the entire night phase, plus avoid bias artefacts from
upside-down shadow projection.

## 2. Avatar Emotes  👋

**What.** Players can now play 7 short scripted animations on their
avatar — wave, cheer, dance, clap, bow, point, sit. Each runs for
1.8–4 seconds, with smooth ease-in / ease-out, then returns to idle
or walk.

**Where.** `Avatar3D.tsx` gained an `emote` and `emoteStartMs` prop.
The walk-cycle is unchanged when no emote is active; when an emote is
active, the limb / body targets come from the emote definition
instead of the walk sine wave.

**UI.** `EmoteBar.tsx` adds a smile-icon button bottom-right (above
the joystick on mobile, below the minimap on desktop). Tapping it
opens a horizontal strip of emoji pills. Tap a pill → emote plays.
The active pill shows a circular progress sweep so it's clear when
the emote ends.

**Cancel rules.**
- Movement (any keyboard / joystick input) immediately cancels the
  current emote — player intent always wins.
- Tapping the same emote during playback is ignored (avoids jitter).
- Tapping a different emote during playback restarts the timer with
  the new emote.

**Adding more emotes.** Drop another entry into the `EMOTES` map at
the top of `Avatar3D.tsx`. The pose function gets `progress` (0..1)
and `elapsedSec` and returns the target rotations. That's the whole
contract.

**Networked emotes** are deferred — see follow-up todo #1. Right now
emotes are local-only. Other players' avatars don't see your wave
yet.

## 3. Tap / Click to Walk  📍

**What.** Single-click (desktop) or double-tap (touch) on the ground
sets a waypoint and the avatar auto-walks there. Same waypoint
plumbing the MiniMap already uses, so arrival, cancel, collider stall
detection all work for free.

**Why double-tap on touch?** A single tap on touch would constantly
fire when the user tries to interact with HUD elements that aren't
fully covering the canvas. Double-tap (within 320 ms, ≤24px apart)
is a deliberate gesture.

**Where.** `TapToWalk.tsx` is a transparent 100×100 plane at y=0.02,
mounted in `PlazaScene.tsx`. Sits cleanly above the existing ground
(at y=-0.05) so it captures clicks without z-fighting. Buildings,
NPCs, and other meshes win raycast hits when the click is on top of
them, because R3F sorts by distance.

**Wired through.** `Plaza.tsx` → `<SceneRouter onSetWaypoint=…>` →
`<PlazaScene onSetWaypoint=…>` → `<TapToWalk onSetWaypoint=…>`.
Internal interiors (`InteriorScene`) don't get the catcher yet —
follow-up todo #4.

## 4. Pinch / Wheel Zoom  🔍

**What.** Two-finger pinch (touch) or scroll-wheel (desktop) adjusts
the third-person camera distance.

**Where.** `Plaza.tsx` has a new `useEffect` that listens on
`window.pointer*` and `window.wheel`. When two touch pointers are
active, it compares the distance between them frame-to-frame and
scales `cameraZoomRef.current` (clamped to `[0.55, 2.4]`).
`PlayerController.tsx` reads this ref every frame and multiplies the
camera offset (default `(0, 14, 14)`) by it.

**Limits.** 0.55 = ~25% closer than default (almost over-shoulder).
2.4 = ~140% farther (wide tactical view). Adjust the `ZOOM_MIN` /
`ZOOM_MAX` constants in `Plaza.tsx` to taste.

**Edge cases.**
- Wheel events on `<input>` / `<textarea>` are ignored, so scrolling
  the chat history doesn't zoom the camera.
- Pinch state is per-pointer-id, so a third finger landing during a
  pinch doesn't break the gesture.

## 5. Polished Plaza Loader  ⏳

**What.** The bare `Loading 3D Plaza...` text in the Suspense
fallback is replaced by a full-screen loader styled to match the
plaza HUD: animated dot spinner, gradient backdrop, rotating tip
pill (5 tips, rotating every 4 s), bilingual.

**Where.** `PlazaLoader.tsx` is a self-contained component.
`App.tsx` uses it as the `<Suspense fallback>` on the `/plaza`
route. No props required (it auto-renders Chinese, but you can pass
`lang="en"` if you wire it up).

**Why it matters.** Plaza chunk + Three.js is ~600 KB gzipped. On
a mid-tier mobile network, that's 1.5–3 seconds of staring at a
blank screen. The new loader makes it feel intentional.

## 6. Inline-friendly Controls Hint  💡

**What.** The first-time controls hint at the top of the plaza now
shows different text on desktop vs. mobile (the previous version
was desktop-only — mobile players didn't see anything):

- Desktop: "WASD to move · Click ground to walk · Scroll to zoom"
- Mobile:  "Joystick to move · Double-tap to walk · Pinch to zoom"

Auto-hides after 6 s, same as before.

---

## Verification

- `Avatar3D` walk cycle: untouched when `emote` prop is null/absent —
  the new emote check is a no-op fast path. Existing v5 multiplayer
  avatars (rendered via `OtherPlayers.tsx`) call `<Avatar3D>` without
  the new props, so they still walk normally.
- `Environment3D`: only the sky dome was removed. Ground, trees,
  bushes, clouds, zone markers, NPCs — all unchanged.
- `PlayerController`: new props are all optional. Old call sites
  that don't pass `emoteRef`/`cameraZoomRef` still compile and run
  with default behaviour (no emote, zoom = 1).
- `SceneRouter`: `onSetWaypoint` is optional. Internal calls from
  `currentScene === 'plaza'` pass it through; the interior branch
  doesn't need it.

## Deployment

```bash
cd unigo-hk
# Drop in the files (preserves directory layout)
unzip -o ~/Downloads/unigo-hk-v6-daynight-emotes.zip
git add -A
git commit -m "v6: day/night cycle + emotes + tap-to-walk + pinch zoom"
git push
```

Vercel rebuilds, you're done. No env vars, no DB migration, no asset
uploads. localStorage key `plaza:dayNightMode` is created on first
load, defaulting to `real-hk`.

## What you'll notice

**On desktop:** Open `/plaza`. Top-right has a new clock icon — tap
to cycle through real-time / accelerated / fixed modes. Scroll
wheel zooms. Click anywhere on the grass and the avatar walks
there. Tap the smile button next to the joystick area to bring up
emotes.

**On mobile:** Joystick still on the right. Above it now sits the
emote button — tap to expand. Pinch with two fingers to zoom.
Double-tap any patch of grass and the avatar walks over.

**At night** (real-hk mode, 21:00–05:00 HK time): the sky goes deep
navy, stars fade in, lights warm down, fog tightens. Shadows turn
off because the sun is below the horizon — you save GPU work and
the lighting stays physically plausible.

**On reload:** Your day/night mode preference persists. Other
preferences (theme, language) already persist via their existing
contexts.
