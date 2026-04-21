# Plaza upgrade v2 — walk animation + collision

This drop adds two things that were missing from the plaza:

1. **Character walk cycle** — arms and legs now swing in proper contralateral
   gait while the player is moving. They ease back to neutral when you stop.
2. **Collision detection** — the player can no longer walk through buildings,
   the fountain, ponds, trees, lamp posts, benches, bushes, rocks, or zone
   landmarks. Obstacles bump the player out along the collision normal so
   you can slide along walls instead of sticking.

## Files in this zip

```
client/src/components/plaza/Avatar3D.tsx          (modified)
client/src/components/plaza/PlayerController.tsx  (modified)
client/src/components/plaza/colliders.ts          (new)
Avatar3D.diff                                     (unified diff)
PlayerController.diff                             (unified diff)
CHANGES.md                                        (this file)
```

To apply, unzip at your repo root (same folder that contains `client/`):

```bash
unzip -o ~/Downloads/unigo-plaza-upgrade-v2.zip
```

No new dependencies. No changes to `package.json`.

## 1. Walk cycle (Avatar3D.tsx)

### What changed

Before: arms, hands, legs, and shoes were individual meshes at fixed
positions. The only animation was a full-body vertical bounce + subtle
Z-roll when `isMoving` was true — so the character looked like it was
gliding.

After: each arm and each leg lives inside its own `<group>` pivoted at the
shoulder (y=1.2) / hip (y=0.7). Hands are parented *into* the arm group so
they swing with the forearm. Shoes are parented into the leg group. A
`useFrame` callback drives `rotation.x` on each group with a sine wave:

- Arms: ±0.55 rad, opposite L/R phase
- Legs: ±0.75 rad, opposite L/R phase
- Arms counter-phased vs. legs (standard contralateral gait: left arm
  forward pairs with right leg forward)
- Step frequency: 2.2 Hz, matching a natural walking cadence

### Tuning knobs

Top of the file, three constants:

```ts
const STEP_HZ = 2.2;      // steps/sec
const ARM_SWING = 0.55;   // ± radians at peak
const LEG_SWING = 0.75;   // ± radians at peak
const IDLE_DAMP = 6;      // how fast limbs return to neutral
```

If you later add a run state, multiply both swing amps by ~1.4 and bump
STEP_HZ to ~3.2 for a run cycle — no geometry changes needed.

### Behavior details

- The walk phase accumulator only advances while `isMoving` is true. When
  you stop, limbs ease back to rotation=0 over ~150ms via the `IDLE_DAMP`
  lerp. This is why stopping feels natural instead of freeze-framed.
- The original full-body bounce and Z-sway are preserved, so the torso
  still rocks subtly while walking.

## 2. Collision detection (colliders.ts + PlayerController.tsx)

### The new module

`colliders.ts` is a single source of truth for everything the player
shouldn't walk through. Two primitive types:

- **CircleCollider**: cheap radial test. Used for fountain, ponds, trees,
  bushes, rocks, lamp posts, benches, and the four zone landmarks.
- **BoxCollider**: AABB (axis-aligned bounding box). Used for the four
  edge buildings (Library, Student Union, Main Building, Canteen), because
  they're long and thin and a single circle would either let you clip the
  corners or block half the sidewalk.

Positions are lifted directly from `Environment3D.tsx`'s `TREE_POSITIONS`,
`BENCH_POSITIONS`, etc. — if you move a prop in the environment, update
the matching entry in `colliders.ts` and it'll just work.

Total collider count: 4 buildings + 4 landmarks + 1 fountain + 2 ponds +
20 trees + 8 lamps + 8 benches + 12 rocks + 12 bushes = **71 colliders**.
That's well under the cost of a single draw call per frame.

### The resolution algorithm

`resolveCollision(nx, nz)` takes the *intended* next position and returns
a corrected position. For each collider:

- **Circle vs. circle**: if `dist < radius + PLAYER_RADIUS`, push along
  the centre-to-centre normal.
- **AABB vs. circle**: find the closest point on the box to the player,
  then do a circle-vs-point test. If the player is somehow inside the box
  (shouldn't happen, but belt-and-braces), push along the shallowest axis.

Two iterations, because corners can produce a push that clips into a
neighbour. Two is enough for this scene; I verified by hand that no
colliders overlap pathologically.

The player's own collision radius is `PLAYER_RADIUS = 0.35` — small enough
to fit between trees, big enough that corner-clipping looks natural.

### PlayerController changes

Three things changed in the controller:

1. **Collision pass** — after computing `desiredX`/`desiredZ` from
   velocity, call `resolveCollision()` before writing to
   `groupRef.current.position`. Applied to both the active-input and
   coasting branches, so friction can't slide you into a wall.

2. **Real `isMoving` for Avatar3D** — the old code passed
   `isMoving={keysRef.current.size > 0}`, which meant (a) joystick-only
   input never triggered animation, and (b) coast-to-stop looked like
   instant freeze. Now `isMoving` is React state driven by
   `inputActive || velocityRef.current.length() > 0.1`, set only on
   threshold crossings to avoid per-frame React re-renders.

3. **Position-update callback** now receives the same `effectivelyMoving`
   signal as the avatar, so the journey log and other-player broadcasts
   stay consistent with what the character is actually doing.

### What's NOT collided

Grass tufts, flower patches, and clouds are intentionally walkable —
they're decoration, not obstacles. NPCs and other players are also not
colliders (they move), but if you want bump-collision with them later,
build a second collider list per frame from `NPCs.tsx` / `OtherPlayers.tsx`
positions and call `resolveCollision` against both lists.

## Known limitations / possible follow-ups

- Collider radii are hand-tuned. If the fountain footprint changes or you
  move the zone landmarks, `colliders.ts` needs to be updated by hand.
  A future pass could have `Environment3D` itself export colliders.
- The landmark radii (3.2–4.2m) block the *whole* footprint. If you later
  want interactive seating at the pergola or the café counter, carve out
  a narrower collider and have the landmark export its own collider list.
- No vertical collision — the plaza is flat, so 2D is enough.
- I couldn't run `tsc` or a dev-server build (no `node_modules`, network
  disabled), so this is hand-verified. Braces/parens balance; imports
  resolve to real paths; no remaining references to removed symbols.
  If the build surfaces anything, paste the error and I'll fix it.
