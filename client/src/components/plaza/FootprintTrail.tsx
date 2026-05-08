import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getPlayerPos } from './playerPosBus';

/**
 * FootprintTrail — fading footprints/dust puffs left behind as the player walks.
 *
 * Why a ring buffer of instances rather than spawning meshes: each footprint
 * is the same flat dark disc; instancing one geometry / one material with N
 * matrices is one draw call regardless of count. We allocate `MAX_PRINTS`
 * up-front, mark them invisible (scale=0), and reuse slots round-robin as
 * the player walks. No allocation in the hot path → no GC stutter.
 *
 * Spawn rule: drop a print every `STEP_DIST` metres of player travel,
 * alternating left/right offset relative to facing so it reads as two
 * separate footprint trails rather than a single line of dots. Direction
 * is derived from the delta between the last two sampled positions
 * because the player's rotation is camera-driven and would point in odd
 * directions during strafe / waypoint movement.
 *
 * Lifecycle: each print carries a spawn timestamp. Per frame we compute
 * its age and fade scale + opacity. Past `LIFETIME_S` we hide it. The
 * material's opacity is a single uniform — we can't fade them
 * independently with a shared material — so each print uses its own
 * lightweight transparent mesh under one parent group. With MAX_PRINTS=24
 * that's still a manageable count.
 *
 * Could be ported to a single instanced mesh with per-instance attribute
 * for opacity (custom shader), but the savings aren't worth the
 * complexity for a 24-disc decoration. Revisit if MAX_PRINTS gets
 * cranked above ~64.
 */

const MAX_PRINTS = 24;
const STEP_DIST = 0.55; // metres between footprints
const LIFETIME_S = 5.0; // total fade duration
const FOOT_OFFSET = 0.18; // lateral offset from centre line (metres)

interface PrintState {
  x: number;
  z: number;
  rot: number; // y-rotation aligning the print with travel direction
  spawnedAt: number;
  side: 1 | -1;
}

export default function FootprintTrail() {
  // Print pool — allocated once. Slots with spawnedAt < 0 are unused.
  const prints = useRef<PrintState[]>(
    Array.from({ length: MAX_PRINTS }, () => ({
      x: 0,
      z: 0,
      rot: 0,
      spawnedAt: -1,
      side: 1,
    })),
  );
  const writeIdxRef = useRef(0);
  const lastSpawnPos = useRef<{ x: number; z: number } | null>(null);
  const lastSpawnSide = useRef<1 | -1>(1);

  // Refs to each print's mesh group — one per slot. Using individual refs
  // means we can mutate transform/opacity per print without React renders.
  const meshRefs = useRef<Array<THREE.Group | null>>(Array(MAX_PRINTS).fill(null));
  const matRefs = useRef<Array<THREE.MeshBasicMaterial | null>>(Array(MAX_PRINTS).fill(null));

  // Reused vector — spawn rate makes per-frame allocation visible in
  // memory profiles otherwise.
  const _scratch = useMemo(() => new THREE.Vector2(), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const pp = getPlayerPos();

    // ── Spawn check ──
    if (lastSpawnPos.current) {
      _scratch.set(pp.x - lastSpawnPos.current.x, pp.z - lastSpawnPos.current.z);
      const dist = _scratch.length();
      if (dist >= STEP_DIST) {
        // Direction of travel. Atan2 returns in radians; we want a y-rotation
        // for a flat disc on the XZ plane with its "long" axis along travel.
        const travelAngle = Math.atan2(_scratch.x, _scratch.y);
        // Lateral offset (perpendicular to travel) — alternates each step.
        const side: 1 | -1 = lastSpawnSide.current === 1 ? -1 : 1;
        const lx = Math.cos(travelAngle) * FOOT_OFFSET * side;
        const lz = -Math.sin(travelAngle) * FOOT_OFFSET * side;

        const slot = writeIdxRef.current;
        const print = prints.current[slot];
        print.x = pp.x + lx;
        print.z = pp.z + lz;
        print.rot = travelAngle;
        print.spawnedAt = t;
        print.side = side;

        writeIdxRef.current = (slot + 1) % MAX_PRINTS;
        lastSpawnSide.current = side;
        lastSpawnPos.current = { x: pp.x, z: pp.z };
      }
    } else {
      lastSpawnPos.current = { x: pp.x, z: pp.z };
    }

    // ── Update existing prints ──
    for (let i = 0; i < MAX_PRINTS; i++) {
      const print = prints.current[i];
      const m = meshRefs.current[i];
      const mat = matRefs.current[i];
      if (!m || !mat) continue;

      if (print.spawnedAt < 0) {
        if (m.visible) m.visible = false;
        continue;
      }

      const age = t - print.spawnedAt;
      if (age > LIFETIME_S) {
        // Retire — keep the slot allocated but mark as available.
        print.spawnedAt = -1;
        m.visible = false;
        continue;
      }

      // Fade curve: stays visible for the first 50%, then fades out.
      // Hold-then-fade reads as more print-like than a linear ramp.
      const lifeT = age / LIFETIME_S;
      const fade = lifeT < 0.5 ? 1.0 : 1.0 - (lifeT - 0.5) / 0.5;

      m.visible = true;
      m.position.x = print.x;
      m.position.z = print.z;
      m.rotation.y = print.rot;
      mat.opacity = fade * 0.45;
    }
  });

  return (
    <group>
      {Array.from({ length: MAX_PRINTS }).map((_, i) => (
        <group
          key={i}
          ref={(g) => { meshRefs.current[i] = g; }}
          visible={false}
          position={[0, 0.012, 0]}
        >
          {/* Footprint = oval disc, slightly scaled along travel axis. */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.13, 12]} />
            <meshBasicMaterial
              ref={(m) => { matRefs.current[i] = m; }}
              color="#3D2E1A"
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
