# UniGo HK — v6.1 Patch: Night Mode Fix

**One-file patch on top of v6.** Replaces `DayNightCycle.tsx`. Nothing else changes.

## What was wrong

In v6, the night phase was rendering nearly-black:

- Avatars, buildings, and ground use `MeshToonMaterial` — toon shaders go to silhouette when ambient + sun intensity is too low. v6 night had ambient = 0.25 and sun = 0.05. That's basically "pitch dark scene with a flashlight off".
- The fog was set to `near=25, far=90` with a deep navy color — anything 25m+ from the camera disappeared into the fog.
- The sun dropped below the horizon at night (`elevation < 0`), which **also disabled shadows entirely**. So the few things still lit had no grounding shadow either.
- Meanwhile the zone-marker rings (around the fountain, dating corner etc.) use `MeshBasicMaterial` which doesn't respond to lighting at all — so they stayed full-bright cyan/coral against the black scene. The contrast made the whole thing look more broken.

## What changed

Just the `KEYFRAMES` array in `DayNightCycle.tsx`. Three night keyframes were re-tuned (00:00, 05:00, 21:00, plus the 24:00 wrap):

| Setting | v6 night | v6.1 night | Why |
|---|---|---|---|
| `sunIntensity` | 0.05–0.10 | **0.55** | Reframed as "moonlight" — keeps things visible |
| `sunColor` | `#3A4A78` (dark blue) | **`#A8BCDC`** (cool white-blue) | Moonlight is cool, not navy |
| `sunElevation` | -0.5 to -0.3 (below horizon) | **+0.4 to +0.65** (above horizon) | Moon stays in sky → casts shadows |
| `ambientIntensity` | 0.25–0.30 | **0.55** | Lifts toon material shadow side off black |
| `ambientColor` | `#3D4670` | **`#5C6E94`** | Less saturated, looks more "lit" |
| `hemiIntensity` | 0.35–0.40 | **0.65–0.70** | More sky/ground tint contribution |
| `fogNear / fogFar` | 25 / 90 | **38 / 115** | Pushed back so the world is visible |
| `fogColor` | `#1A2342` (deep navy) | **`#2D3A5C`** (lifted navy) | Less aggressive falloff into black |

**Net effect:** Night still feels like night — cool blue palette, stars visible, deep skybox — but the avatars, paths, buildings and trees are clearly visible. Moon is treated as a "second sun" that casts cool blue shadows instead of warm orange ones.

## Trade-offs

- **Shadows now cast at night too.** v6 disabled shadow rendering when the sun went below the horizon as a perf optimization. v6.1 keeps the moon above the horizon, so the shadow pass runs 24h. On mobile this costs a few FPS during what was previously a "free" period, but the visual payoff is worth it — moon shadows ground the scene.
- If perf becomes an issue, you can lower the night moon's `shadow-mapSize` separately (todo follow-up).

## Install

```bash
cd unigo-hk
unzip -o unigo-hk-v6.1-night-fix.zip
git add -A
git commit -m "v6.1: fix night mode — bumped ambient, moon-above-horizon for shadows"
git push
```

Then test by clicking the day/night toggle in the top-right HUD (the FastForward icon = accelerated 8-min cycle, or the Sunrise icon = fixed midday). With accelerated mode, you'll see the night phase within ~3 minutes.

## Verifying

What to look for after the patch:

- ✅ Avatars are clearly visible at night, with cool blue tint on the lit side and slightly darker tint on the shadow side
- ✅ Ground / paths / trees / buildings are all visible
- ✅ Fountain / zone-marker rings no longer pop unnaturally — they still glow but blend with the scene
- ✅ Stars visible against the dark sky
- ✅ Moon shadows under each avatar
- ✅ Smooth transition from sunset (warm) → night (cool)
