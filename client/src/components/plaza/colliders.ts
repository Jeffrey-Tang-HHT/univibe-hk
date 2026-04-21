// ─────────────────────────────────────────────────────────────
// Collider definitions for the plaza.
//
// These describe the *solid* footprint of objects in the scene so the
// player (and later, NPCs) can't walk through them. Shape-wise we use two
// primitives:
//
//   - CircleCollider: cheap radial test, used for most round-ish props
//     (fountain, ponds, trees, bushes, rocks, lamp posts, zone landmarks).
//   - BoxCollider: axis-aligned rectangle, used for the long edge buildings
//     that would be badly approximated by a single circle. Rotation isn't
//     needed here because every building sits square to the world axes.
//
// Radii / half-extents are tuned to the visible mesh footprint PLUS a small
// `PLAYER_RADIUS` so collision feels like "bumping against the edge" rather
// than "clipping into it". The PlayerController applies PLAYER_RADIUS at
// resolution time, so the values below should match the geometry itself.
// ─────────────────────────────────────────────────────────────

export const PLAYER_RADIUS = 0.35;

export interface CircleCollider {
  kind: 'circle';
  cx: number;
  cz: number;
  radius: number;
}

export interface BoxCollider {
  kind: 'box';
  cx: number;
  cz: number;
  hx: number; // half-extent on X
  hz: number; // half-extent on Z
}

export type Collider = CircleCollider | BoxCollider;

// ─── Edge buildings (from Environment3D.tsx Building calls) ───
// scale = [x, y, z]; we only care about x/z for ground collision.
const BUILDINGS: BoxCollider[] = [
  { kind: 'box', cx: -35, cz: 0,   hx: 2.0, hz: 7.5 },  // Library 4×6×15
  { kind: 'box', cx:  35, cz: 0,   hx: 2.0, hz: 6.0 },  // Student Union 4×6×12
  { kind: 'box', cx:   0, cz: -35, hx: 10.0, hz: 1.5 }, // Main Building 20×8×3
  { kind: 'box', cx:   0, cz:  38, hx: 7.5,  hz: 1.5 }, // Canteen 15×5×3
];

// ─── Zone landmarks — each occupies ~5-6m radius around its anchor ───
// Pergola / Stage / Arch / Cafe are all "walk-up-to" structures, so we pick
// a radius that blocks the base but lets the player get close to the edge.
const LANDMARKS: CircleCollider[] = [
  { kind: 'circle', cx: -18, cz: -15, radius: 3.8 }, // Study pergola
  { kind: 'circle', cx:  18, cz: -15, radius: 4.2 }, // Social stage
  { kind: 'circle', cx: -18, cz:  18, radius: 3.2 }, // Dating arch
  { kind: 'circle', cx:  18, cz:  18, radius: 3.5 }, // Cafe kiosk
];

// ─── Central fountain ───
// Outer basin rim is radius 3.4; we block at 3.4 so you can circle it.
const FOUNTAIN: CircleCollider[] = [
  { kind: 'circle', cx: 0, cz: 0, radius: 3.4 },
];

// ─── Ponds ───
const PONDS: CircleCollider[] = [
  { kind: 'circle', cx: -26, cz: 3, radius: 2.5 },
  { kind: 'circle', cx:  26, cz: 3, radius: 2.2 },
];

// ─── Trees (positions kept in sync with TREE_POSITIONS in Environment3D.tsx) ───
// Trunks are narrow — 0.6 radius is enough to feel solid without being sticky.
const TREE_XZ: [number, number][] = [
  [-8, -8], [8, -8], [-8, 8], [8, 8],
  [-15, 5], [15, 5], [-15, -5], [15, -5],
  [-25, -25], [25, -25], [-25, 25], [25, 25],
  [-30, 0], [30, 0], [0, -28], [0, 30],
  [-12, 20], [12, -20], [-22, 12], [22, -12],
];
const TREES: CircleCollider[] = TREE_XZ.map(([x, z]) => ({
  kind: 'circle', cx: x, cz: z, radius: 0.6,
}));

// ─── Lamp posts (LAMP_POSITIONS in Environment3D.tsx) ───
// Slim poles; tight collider so they don't feel like bollards.
const LAMP_XZ: [number, number][] = [
  [-10, 0], [10, 0], [0, -10], [0, 10],
  [-20, -20], [20, -20], [-20, 20], [20, 20],
];
const LAMPS: CircleCollider[] = LAMP_XZ.map(([x, z]) => ({
  kind: 'circle', cx: x, cz: z, radius: 0.25,
}));

// ─── Benches (BENCH_POSITIONS in Environment3D.tsx, first 3 coords only) ───
// Benches are rotated boxes in the scene, but a circle around each is a
// reasonable compromise — it's one collider per bench vs. four corners.
const BENCH_XZ: [number, number][] = [
  [-5, -5], [5, -5], [-5, 5], [5, 5],
  [-20, -18], [20, -18], [-20, 20], [20, 20],
];
const BENCHES: CircleCollider[] = BENCH_XZ.map(([x, z]) => ({
  kind: 'circle', cx: x, cz: z, radius: 0.9,
}));

