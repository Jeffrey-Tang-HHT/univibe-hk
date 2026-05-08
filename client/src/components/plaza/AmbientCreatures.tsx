import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Billboard } from '@react-three/drei';
import { distSqFromPlayer, CULL_DIST } from './playerPosBus';

/**
 * AmbientCreatures — birds and butterflies that fly around the plaza.
 *
 * Decorative only, no gameplay. Two flavours:
 *  - Birds: fly in slow circles at ~6m altitude. 4 of them.
 *  - Butterflies: meander between trees at ~1.2-1.8m. 6 of them.
 *
 * Both are 2-quad billboards (cross-card) with simple emoji-style colours
 * — kept intentionally cheap so this is a "free" ambience layer. No
 * shaders, no particles, no extra textures, no audio. The "alive world"
 * feel comes purely from the wing-flap animation (a sin curve scaling
 * the plane's X to fake flap) plus the path movement.
 *
 * Movement model:
 *  - Birds: fixed circular orbits with slight wobble; orbit radius is
 *    derived from a per-bird seed so they don't all loop in lockstep.
 *  - Butterflies: Lissajous-style path between two random anchor points,
 *    re-seeding every ~10s.
 *
 * Distance culling: hidden past `CULL_DIST.AMBIENT` (~25m). At 25m a
 * butterfly is sub-pixel anyway, and birds high overhead remain visible
 * out to the wider AVATAR cutoff via `bird.altitude > 4` exception so the
 * sky doesn't feel empty.
 */

interface BirdState {
  centerX: number;
  centerZ: number;
  altitude: number;
  radius: number;
  speed: number;
  phase: number;
}

interface ButterflyState {
  ax: number; az: number; bx: number; bz: number;
  freqX: number; freqZ: number;
  altitude: number;
  speed: number;
  phase: number;
  retargetAt: number;
}

// Seeded RNG for stable layouts (so birds don't relocate on every reload).
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BIRDS = 4;
const BUTTERFLIES = 6;

