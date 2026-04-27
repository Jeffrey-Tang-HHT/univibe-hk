// ─────────────────────────────────────────────────────────────
// ZoneParticles — single instanced point cloud for the active scene.
//
// Drop 1: one config per scene from scenes.ts (kind/color/density),
// rendered as plain `<points>` with a pre-baked round texture for
// the dot. Cheap — a few hundred points at most, single draw call.
//
// Drift behaviour varies by particle kind:
//   - petals:    gentle horizontal sway + slow fall
//   - sparkles:  twinkle (alpha pulse) + slight upward drift
//   - dust:      slow upward drift, low density
//   - leaves:    horizontal drift + falling rotation
//   - motes:     gentle upward drift (default)
// ─────────────────────────────────────────────────────────────

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useScene } from '@/contexts/SceneContext';
import { getSceneConfig, type ParticleKind } from '@/lib/scenes';

const BASE_COUNT = 220;

function makeRoundTexture(): THREE.Texture {
  // Soft circular gradient — used as the point sprite map.
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.needsUpdate = true;
  return t;
}

export default function ZoneParticles() {
  const { currentScene } = useScene();
  const cfg = getSceneConfig(currentScene);
  const kind: ParticleKind = cfg.particles.kind;
  const density = cfg.particles.density;

  const sprite = useMemo(() => makeRoundTexture(), []);

  // Particles count scales with density.
  const count = Math.max(20, Math.floor(BASE_COUNT * density));

  // Bounds — derive a reasonable spawn box from the scene.
  const { hx, hz } = cfg.bounds;
  const yMin = 0.2;
  const yMax = currentScene === 'plaza' ? 8 : 4.5;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 0] = (Math.random() - 0.5) * hx * 1.6;
      arr[i * 3 + 1] = yMin + Math.random() * (yMax - yMin);
      arr[i * 3 + 2] = (Math.random() - 0.5) * hz * 1.6;
    }
    return arr;
  }, [count, hx, hz, yMin, yMax]);

  // Per-particle velocities & seeds, kept in a parallel Float32Array.
  const velocities = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Defaults vary by kind.
      let vy = 0.3, vx = 0, vz = 0;
      switch (kind) {
        case 'petals':
          vy = -0.18 - Math.random() * 0.15; // falling
          vx = (Math.random() - 0.5) * 0.6;
          vz = (Math.random() - 0.5) * 0.6;
          break;
        case 'sparkles':
          vy = 0.12 + Math.random() * 0.18;
          vx = (Math.random() - 0.5) * 0.2;
          vz = (Math.random() - 0.5) * 0.2;
          break;
        case 'dust':
          vy = 0.08 + Math.random() * 0.08;
          vx = (Math.random() - 0.5) * 0.05;
          vz = (Math.random() - 0.5) * 0.05;
          break;
        case 'leaves':
          vy = -0.22 - Math.random() * 0.15;
          vx = (Math.random() - 0.5) * 0.8;
          vz = (Math.random() - 0.5) * 0.4;
          break;
        case 'motes':
        default:
          vy = 0.15 + Math.random() * 0.15;
          vx = (Math.random() - 0.5) * 0.1;
          vz = (Math.random() - 0.5) * 0.1;
          break;
      }
      arr[i * 3 + 0] = vx;
      arr[i * 3 + 1] = vy;
      arr[i * 3 + 2] = vz;
    }
    return arr;
  }, [count, kind]);

  // Positions are mutated each frame; we hold a ref to the buffer
  // attribute so we can flag `needsUpdate`.
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const tRef = useRef(0);

  useFrame((_, delta) => {
    if (!geomRef.current) return;
    const posAttr = geomRef.current.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!posAttr) return;
    const arr = posAttr.array as Float32Array;
    tRef.current += delta;

    for (let i = 0; i < count; i++) {
      const ix = i * 3 + 0;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;
      // Apply velocity.
      arr[ix] += velocities[ix] * delta;
      arr[iy] += velocities[iy] * delta;
      arr[iz] += velocities[iz] * delta;

      // For petals/leaves add a sin sway on x.
      if (kind === 'petals' || kind === 'leaves') {
        arr[ix] += Math.sin(tRef.current * 1.4 + i) * 0.005;
      }

      // Recycle particles that escape the bounds — keeps density steady
      // and avoids the cloud "draining" out of the scene over time.
      if (
        arr[iy] < yMin - 0.5 ||
        arr[iy] > yMax + 0.5 ||
        arr[ix] < -hx * 1.0 || arr[ix] > hx * 1.0 ||
        arr[iz] < -hz * 1.0 || arr[iz] > hz * 1.0
      ) {
        arr[ix] = (Math.random() - 0.5) * hx * 1.4;
        // Falling kinds re-spawn at top; rising kinds at bottom.
        const fromTop = kind === 'petals' || kind === 'leaves';
        arr[iy] = fromTop ? yMax - 0.1 : yMin + 0.1;
        arr[iz] = (Math.random() - 0.5) * hz * 1.4;
      }
    }

    posAttr.needsUpdate = true;
  });

  // Size depends on kind.
  const pointSize =
    kind === 'sparkles' ? 0.18 :
    kind === 'dust' ? 0.10 :
    kind === 'petals' ? 0.18 :
    kind === 'leaves' ? 0.20 :
    0.14;

  return (
    <points>
      <bufferGeometry ref={geomRef as any}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        map={sprite}
        size={pointSize}
        color={cfg.particles.color}
        transparent
        depthWrite={false}
        opacity={kind === 'dust' ? 0.55 : 0.85}
        sizeAttenuation
        // Additive looks great for sparkles/motes; normal for petals/leaves
        // (which should read as solid material, not glowing).
        blending={
          kind === 'sparkles' || kind === 'motes' || kind === 'dust'
            ? THREE.AdditiveBlending
            : THREE.NormalBlending
        }
      />
    </points>
  );
}
