// ─────────────────────────────────────────────────────────────
// benches.ts — shared bench-position table.
//
// Lives outside Environment3D so PlayerController can read the
// same data without pulling in the whole 1.5kloc environment file.
// Tuple format matches Environment3D's <Bench> usage:
//   [worldX, worldY, worldZ, rotationY?]
// rotationY is the bench's facing in radians (forward is +Z by default).
// ─────────────────────────────────────────────────────────────

export type BenchEntry = [number, number, number, number?];

export const BENCH_POSITIONS: BenchEntry[] = [
  // Central plaza — four cardinals, slightly toed-in toward the fountain.
  [-5, 0, -5,  0.3],
  [ 5, 0, -5, -0.3],
  [-5, 0,  5, -0.3],
  [ 5, 0,  5,  0.3],
  // Outer zone benches — angled toward the centre of each zone.
  [-20, 0, -18,  Math.PI / 4],
  [ 20, 0, -18, -Math.PI / 4],
  [-20, 0,  20, -Math.PI / 4],
  [ 20, 0,  20,  Math.PI / 4],
];

/** Maximum distance (world units) at which a sit emote will snap. */
export const BENCH_SNAP_RADIUS = 1.5;

/**
 * Find the bench nearest to (x, z) within `BENCH_SNAP_RADIUS`.
 * Returns the bench entry plus the seat-centre coordinate the
 * caller should place the avatar at, or `null` if nothing is in range.
 *
 * The seat centre is offset slightly forward from the bench origin
 * (which sits at the bench's centre, between seat and back) so the
 * avatar reads as resting on the seat rather than embedded in the back.
 */
export function findNearestBench(
  x: number,
  z: number,
  radius: number = BENCH_SNAP_RADIUS,
): { x: number; z: number; rotation: number } | null {
  let best: { x: number; z: number; rotation: number; d: number } | null = null;
  for (const b of BENCH_POSITIONS) {
    const [bx, , bz, rot = 0] = b;
    const dx = x - bx;
    const dz = z - bz;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > radius) continue;
    // Seat is offset ~0.05 forward (+local Z) from the bench origin so
    // the avatar's centre sits on the cushion, not against the back rest.
    // We rotate the offset by the bench's facing.
    const seatLocalZ = 0.05;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const seatX = bx + sin * seatLocalZ;
    const seatZ = bz + cos * seatLocalZ;
    if (!best || d < best.d) {
      best = { x: seatX, z: seatZ, rotation: rot, d };
    }
  }
  return best ? { x: best.x, z: best.z, rotation: best.rotation } : null;
}
