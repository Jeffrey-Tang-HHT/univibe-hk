import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getPlayerPos } from './playerPosBus';
import type { WeatherState } from './weather';

/**
 * Weather — rain particle system + extra clouds for cloudy days.
 *
 * Mounted only when weather.mode !== 'clear'. The component is the
 * authoritative scene-graph source for weather visuals; lighting and fog
 * shifts live in DayNightCycle (which reads the same WeatherState).
 *
 * Rain rendering: a single `<points>` with N droplets that fall through
 * a moving box centered on the player. Droplets that hit y<0.1 wrap to
 * the top with a fresh random horizontal position. The wrap-around box
 * follows the player so we never run out of rain regardless of how far
 * they wander.
 *
 * Cloudy rendering: a few extra `<sprite>` cloud puffs scattered higher
 * than the existing CLOUD_POSITIONS, making the sky read as overcast
 * without redoing the cloud layer.
 *
 * Density scales linearly with `weather.intensity`. Cap at MAX so
 * heavy-rain days don't blow the budget.
 */

const RAIN_MAX = 600;
const RAIN_AREA = 35; // half-width of the rain volume, in metres
const RAIN_HEIGHT = 18;
const RAIN_FALL_SPEED = 22; // m/s, fast enough to streak

interface WeatherProps {
  weather: WeatherState;
}

export default function Weather({ weather }: WeatherProps) {
  if (weather.mode === 'clear') return null;
  return (
    <group>
      {weather.mode === 'rain' && <Rain intensity={weather.intensity} />}
      {weather.mode === 'cloudy' && <ExtraClouds intensity={weather.intensity} />}
    </group>
  );
}

// ─── Rain ───
function Rain({ intensity }: { intensity: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  // Active droplet count scales with intensity; geometry size is fixed
  // at MAX so we don't reallocate buffers when intensity changes.
  const activeCount = Math.max(80, Math.round(RAIN_MAX * intensity));

  // Initial droplet positions — random within a box centred on origin.
  // The useFrame loop translates the whole points object to follow the
  // player, so droplet positions are stored relative to the box centre.
  const { geometry, positions, velocities } = useMemo(() => {
    const positions = new Float32Array(RAIN_MAX * 3);
    const velocities = new Float32Array(RAIN_MAX); // y-velocity only
    for (let i = 0; i < RAIN_MAX; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 2 * RAIN_AREA;
      positions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2 * RAIN_AREA;
      // Slight per-droplet speed variance so the rain doesn't move as
      // a perfectly synchronized block.
      velocities[i] = RAIN_FALL_SPEED * (0.85 + Math.random() * 0.3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // Hide unused droplets via draw range. setDrawRange(start, count).
    geometry.setDrawRange(0, activeCount);
    return { geometry, positions, velocities };
  }, [activeCount]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const dt = Math.min(delta, 0.05);

    // Move whole rain volume to follow the player horizontally.
    const pp = getPlayerPos();
    pointsRef.current.position.x = pp.x;
    pointsRef.current.position.z = pp.z;

    // Update droplet y positions; wrap when below ground.
    const arr = positions;
    for (let i = 0; i < activeCount; i++) {
      arr[i * 3 + 1] -= velocities[i] * dt;
      if (arr[i * 3 + 1] < 0.1) {
        // Reset to top with new random horizontal — gives rain its
        // characteristic moving-curtain look as droplets reposition.
        arr[i * 3 + 0] = (Math.random() - 0.5) * 2 * RAIN_AREA;
        arr[i * 3 + 1] = RAIN_HEIGHT;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 2 * RAIN_AREA;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      {/* Streaky rain look: stretched point that catches light. The
          pointsMaterial doesn't natively support stretched lines, so we
          fake it with a small size + slight emissive-like blue. */}
      <pointsMaterial
        color="#A8C8E0"
        size={0.18}
        transparent
        opacity={0.55}
        depthWrite={false}
        sizeAttenuation
        fog={false}
      />
    </points>
  );
}

// ─── Extra clouds for cloudy days ───
function ExtraClouds({ intensity }: { intensity: number }) {
  // Deterministic per-day positions: we don't need full determinism
  // here since cloud layout is decorative, but seeding off intensity
  // keeps the layout stable across reloads of the same day.
  const positions = useMemo<[number, number, number][]>(() => {
    const seed = Math.floor(intensity * 1000);
    const rand = (n: number) => {
      const x = Math.sin(seed + n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };
    const count = Math.round(6 + intensity * 8); // 6..14 puffs
    return Array.from({ length: count }, (_, i) => [
      (rand(i) - 0.5) * 80,
      24 + rand(i + 100) * 12,
      (rand(i + 200) - 0.5) * 80,
    ]);
  }, [intensity]);

  return (
    <group>
      {positions.map((pos, i) => (
        <group key={`extracloud-${i}`} position={pos}>
          <mesh>
            <sphereGeometry args={[3.2, 8, 8]} />
            <meshBasicMaterial
              color="#D8DCE4"
              transparent
              opacity={0.55 + intensity * 0.2}
              fog={false}
            />
          </mesh>
          <mesh position={[2.0, 0.2, 0.4]}>
            <sphereGeometry args={[2.4, 8, 8]} />
            <meshBasicMaterial color="#CDD2DA" transparent opacity={0.5} fog={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
