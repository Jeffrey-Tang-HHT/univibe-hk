# UniGo HK — Plaza (3D) upgrade

Two files changed, both in `client/src/`:

- `components/plaza/Environment3D.tsx`
- `pages/Plaza.tsx`

Drop-in replacements. No new dependencies (`@react-three/drei` at ^10.7.7 already exports `Instances` / `Instance`).

---

## Priority 1 — Fountain polish

The "teal cone" in your screenshot came from three things stacking up: tone-mapped emissive on the stacked water surfaces, a too-wide jet outward velocity, and opaque additive-less particles.

- Dropped `emissiveIntensity` on all three water-surface meshes: outer 0.12 → 0.04, middle 0.15 → 0.05, top 0.2 → 0.06. ACES tone mapping was blooming these into a single bright disc from overhead.
- Lowered their `opacity` slightly (0.78 → 0.7, 0.8 → 0.75, 0.8 → 0.75) so the water reads as translucent.
- Narrowed water-jet `outward` radius from 0.06 → 0.025 and initial spread 0.12 → 0.08 so the plume is a column, not a fan.
- Widened upward velocity variance (0.04 range → 0.07 range) so particles reach staggered heights instead of rising in a layered disc.
- Switched both `WaterJets` and `WaterCascade` `pointsMaterial` to `THREE.AdditiveBlending` with `depthWrite: false`. This is the change that makes spray actually look like spray — overlapping particles add brightness instead of stacking opaquely.
- Colors lightened to `#CFEEF9` (jets) and `#C8E8F4` (cascade) for the additive path.

## Priority 2 — Instancing

20 trees × 4 meshes + 12 bushes × 3 + 12 rocks × 2 + 28 grass tufts × 3 + 8 lamps × 2 was roughly 200 draw calls on static props alone. Now it's **~15** (one `Instances` group per distinct sub-mesh shape).

Five new components added next to their single-instance originals:

- `InstancedTrees` — trunks + 3 foliage layers → 4 draw calls for all 20 trees.
- `InstancedBushes` — 3 sphere lobes per bush → 3 draw calls for all 12.
- `InstancedRocks` — main boulder + offset pebble. The pebble offsets are pre-rotated per rock on the CPU so the scene looks identical to before.
- `InstancedGrassTufts` — 3 cone variants → 3 draw calls for all 28 tufts.
- `InstancedLamps` — pole + bulb instanced. `pointLight`s can't be instanced (each is a real scene light), so they're emitted per-lamp from the parent `Environment` component instead.

The original `Tree`, `Bush`, `Rock`, `GrassTuft`, `LampPost` functions are kept in the file as reference implementations — they're never called but they're useful for understanding what each instanced version is replicating. If you want, delete them; there's no harm either way.

## Priority 6 — Free polish bundled in

- **Per-instance hue variation** on trees and bushes. Each tree gets a stable `±8%` hue rotation + `±8%` lightness shift baked once per mount via `THREE.Color.offsetHSL`. Kills the "cloned trees" look at zero runtime cost — drei's `<Instance color={...}>` uses per-instance attribute data.
- **Adaptive shadow map** in `Plaza.tsx`. `shadow-mapSize` drops from 2048² to 1024² on mobile (via `IS_MOBILE` user-agent check at module load). Typical win is ~10 FPS on mid-range Android with no visible difference at phone pixel densities.
- `depthWrite: false` on the jet + cascade particle materials so they never mask themselves.

---

## What I did NOT do (leaving for separate commits)

These are the remaining items from my recommendation list that warrant their own commits rather than piling into this one:

- **Priority 3 — day/night cycle tied to HK time.** This needs animated `directionalLight` color/intensity, sky-shader uniform drives, fog tint, and ambient color — touches the `onCreated` hook and the sky mesh uniforms. The building windows and lamps are already emissive, so the night state is already halfway built; it just needs the ambient/sun to drop.
- **Priority 4 — clickable benches / NPCs / noticeboard.** Adds interaction pipeline to `Bench` and `NPCs.tsx`, and a new `Noticeboard` component reading from the feed store.
- **Priority 5 — ambient audio.** New `useZoneAudio` hook crossfading three WebAudio loops based on `currentZone`.

Happy to take any of these as the next commit — say which and I'll produce the patch.

---

## How to apply

```bash
cp Environment3D.tsx path/to/unigo-hk/client/src/components/plaza/Environment3D.tsx
cp Plaza.tsx        path/to/unigo-hk/client/src/pages/Plaza.tsx
```

Or review the diffs first:

```bash
cat Environment3D.diff   # 524 lines
cat Plaza.diff           # 35 lines
```

No package.json changes needed.
