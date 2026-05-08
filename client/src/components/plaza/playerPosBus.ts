/**
 * playerPosBus.ts — tiny module-level singleton holding the live player
 * world-space position. Components that need cheap distance culling
 * (NPCs, OtherPlayers, future bird flocks etc.) read from it inside
 * useFrame without paying for a React subscription.
 *
 * Why not a Context? Context updates trigger re-renders, and the
 * player position changes every frame. We don't want every
 * subscriber re-rendering 60×/sec — they only need to *read* the
 * value once per frame from inside their own useFrame loop.
 *
 * Why not props? Same reason, plus it would force every parent in
 * the chain to subscribe to position state.
 *
 * Writer: PlayerController (every frame, after movement resolved).
 * Readers: NPCs, OtherPlayers, anything else that wants to skip
 * rendering when far away.
 *
 * Default position is (0, 5) — the spawn point — so first-frame
 * culling decisions before PlayerController has run aren't wildly
 * wrong.
 */

interface PlayerPosState {
  x: number;
  z: number;
}

const _pos: PlayerPosState = { x: 0, z: 5 };

export function setPlayerPos(x: number, z: number): void {
  _pos.x = x;
  _pos.z = z;
}

export function getPlayerPos(): Readonly<PlayerPosState> {
  return _pos;
}

/**
 * Squared-distance from the player to (x, z). Squared because
 * distance comparisons don't need the sqrt, and this is hot.
 */
export function distSqFromPlayer(x: number, z: number): number {
  const dx = x - _pos.x;
  const dz = z - _pos.z;
  return dx * dx + dz * dz;
}

/**
 * Render-distance presets. NPCs and remote players don't need
 * the same fade-out distance as decorative scenery — pick the
 * one that matches the cost of the thing being culled.
 */
export const CULL_DIST = {
  /** ~40m. Avatars stop rendering past this. Each one is 4-6 draws + a
   *  Billboard nameplate, so the savings add up on busy plazas. */
  AVATAR: 40,
  /** ~30m. Trees swap to billboard sprite past this (LOD), not fully hidden. */
  TREE_LOD: 30,
  /** ~25m. Decorative ambient creatures (birds, butterflies) — cheap
   *  individually but there are many; cull tighter. */
  AMBIENT: 25,
} as const;