export default function AmbientCreatures() {
  const birdsState = useMemo<BirdState[]>(() => {
    const rand = mulberry32(0xb1d5);
    return Array.from({ length: BIRDS }, () => ({
      centerX: (rand() - 0.5) * 40,
      centerZ: (rand() - 0.5) * 40,
      altitude: 5.5 + rand() * 2,
      radius: 4 + rand() * 5,
      speed: 0.25 + rand() * 0.2,
      phase: rand() * Math.PI * 2,
    }));
  }, []);

  const butterfliesState = useMemo<ButterflyState[]>(() => {
    const rand = mulberry32(0xbf17);
    return Array.from({ length: BUTTERFLIES }, () => {
      const ax = (rand() - 0.5) * 30;
      const az = (rand() - 0.5) * 30;
      return {
        ax, az,
        bx: ax + (rand() - 0.5) * 8,
        bz: az + (rand() - 0.5) * 8,
        freqX: 0.4 + rand() * 0.6,
        freqZ: 0.5 + rand() * 0.6,
        altitude: 1.0 + rand() * 0.8,
        speed: 0.18 + rand() * 0.15,
        phase: rand() * Math.PI * 2,
        retargetAt: 6 + rand() * 8,
      };
    });
  }, []);

  // Refs for direct transform manipulation each frame.
  const birdGroups = useRef<Array<THREE.Group | null>>(Array(BIRDS).fill(null));
  const birdWingMeshes = useRef<Array<THREE.Mesh | null>>(Array(BIRDS).fill(null));
  const butterflyGroups = useRef<Array<THREE.Group | null>>(Array(BUTTERFLIES).fill(null));
  const butterflyWingMeshes = useRef<Array<THREE.Mesh | null>>(Array(BUTTERFLIES).fill(null));

  // Per-butterfly RNG used for retargeting — avoids growing Math.random
  // call sites that aren't deterministic.
  const butterflyRandRef = useRef(mulberry32(0xbf99));

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const cullR2 = CULL_DIST.AMBIENT * CULL_DIST.AMBIENT;

    // ── Birds ──
    for (let i = 0; i < BIRDS; i++) {
      const b = birdsState[i];
      const g = birdGroups.current[i];
      const w = birdWingMeshes.current[i];
      if (!g) continue;

      const angle = t * b.speed + b.phase;
      const x = b.centerX + Math.cos(angle) * b.radius;
      const z = b.centerZ + Math.sin(angle) * b.radius;
      const y = b.altitude + Math.sin(t * 0.7 + b.phase) * 0.2; // gentle vertical drift

      g.position.set(x, y, z);

      // Wing flap — sin curve, fast. We scale wing mesh X to fake the flap
      // because rotating the mesh would break the billboarding.
      if (w) {
        const flap = 0.55 + Math.abs(Math.sin(t * 12 + b.phase)) * 0.45;
        w.scale.x = flap;
      }

      // Birds are higher than other ambient creatures so we keep them
      // visible past the AMBIENT cutoff — sky should never feel empty.
      const d2 = distSqFromPlayer(x, z);
      const shouldShow = d2 <= (CULL_DIST.AVATAR * CULL_DIST.AVATAR);
      if (g.visible !== shouldShow) g.visible = shouldShow;
    }

    // ── Butterflies ──
    for (let i = 0; i < BUTTERFLIES; i++) {
      const b = butterfliesState[i];
      const g = butterflyGroups.current[i];
      const w = butterflyWingMeshes.current[i];
      if (!g) continue;

      // Retarget when the per-butterfly timer expires.
      if (t > b.retargetAt) {
        const r = butterflyRandRef.current;
        b.ax = b.bx;
        b.az = b.bz;
        b.bx = b.ax + (r() - 0.5) * 8;
        b.bz = b.az + (r() - 0.5) * 8;
        b.retargetAt = t + 6 + r() * 8;
      }

      // Lerp position along A→B with sin-modulated wobble so they don't
      // travel in a straight line between anchors.
      const u = (Math.sin(t * b.speed + b.phase) + 1) * 0.5; // 0..1
      const baseX = b.ax + (b.bx - b.ax) * u;
      const baseZ = b.az + (b.bz - b.az) * u;
      const wobble = 0.4;
      const x = baseX + Math.sin(t * b.freqX + b.phase) * wobble;
      const z = baseZ + Math.cos(t * b.freqZ + b.phase) * wobble;
      const y = b.altitude + Math.sin(t * 1.5 + b.phase) * 0.15;

      g.position.set(x, y, z);

      if (w) {
        // Faster flap than birds; butterflies feel jittery, not majestic.
        const flap = 0.35 + Math.abs(Math.sin(t * 18 + b.phase)) * 0.65;
        w.scale.x = flap;
      }

      const d2 = distSqFromPlayer(x, z);
      const shouldShow = d2 <= cullR2;
      if (g.visible !== shouldShow) g.visible = shouldShow;
    }
  });

  return (
    <group>
      {/* Birds — small dark silhouettes drawn as billboards. We wrap each
          Billboard in a plain <group> we can ref directly; the Billboard
          itself only handles screen-facing rotation, while the parent group
          owns position + per-frame visibility. Cleaner than typing through
          drei's ref forwarding. */}
      {birdsState.map((_, i) => (
        <group
          key={`bird-${i}`}
          ref={(g) => { birdGroups.current[i] = g; }}
        >
          <Billboard follow lockX={false} lockY={false} lockZ={false}>
            <mesh ref={(m) => { birdWingMeshes.current[i] = m; }}>
              <planeGeometry args={[0.5, 0.18]} />
              <meshBasicMaterial color="#2A2A33" transparent opacity={0.85} side={THREE.DoubleSide} />
            </mesh>
          </Billboard>
        </group>
      ))}

      {/* Butterflies — coloured pairs of small wing-quads. */}
      {butterfliesState.map((_, i) => {
        // Cycle through a small palette of butterfly-ish hues. Stable per slot.
        const palette = ['#FF8A80', '#FFD54F', '#80DEEA', '#CE93D8', '#A5D6A7', '#FF80AB'];
        const color = palette[i % palette.length];
        return (
          <group
            key={`btfly-${i}`}
            ref={(g) => { butterflyGroups.current[i] = g; }}
          >
            <Billboard follow lockX={false} lockY={false} lockZ={false}>
              <mesh ref={(m) => { butterflyWingMeshes.current[i] = m; }}>
                <planeGeometry args={[0.28, 0.16]} />
                <meshBasicMaterial color={color} transparent opacity={0.95} side={THREE.DoubleSide} />
              </mesh>
              {/* Tiny black body line for definition */}
              <mesh position={[0, 0, 0.001]}>
                <planeGeometry args={[0.02, 0.14]} />
                <meshBasicMaterial color="#1B1B1F" />
              </mesh>
            </Billboard>
          </group>
        );
      })}
    </group>
  );
}