// ─── Rocks (ROCK_POSITIONS in Environment3D.tsx) ───
// Radius scales with the per-rock scale factor; base rock is ~0.6m.
const ROCK_DATA: Array<{ x: number; z: number; scale: number }> = [
  { x: -14, z: 6,   scale: 1.0 }, { x: 14,  z: -6,  scale: 0.8 },
  { x: -6,  z: 14,  scale: 1.3 }, { x: 6,   z: -14, scale: 0.9 },
  { x: -28, z: -8,  scale: 1.1 }, { x: 28,  z: 8,   scale: 1.0 },
  { x: -30, z: 15,  scale: 0.7 }, { x: 30,  z: -18, scale: 1.2 },
  { x: -10, z: -24, scale: 0.9 }, { x: 10,  z: 24,  scale: 1.1 },
  { x: -24, z: 28,  scale: 0.8 }, { x: 24,  z: -28, scale: 1.0 },
];
const ROCKS: CircleCollider[] = ROCK_DATA.map(({ x, z, scale }) => ({
  kind: 'circle', cx: x, cz: z, radius: 0.6 * scale,
}));

// ─── Bushes (BUSH_POSITIONS in Environment3D.tsx) ───
const BUSH_XZ: [number, number][] = [
  [-12, 2], [12, -2], [-7, 10], [7, -10],
  [-22, -5], [22, 5], [-14, -22], [14, 22],
  [-28, 18], [28, -18], [-3, 18], [3, -18],
];
const BUSHES: CircleCollider[] = BUSH_XZ.map(([x, z]) => ({
  kind: 'circle', cx: x, cz: z, radius: 0.7,
}));

// Note: grass tufts and flower patches are *not* blocked — the player should
// walk over them like ground cover. Clouds obviously don't count either.

export const COLLIDERS: Collider[] = [
  ...BUILDINGS,
  ...LANDMARKS,
  ...FOUNTAIN,
  ...PONDS,
  ...TREES,
  ...LAMPS,
  ...BENCHES,
  ...ROCKS,
  ...BUSHES,
];

// ─────────────────────────────────────────────────────────────
// Collision resolution.
//
// Given an intended next position (nx, nz), this pushes the point out of any
// collider it's intersecting and returns the corrected (x, z). We do a
// simple iterative pass — two iterations is enough because our colliders
// don't overlap pathologically. The player is modelled as a circle with
// radius PLAYER_RADIUS.
//
// For box colliders we find the closest point on the box to the player, then
// treat that as a circle-vs-point test. This is the standard AABB-vs-circle
// trick and handles both face and corner collisions cleanly.
// ─────────────────────────────────────────────────────────────
export function resolveCollision(nx: number, nz: number): { x: number; z: number } {
  let x = nx;
  let z = nz;

  for (let iter = 0; iter < 2; iter++) {
    let moved = false;

    for (const c of COLLIDERS) {
      if (c.kind === 'circle') {
        const dx = x - c.cx;
        const dz = z - c.cz;
        const minDist = c.radius + PLAYER_RADIUS;
        const distSq = dx * dx + dz * dz;
        if (distSq < minDist * minDist && distSq > 1e-6) {
          const dist = Math.sqrt(distSq);
          const push = (minDist - dist) / dist;
          x += dx * push;
          z += dz * push;
          moved = true;
        } else if (distSq <= 1e-6) {
          // Exactly at centre — nudge out along +x to break the tie.
          x = c.cx + minDist;
          moved = true;
        }
      } else {
        // Closest point on the AABB to the player.
        const closestX = Math.max(c.cx - c.hx, Math.min(x, c.cx + c.hx));
        const closestZ = Math.max(c.cz - c.hz, Math.min(z, c.cz + c.hz));
        const dx = x - closestX;
        const dz = z - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq < PLAYER_RADIUS * PLAYER_RADIUS) {
          if (distSq > 1e-6) {
            const dist = Math.sqrt(distSq);
            const push = (PLAYER_RADIUS - dist) / dist;
            x += dx * push;
            z += dz * push;
          } else {
            // Player centre is inside the box — push out along the shallowest axis.
            const leftPen   = (x - (c.cx - c.hx)) + PLAYER_RADIUS;
            const rightPen  = ((c.cx + c.hx) - x) + PLAYER_RADIUS;
            const topPen    = (z - (c.cz - c.hz)) + PLAYER_RADIUS;
            const bottomPen = ((c.cz + c.hz) - z) + PLAYER_RADIUS;
            const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);
            if (minPen === leftPen)        x = c.cx - c.hx - PLAYER_RADIUS;
            else if (minPen === rightPen)  x = c.cx + c.hx + PLAYER_RADIUS;
            else if (minPen === topPen)    z = c.cz - c.hz - PLAYER_RADIUS;
            else                           z = c.cz + c.hz + PLAYER_RADIUS;
          }
          moved = true;
        }
      }
    }

    if (!moved) break;
  }

  return { x, z };
}
