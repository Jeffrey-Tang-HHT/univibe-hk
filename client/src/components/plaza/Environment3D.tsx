import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Instances, Instance, Html } from '@react-three/drei';
import ZoneLandmarks from './ZoneLandmarks';
import ZoneLabels from './ZoneLabels';
import FountainCallout from './FountainCallout';
import NPCs from './NPCs';

interface ZoneConfig {
  position: [number, number, number];
  size: [number, number];
  color: string;
  label: string;
  labelEn: string;
}

const ZONES: ZoneConfig[] = [
  { position: [0, 0.01, 0], size: [12, 12], color: '#4ECDC4', label: '中央廣場', labelEn: 'Central Plaza' },
  { position: [-18, 0.01, -15], size: [14, 14], color: '#45B7D1', label: '自習區', labelEn: 'Study Zone' },
  { position: [18, 0.01, -15], size: [14, 14], color: '#FF6B6B', label: '社交區', labelEn: 'Social Zone' },
  { position: [-18, 0.01, 18], size: [14, 14], color: '#C4B5FD', label: '交友角', labelEn: 'Dating Corner' },
  { position: [18, 0.01, 18], size: [14, 14], color: '#FFA07A', label: '咖啡廳', labelEn: 'Café' },
];

export default function Environment({
  lang = 'zh',
  currentZone = 'center',
  playerPosRef,
}: {
  lang?: string;
  currentZone?: string;
  // Ref to the live player position. Passed down so ZoneMarker can react to
  // proximity without forcing the whole scene to re-render every frame.
  playerPosRef?: React.MutableRefObject<{ x: number; z: number }>;
}) {
  // Stable randomized values — computed once per mount, not per render.
  // We pre-compute per-instance scale AND a small hue offset so instanced trees/bushes
  // don't look identical. Three.Color handles HSL shifts cleanly.
  const treeVariations = useMemo(
    () =>
      TREE_POSITIONS.map(() => ({
        scale: 0.8 + Math.random() * 0.4,
        hueShift: (Math.random() - 0.5) * 0.08, // ±8% hue rotation
        lightShift: (Math.random() - 0.5) * 0.08,
      })),
    []
  );

  const bushVariations = useMemo(
    () =>
      BUSH_POSITIONS.map(() => ({
        hueShift: (Math.random() - 0.5) * 0.06,
        lightShift: (Math.random() - 0.5) * 0.1,
      })),
    []
  );

  return (
    <group>
      {/* Golden-hour fog is set on the Canvas (Plaza.tsx) */}

      {/* Ground plane */}
      <Ground />

      {/* Zone markers (ground circles only — labels are now HTML overlays via ZoneLabels) */}
      {ZONES.map((zone, i) => (
        <ZoneMarker key={i} zone={zone} lang={lang} playerPosRef={playerPosRef} />
      ))}

      {/* Zone landmarks — distinctive structures for each zone */}
      <ZoneLandmarks />

      {/* Leader-line zone labels (HTML overlays projected from 3D positions) */}
      <ZoneLabels lang={lang} currentZone={currentZone} />

      {/* "Particle spout" callout on the fountain — hidden when player is at center */}
      <FountainCallout lang={lang} hidden={currentZone === 'center'} />

      {/* NPCs — bring the plaza to life with 8 ambient characters */}
      <NPCs lang={lang} />

      {/* Trees — instanced (1 draw call per sub-mesh instead of per tree) */}
      <InstancedTrees positions={TREE_POSITIONS} variations={treeVariations} />

      {/* Benches */}
      {BENCH_POSITIONS.map((pos, i) => (
        <Bench key={`bench-${i}`} position={pos} rotation={pos[3] || 0} />
      ))}

      {/* Central fountain */}
      <Fountain position={[0, 0, 0]} />

      {/* Buildings along edges */}
      <Building position={[-35, 0, 0]} scale={[4, 6, 15]} color="#94A3B8" label="圖書館" labelEn="Library" lang={lang} />
      <Building position={[35, 0, 0]} scale={[4, 6, 12]} color="#7C8DB0" label="學生會" labelEn="Student Union" lang={lang} />
      <Building position={[0, 0, -35]} scale={[20, 8, 3]} color="#8B97AC" label="主教學樓" labelEn="Main Building" lang={lang} />
      <Building position={[0, 0, 38]} scale={[15, 5, 3]} color="#A0AEC0" label="飯堂" labelEn="Canteen" lang={lang} />

      {/* Lamp posts — pole + bulb instanced; pointLights stay per-lamp (can't instance lights) */}
      <InstancedLamps positions={LAMP_POSITIONS} />
      {LAMP_POSITIONS.map((pos, i) => (
        <pointLight
          key={`lamp-light-${i}`}
          position={[pos[0], 3.1, pos[2]]}
          intensity={0.5}
          distance={8}
          color="#FFF9C4"
        />
      ))}

      {/* Winding paths from centre to each zone */}
      <WindingPaths />

      {/* Cobbled plaza around the fountain */}
      <CobbledPlaza />

      {/* Ponds */}
      <Pond position={[-26, 0, 3]} radius={2.5} />
      <Pond position={[26, 0, 3]} radius={2.2} />

      {/* Rocks scattered around — instanced */}
      <InstancedRocks rocks={ROCK_POSITIONS} />

      {/* Bushes filling in the grass — instanced */}
      <InstancedBushes bushes={BUSH_POSITIONS} variations={bushVariations} />

      {/* Grass tufts for ground detail — instanced */}
      <InstancedGrassTufts positions={GRASS_TUFT_POSITIONS} />

      {/* Sky dome — golden-hour gradient (peach horizon → soft lavender-blue zenith) */}
      <mesh>
        <sphereGeometry args={[80, 32, 32]} />
        <shaderMaterial
          side={THREE.BackSide}
          fog={false}
          uniforms={{
            topColor: { value: new THREE.Color('#A8B8D8') },
            midColor: { value: new THREE.Color('#E8B894') },
            bottomColor: { value: new THREE.Color('#F4D4A8') },
            offset: { value: 0 },
            exponent: { value: 0.7 },
          }}
          vertexShader={`
            varying vec3 vWorldPosition;
            void main() {
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vWorldPosition = worldPosition.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 topColor;
            uniform vec3 midColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
              float h = normalize(vWorldPosition + offset).y;
              vec3 col;
              if (h < 0.15) {
                col = mix(bottomColor, midColor, smoothstep(0.0, 0.15, h));
              } else {
                col = mix(midColor, topColor, pow(smoothstep(0.15, 1.0, h), exponent));
              }
              gl_FragColor = vec4(col, 1.0);
            }
          `}
        />
      </mesh>

      {/* Clouds */}
      {CLOUD_POSITIONS.map((pos, i) => (
        <Cloud key={`cloud-${i}`} position={pos} />
      ))}

      {/* Ambient floating particles (pollen/dust) */}
      <AmbientParticles />
    </group>
  );
}

// ─── Ground ───
function Ground() {
  const groundMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: '#8FBC5C', // Warmer, more saturated grass
      roughness: 0.95,
      metalness: 0,
    });
    return mat;
  }, []);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow material={groundMat}>
      <planeGeometry args={[100, 100]} />
    </mesh>
  );
}

// ─── Zone Markers ───
// ─── Zone marker — ground disc + proximity "Enter" prompt ───
// When the player is within APPROACH_DIST of the zone centre, a pulsing glow
// ring appears and a floating HTML prompt invites them in. At closer range
// the prompt fades out (you're already there). Read player position from a
// ref so this component doesn't re-render on every frame.
const APPROACH_DIST = 10; // start showing prompt at this world-space distance
const ENTER_DIST = 5;     // prompt peaks here
const INSIDE_DIST = 3.5;  // fades out once you're clearly inside

function ZoneMarker({
  zone,
  lang,
  playerPosRef,
}: {
  zone: ZoneConfig;
  lang?: string;
  playerPosRef?: React.MutableRefObject<{ x: number; z: number }>;
}) {
  const discRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const promptVisibleRef = useRef(false);

  useFrame(() => {
    // Base disc gentle pulse (always on)
    if (discRef.current) {
      (discRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.15 + Math.sin(Date.now() * 0.002) * 0.05;
    }

    // Proximity-driven glow ring + enter prompt
    if (!playerPosRef) return;
    const p = playerPosRef.current;
    const dx = p.x - zone.position[0];
    const dz = p.z - zone.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);

    // Smoothstep: 0 when far, 1 when inside "enter ring"
    const nearness = THREE.MathUtils.clamp(
      1 - (dist - ENTER_DIST) / (APPROACH_DIST - ENTER_DIST),
      0,
      1,
    );
    // Fade out once you're deep inside the zone so the prompt doesn't sit on you
    const insideFade = THREE.MathUtils.clamp(
      (dist - INSIDE_DIST) / (ENTER_DIST - INSIDE_DIST),
      0,
      1,
    );
    const promptStrength = nearness * insideFade;

    if (glowRef.current) {
      const pulse = 0.6 + Math.sin(Date.now() * 0.004) * 0.25;
      (glowRef.current.material as THREE.MeshBasicMaterial).opacity =
        promptStrength * pulse * 0.55;
      // Scale the ring subtly with the pulse
      const s = 1 + Math.sin(Date.now() * 0.004) * 0.04;
      glowRef.current.scale.set(s, s, s);
    }

    // Toggle the HTML prompt via a ref-style opacity so we don't round-trip
    // through React state every frame.
    if (promptRef.current) {
      const visible = promptStrength > 0.05;
      if (visible !== promptVisibleRef.current) {
        promptRef.current.style.display = visible ? 'flex' : 'none';
        promptVisibleRef.current = visible;
      }
      if (visible) {
        promptRef.current.style.opacity = promptStrength.toFixed(2);
        promptRef.current.style.transform = `translate(-50%, -100%) scale(${(
          0.92 + promptStrength * 0.08
        ).toFixed(3)})`;
      }
    }
  });

  const isZh = lang === 'zh';
  const zoneLabel = isZh ? zone.label : zone.labelEn;

  return (
    <group position={zone.position}>
      {/* Base disc */}
      <mesh ref={discRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[zone.size[0] / 2, 32]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.2} />
      </mesh>
      {/* Static zone ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[zone.size[0] / 2 - 0.3, zone.size[0] / 2, 32]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.5} />
      </mesh>
      {/* Proximity glow ring — brightens + pulses when player approaches */}
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[zone.size[0] / 2 - 0.15, zone.size[0] / 2 + 0.45, 48]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0} fog={false} />
      </mesh>

      {/* Floating "Enter" prompt — raw HTML styled inline so it doesn't
          require a stylesheet import. Starts hidden; the frame loop flips
          display/opacity based on player distance. */}
      <Html
        position={[0, 2.2, 0]}
        center
        distanceFactor={10}
        zIndexRange={[20, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          ref={promptRef}
          style={{
            display: 'none',
            opacity: 0,
            transition: 'opacity 120ms ease-out, transform 120ms ease-out',
            padding: '6px 14px 6px 10px',
            borderRadius: 999,
            background: 'rgba(15, 17, 25, 0.82)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            border: `1.5px solid ${zone.color}`,
            boxShadow: `0 6px 24px ${zone.color}55, 0 2px 6px rgba(0,0,0,0.3)`,
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.02em',
            whiteSpace: 'nowrap',
            alignItems: 'center',
            gap: 8,
            transform: 'translate(-50%, -100%) scale(0.92)',
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: zone.color,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f1119',
              fontWeight: 800,
              fontSize: 11,
              lineHeight: 1,
            }}
          >
            →
          </span>
          <span style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}>
            {isZh ? `進入${zoneLabel}` : `Enter ${zoneLabel}`}
          </span>
        </div>
      </Html>
    </group>
  );
}

// ─── Tree ───
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 8]} />
        <meshToonMaterial color="#8B6E4E" />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 1.6, 0]} castShadow>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshToonMaterial color="#4CAF50" />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshToonMaterial color="#66BB6A" />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshToonMaterial color="#81C784" />
      </mesh>
    </group>
  );
}

// ─── Instanced Trees ───
// One <Instances> per sub-mesh → 4 draw calls total for all trees instead of 4-per-tree.
// Per-instance colour varies hue/lightness slightly so trees don't look cloned.
type TreeVariation = { scale: number; hueShift: number; lightShift: number };

function InstancedTrees({
  positions,
  variations,
}: {
  positions: [number, number, number][];
  variations: TreeVariation[];
}) {
  const limit = Math.max(positions.length, 32);

  // Pre-compute per-instance tint colours for each foliage layer (stable across renders).
  const tints = useMemo(() => {
    const base1 = new THREE.Color('#4CAF50');
    const base2 = new THREE.Color('#66BB6A');
    const base3 = new THREE.Color('#81C784');
    return variations.map((v) => {
      const c1 = base1.clone().offsetHSL(v.hueShift, 0, v.lightShift);
      const c2 = base2.clone().offsetHSL(v.hueShift, 0, v.lightShift);
      const c3 = base3.clone().offsetHSL(v.hueShift, 0, v.lightShift);
      return [c1, c2, c3] as const;
    });
  }, [variations]);

  return (
    <group>
      {/* Trunks */}
      <Instances limit={limit} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.2, 8]} />
        <meshToonMaterial color="#8B6E4E" />
        {positions.map((pos, i) => (
          <Instance
            key={`trunk-${i}`}
            position={[pos[0], pos[1] + 0.6 * variations[i].scale, pos[2]]}
            scale={variations[i].scale}
          />
        ))}
      </Instances>

      {/* Foliage layer 1 (largest, darkest) */}
      <Instances limit={limit} castShadow>
        <sphereGeometry args={[0.8, 8, 8]} />
        <meshToonMaterial color="#4CAF50" />
        {positions.map((pos, i) => (
          <Instance
            key={`fol1-${i}`}
            position={[pos[0], pos[1] + 1.6 * variations[i].scale, pos[2]]}
            scale={variations[i].scale}
            color={tints[i][0]}
          />
        ))}
      </Instances>

      {/* Foliage layer 2 */}
      <Instances limit={limit} castShadow>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshToonMaterial color="#66BB6A" />
        {positions.map((pos, i) => (
          <Instance
            key={`fol2-${i}`}
            position={[pos[0], pos[1] + 2.1 * variations[i].scale, pos[2]]}
            scale={variations[i].scale}
            color={tints[i][1]}
          />
        ))}
      </Instances>

      {/* Foliage layer 3 (top, brightest) — no shadow, small */}
      <Instances limit={limit}>
        <sphereGeometry args={[0.35, 8, 8]} />
        <meshToonMaterial color="#81C784" />
        {positions.map((pos, i) => (
          <Instance
            key={`fol3-${i}`}
            position={[pos[0], pos[1] + 2.5 * variations[i].scale, pos[2]]}
            scale={variations[i].scale}
            color={tints[i][2]}
          />
        ))}
      </Instances>
    </group>
  );
}

// ─── Bench ───
function Bench({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* Seat */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[1.2, 0.06, 0.4]} />
        <meshToonMaterial color="#A0522D" />
      </mesh>
      {/* Back */}
      <mesh position={[0, 0.55, -0.18]} castShadow>
        <boxGeometry args={[1.2, 0.35, 0.04]} />
        <meshToonMaterial color="#8B4513" />
      </mesh>
      {/* Legs */}
      {[[-0.5, 0.17, 0.12], [0.5, 0.17, 0.12], [-0.5, 0.17, -0.12], [0.5, 0.17, -0.12]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <boxGeometry args={[0.05, 0.34, 0.05]} />
          <meshToonMaterial color="#696969" />
        </mesh>
      ))}
    </group>
  );
}

// ─── Fountain — multi-tier with prominent water jets (golden-hour cinematic) ───
function Fountain({ position }: { position: [number, number, number] }) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (waterRef.current) {
      waterRef.current.rotation.y = clock.getElapsedTime() * 0.15;
    }
  });

  const stoneColor = '#D4C7B0'; // Warm limestone
  const darkStoneColor = '#A89780';

  return (
    <group position={position}>
      {/* Outer basin — wide stone rim */}
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3.2, 3.4, 0.5, 32]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>
      {/* Outer basin inner wall — slightly darker */}
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <cylinderGeometry args={[3.0, 3.0, 0.25, 32]} />
        <meshStandardMaterial color={darkStoneColor} roughness={0.9} />
      </mesh>
      {/* Water in outer basin — restrained emissive so the tone-mapped highlights don't bloom into a solid disc */}
      <mesh ref={waterRef} position={[0, 0.52, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.95, 32]} />
        <meshStandardMaterial
          color="#5FBCD9"
          transparent
          opacity={0.7}
          roughness={0.2}
          metalness={0.15}
          emissive="#88D4E8"
          emissiveIntensity={0.04}
        />
      </mesh>

      {/* Middle tier pedestal */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.65, 0.5, 16]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>

      {/* Middle bowl */}
      <mesh position={[0, 1.25, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.4, 1.1, 0.35, 24]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>
      {/* Middle bowl water */}
      <mesh position={[0, 1.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.3, 24]} />
        <meshStandardMaterial color="#5FBCD9" transparent opacity={0.75} roughness={0.2} emissive="#88D4E8" emissiveIntensity={0.05} />
      </mesh>

      {/* Top pedestal */}
      <mesh position={[0, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.32, 0.5, 12]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>

      {/* Top bowl */}
      <mesh position={[0, 2.1, 0]} castShadow>
        <cylinderGeometry args={[0.7, 0.5, 0.25, 16]} />
        <meshStandardMaterial color={stoneColor} roughness={0.85} />
      </mesh>
      {/* Top bowl water */}
      <mesh position={[0, 2.25, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.6, 16]} />
        <meshStandardMaterial color="#5FBCD9" transparent opacity={0.75} emissive="#88D4E8" emissiveIntensity={0.06} />
      </mesh>

      {/* Central water jets — multi-stream spout */}
      <WaterJets />

      {/* Cascade spillover from middle → outer */}
      <WaterCascade />
    </group>
  );
}

// Multi-directional water jets from the top
function WaterJets() {
  const ref = useRef<THREE.Points>(null);
  const count = 120;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Randomly assigned to one of 5 jets (center + 4 angled outward).
      // Narrower `outward` and tighter `spread` keep the plume reading as a column,
      // not a fan — crucial from the default 55° fov top-down camera angle.
      const jet = Math.floor(Math.random() * 5);
      const angle = jet === 0 ? 0 : ((jet - 1) / 4) * Math.PI * 2;
      const spread = jet === 0 ? 0.04 : 0.08;
      const outward = jet === 0 ? 0 : 0.025;

      arr[i * 3] = Math.cos(angle) * outward + (Math.random() - 0.5) * spread;
      arr[i * 3 + 1] = 2.3 + Math.random() * 0.1;
      arr[i * 3 + 2] = Math.sin(angle) * outward + (Math.random() - 0.5) * spread;

      // Upward + (much smaller) outward velocity; wider upward variance
      velocities[i * 3] = jet === 0 ? 0 : Math.cos(angle) * 0.008;
      velocities[i * 3 + 1] = 0.06 + Math.random() * 0.07;
      velocities[i * 3 + 2] = jet === 0 ? 0 : Math.sin(angle) * 0.008;
    }
    return { arr, velocities };
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const vel = positions.velocities;
    for (let i = 0; i < count; i++) {
      pos[i * 3] += vel[i * 3];
      pos[i * 3 + 1] += vel[i * 3 + 1];
      pos[i * 3 + 2] += vel[i * 3 + 2];
      // Gravity
      vel[i * 3 + 1] -= 0.003;
      // Reset when below basin
      if (pos[i * 3 + 1] < 1.5) {
        const jet = Math.floor(Math.random() * 5);
        const angle = jet === 0 ? 0 : ((jet - 1) / 4) * Math.PI * 2;
        const spread = jet === 0 ? 0.04 : 0.08;
        const outward = jet === 0 ? 0 : 0.025;
        pos[i * 3] = Math.cos(angle) * outward + (Math.random() - 0.5) * spread;
        pos[i * 3 + 1] = 2.3 + Math.random() * 0.1;
        pos[i * 3 + 2] = Math.sin(angle) * outward + (Math.random() - 0.5) * spread;
        vel[i * 3] = jet === 0 ? 0 : Math.cos(angle) * 0.008;
        vel[i * 3 + 1] = 0.06 + Math.random() * 0.07;
        vel[i * 3 + 2] = jet === 0 ? 0 : Math.sin(angle) * 0.008;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.arr}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#CFEEF9"
        size={0.09}
        transparent
        opacity={0.9}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

// Water droplets cascading from middle bowl edge
function WaterCascade() {
  const ref = useRef<THREE.Points>(null);
  const count = 60;

  const { positions, phases } = useMemo(() => {
    const arr = new Float32Array(count * 3);
    const ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      arr[i * 3] = Math.cos(angle) * 1.3;
      arr[i * 3 + 1] = 1.4 - Math.random() * 0.2;
      arr[i * 3 + 2] = Math.sin(angle) * 1.3;
      ph[i] = Math.random() * Math.PI * 2;
    }
    return { positions: arr, phases: ph };
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      // Fall loop
      const fallY = ((t * 1.2 + phases[i]) % 1) * 0.85;
      pos[i * 3] = Math.cos(angle) * 1.3;
      pos[i * 3 + 1] = 1.4 - fallY;
      pos[i * 3 + 2] = Math.sin(angle) * 1.3;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#C8E8F4"
        size={0.055}
        transparent
        opacity={0.7}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

// ─── Building — brick facade with window rows (golden-hour lit) ───
function Building({
  position, scale, color: _color, label, labelEn, lang
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  label: string;
  labelEn: string;
  lang: string;
}) {
  // Derive a "brick" color from the passed cool-gray default — warm it up
  const brickColor = '#B55D3E'; // Warm red-brown brick
  const brickDark = '#8B4332';
  const trimColor = '#F5E6D3'; // Cream limestone trim

  const rows = Math.max(2, Math.floor(scale[1] / 1.4));
  const cols = Math.max(2, Math.floor(scale[0] / 1.8));

  return (
    <group position={position}>
      {/* Main building body — brick */}
      <mesh position={[0, scale[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={brickColor} roughness={0.92} />
      </mesh>

      {/* Base plinth — darker stone */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[scale[0] + 0.3, 0.8, scale[2] + 0.3]} />
        <meshStandardMaterial color={brickDark} roughness={0.95} />
      </mesh>

      {/* Cornice / top trim — cream limestone */}
      <mesh position={[0, scale[1] - 0.25, 0]}>
        <boxGeometry args={[scale[0] + 0.25, 0.5, scale[2] + 0.25]} />
        <meshStandardMaterial color={trimColor} roughness={0.8} />
      </mesh>

      {/* Roof cap — slight peaked box */}
      <mesh position={[0, scale[1] + 0.2, 0]}>
        <boxGeometry args={[scale[0] + 0.1, 0.3, scale[2] + 0.1]} />
        <meshStandardMaterial color="#6B4E2A" roughness={0.85} />
      </mesh>

      {/* Window rows — front face */}
      {Array.from({ length: cols }).map((_, i) =>
        Array.from({ length: rows }).map((_, j) => {
          const x = -scale[0] / 2 + (scale[0] / cols) * (i + 0.5);
          const y = 1.2 + j * (scale[1] - 2) / Math.max(1, rows - 1);
          // Randomly make some windows lit (warm)
          const isLit = (i * 3 + j * 7) % 5 < 2;
          return (
            <group key={`fw-${i}-${j}`}>
              {/* Window frame (lighter stone) */}
              <mesh position={[x, y, scale[2] / 2 + 0.02]}>
                <planeGeometry args={[0.95, 1.15]} />
                <meshStandardMaterial color={trimColor} roughness={0.7} />
              </mesh>
              {/* Window pane — lit or reflective */}
              <mesh position={[x, y, scale[2] / 2 + 0.03]}>
                <planeGeometry args={[0.8, 1]} />
                <meshStandardMaterial
                  color={isLit ? '#FFD88F' : '#6A8CAE'}
                  emissive={isLit ? '#FFB347' : '#2C4762'}
                  emissiveIntensity={isLit ? 0.4 : 0.1}
                  roughness={0.3}
                  metalness={0.2}
                />
              </mesh>
              {/* Window cross (mullions) */}
              <mesh position={[x, y, scale[2] / 2 + 0.04]}>
                <planeGeometry args={[0.8, 0.04]} />
                <meshBasicMaterial color={trimColor} />
              </mesh>
              <mesh position={[x, y, scale[2] / 2 + 0.04]}>
                <planeGeometry args={[0.04, 1]} />
                <meshBasicMaterial color={trimColor} />
              </mesh>
            </group>
          );
        }),
      )}

      {/* Side windows (smaller, less detailed) — left face */}
      {scale[2] > 6 && Array.from({ length: Math.floor(scale[2] / 2) }).map((_, i) =>
        Array.from({ length: rows }).map((_, j) => {
          const z = -scale[2] / 2 + (scale[2] / Math.floor(scale[2] / 2)) * (i + 0.5);
          const y = 1.2 + j * (scale[1] - 2) / Math.max(1, rows - 1);
          return (
            <mesh key={`sw-${i}-${j}`} position={[-scale[0] / 2 - 0.02, y, z]} rotation={[0, -Math.PI / 2, 0]}>
              <planeGeometry args={[0.7, 1]} />
              <meshStandardMaterial color="#6A8CAE" emissive="#2C4762" emissiveIntensity={0.1} roughness={0.3} metalness={0.2} />
            </mesh>
          );
        }),
      )}

      {/* Label */}
      <Text
        position={[0, scale[1] + 0.7, scale[2] / 2 + 0.1]}
        fontSize={0.8}
        color="#FFFFFF"
        anchorX="center"
        outlineWidth={0.04}
        outlineColor="#333333"
      >
        {lang === 'zh' ? label : labelEn}
      </Text>
    </group>
  );
}

// ─── Lamp Post ───
function LampPost({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 3, 8]} />
        <meshToonMaterial color="#555555" />
      </mesh>
      <mesh position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#FFF9C4" />
      </mesh>
      <pointLight position={[0, 3.1, 0]} intensity={0.5} distance={8} color="#FFF9C4" />
    </group>
  );
}

// ─── Instanced Lamps ───
// Poles + bulbs instanced; the pointLights are emitted separately by the caller.
function InstancedLamps({ positions }: { positions: [number, number, number][] }) {
  const limit = Math.max(positions.length, 16);
  return (
    <group>
      {/* Poles */}
      <Instances limit={limit} castShadow>
        <cylinderGeometry args={[0.04, 0.06, 3, 8]} />
        <meshToonMaterial color="#555555" />
        {positions.map((pos, i) => (
          <Instance key={`pole-${i}`} position={[pos[0], pos[1] + 1.5, pos[2]]} />
        ))}
      </Instances>
      {/* Bulbs (emissive-looking, but meshBasicMaterial so they stay bright) */}
      <Instances limit={limit}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#FFF9C4" />
        {positions.map((pos, i) => (
          <Instance key={`bulb-${i}`} position={[pos[0], pos[1] + 3.1, pos[2]]} />
        ))}
      </Instances>
    </group>
  );
}

// ─── Winding Paths — curved paths from centre to each zone ───
function WindingPaths() {
  return (
    <group>
      <CurvedPath fromX={0} fromZ={0} toX={-18} toZ={-15} offset={3} color="#D7CCC8" />
      <CurvedPath fromX={0} fromZ={0} toX={18} toZ={-15} offset={-3} color="#D7CCC8" />
      <CurvedPath fromX={0} fromZ={0} toX={-18} toZ={18} offset={-3} color="#D7CCC8" />
      <CurvedPath fromX={0} fromZ={0} toX={18} toZ={18} offset={3} color="#D7CCC8" />
      {/* Paths to edge buildings */}
      <CurvedPath fromX={0} fromZ={0} toX={-33} toZ={0} offset={2} color="#BCAAA4" width={2} />
      <CurvedPath fromX={0} fromZ={0} toX={33} toZ={0} offset={-2} color="#BCAAA4" width={2} />
      <CurvedPath fromX={0} fromZ={0} toX={0} toZ={-32} offset={2.5} color="#BCAAA4" width={2} />
      <CurvedPath fromX={0} fromZ={0} toX={0} toZ={35} offset={-2.5} color="#BCAAA4" width={2} />
    </group>
  );
}

function CurvedPath({
  fromX,
  fromZ,
  toX,
  toZ,
  width = 2.5,
  offset = 3,
  color = '#D7CCC8',
  steps = 18,
}: {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  width?: number;
  offset?: number;
  color?: string;
  steps?: number;
}) {
  const segments = useMemo(() => {
    const dx = toX - fromX;
    const dz = toZ - fromZ;
    const len = Math.sqrt(dx * dx + dz * dz) || 1;
    const px = -dz / len;
    const pz = dx / len;
    const cx = (fromX + toX) / 2 + px * offset;
    const cz = (fromZ + toZ) / 2 + pz * offset;

    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(fromX, 0, fromZ),
      new THREE.Vector3(cx, 0, cz),
      new THREE.Vector3(toX, 0, toZ)
    );
    const pts = curve.getPoints(steps);
    const segs: Array<{ pos: [number, number, number]; angle: number; length: number }> = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const segDx = b.x - a.x;
      const segDz = b.z - a.z;
      const segLen = Math.sqrt(segDx * segDx + segDz * segDz) + 0.35;
      segs.push({
        pos: [(a.x + b.x) / 2, 0.03, (a.z + b.z) / 2],
        angle: Math.atan2(segDx, segDz),
        length: segLen,
      });
    }
    return segs;
  }, [fromX, fromZ, toX, toZ, offset, steps]);

  return (
    <group>
      {segments.map((s, i) => (
        <group key={i} position={s.pos} rotation={[0, s.angle, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[width, s.length]} />
            <meshStandardMaterial color={color} roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─── Cobbled Plaza — decorative ring around central fountain ───
function CobbledPlaza() {
  return (
    <group>
      {/* Outer ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} receiveShadow>
        <ringGeometry args={[3.5, 5.5, 48]} />
        <meshStandardMaterial color="#C9B7A8" roughness={1} />
      </mesh>
      {/* Cobble accents — stones in a radial pattern */}
      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        const r = 4.5;
        return (
          <mesh
            key={i}
            position={[Math.cos(angle) * r, 0.04, Math.sin(angle) * r]}
            rotation={[-Math.PI / 2, 0, angle]}
            receiveShadow
          >
            <planeGeometry args={[0.7, 0.35]} />
            <meshStandardMaterial color="#A79687" roughness={1} />
          </mesh>
        );
      })}
    </group>
  );
}

// ─── Pond — stone-rimmed with lily pads, water flowers, gentle ripples ───
function Pond({ position, radius = 2.5 }: { position: [number, number, number]; radius?: number }) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (waterRef.current) {
      const t = clock.getElapsedTime();
      waterRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.008;
      waterRef.current.scale.z = 1 + Math.cos(t * 1.3) * 0.008;
    }
  });

  // Lily-pad positions (pseudo-random but stable)
  const lilyPads = useMemo(() => {
    const pads: Array<{ angle: number; dist: number; rot: number; size: number; hasFlower: boolean; flowerColor: string }> = [];
    const colors = ['#F8BBD0', '#FFF8E1', '#FFCDD2'];
    for (let i = 0; i < 6; i++) {
      pads.push({
        angle: (i / 6) * Math.PI * 2 + (i % 2) * 0.3,
        dist: radius * (0.35 + (i % 3) * 0.2),
        rot: Math.random() * Math.PI,
        size: 0.28 + Math.random() * 0.18,
        hasFlower: i % 2 === 0,
        flowerColor: colors[i % colors.length],
      });
    }
    return pads;
  }, [radius]);

  // Edge stones — irregular sizes and rotations
  const edgeStones = useMemo(() => {
    const stones: Array<{ angle: number; size: number; yRot: number; variant: number }> = [];
    for (let i = 0; i < 14; i++) {
      stones.push({
        angle: (i / 14) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        size: 0.28 + Math.random() * 0.22,
        yRot: Math.random() * Math.PI * 2,
        variant: Math.floor(Math.random() * 3),
      });
    }
    return stones;
  }, []);

  // Cattails / water grass
  const cattails = useMemo(() => {
    const tails: Array<{ angle: number; dist: number; height: number }> = [];
    for (let i = 0; i < 5; i++) {
      tails.push({
        angle: (i / 5) * Math.PI * 2 + 0.4,
        dist: radius * (0.95 + Math.random() * 0.15),
        height: 0.7 + Math.random() * 0.4,
      });
    }
    return tails;
  }, [radius]);

  const stoneColors = ['#9AA5AC', '#B4A595', '#8B9499'];

  return (
    <group position={position}>
      {/* Muddy pond floor (under water) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[radius * 1.02, 32]} />
        <meshStandardMaterial color="#4A5947" roughness={1} />
      </mesh>

      {/* Water surface — golden-hour reflective */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <circleGeometry args={[radius * 0.95, 32]} />
        <meshStandardMaterial
          color="#5AA8C4"
          roughness={0.15}
          metalness={0.3}
          transparent
          opacity={0.88}
          emissive="#F4D4A8"
          emissiveIntensity={0.08}
        />
      </mesh>

      {/* Inner highlight (sheen reflection) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.085, 0]}>
        <ringGeometry args={[radius * 0.3, radius * 0.55, 32]} />
        <meshBasicMaterial color="#FFE0B2" transparent opacity={0.15} />
      </mesh>

      {/* Edge mud ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} receiveShadow>
        <ringGeometry args={[radius * 0.95, radius * 1.1, 32]} />
        <meshStandardMaterial color="#6B5842" roughness={1} />
      </mesh>

      {/* Lily pads with optional flowers */}
      {lilyPads.map((pad, i) => {
        const x = Math.cos(pad.angle) * pad.dist;
        const z = Math.sin(pad.angle) * pad.dist;
        return (
          <group key={`lily-${i}`} position={[x, 0.11, z]} rotation={[0, pad.rot, 0]}>
            {/* Pad shape — slightly notched circle */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} castShadow>
              <circleGeometry args={[pad.size, 8]} />
              <meshStandardMaterial color="#3E8E41" roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            {/* Lighter highlight */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
              <circleGeometry args={[pad.size * 0.7, 8]} />
              <meshStandardMaterial color="#66BB6A" roughness={0.8} />
            </mesh>
            {/* Flower */}
            {pad.hasFlower && (
              <group position={[0, 0.08, 0]}>
                <mesh>
                  <sphereGeometry args={[0.13, 10, 8]} />
                  <meshStandardMaterial color={pad.flowerColor} roughness={0.7} emissive={pad.flowerColor} emissiveIntensity={0.1} />
                </mesh>
                {/* Petals — 5 small flattened spheres */}
                {Array.from({ length: 5 }).map((_, j) => {
                  const a = (j / 5) * Math.PI * 2;
                  return (
                    <mesh key={j} position={[Math.cos(a) * 0.11, 0, Math.sin(a) * 0.11]} scale={[1, 0.4, 1]}>
                      <sphereGeometry args={[0.08, 8, 6]} />
                      <meshStandardMaterial color={pad.flowerColor} roughness={0.7} />
                    </mesh>
                  );
                })}
                {/* Yellow center */}
                <mesh position={[0, 0.02, 0]}>
                  <sphereGeometry args={[0.05, 8, 6]} />
                  <meshStandardMaterial color="#FBC02D" roughness={0.5} emissive="#FBC02D" emissiveIntensity={0.2} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}

      {/* Edge stones — rim the pond */}
      {edgeStones.map((stone, i) => {
        const x = Math.cos(stone.angle) * radius * 1.1;
        const z = Math.sin(stone.angle) * radius * 1.1;
        const col = stoneColors[stone.variant];
        return (
          <mesh
            key={`stone-${i}`}
            position={[x, stone.size * 0.5, z]}
            rotation={[0, stone.yRot, 0]}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[stone.size, 0]} />
            <meshStandardMaterial color={col} roughness={0.95} flatShading />
          </mesh>
        );
      })}

      {/* Cattails / water grass — tall thin green spikes at pond edge */}
      {cattails.map((ct, i) => {
        const x = Math.cos(ct.angle) * ct.dist;
        const z = Math.sin(ct.angle) * ct.dist;
        return (
          <group key={`cattail-${i}`} position={[x, 0.1, z]}>
            {/* Stem */}
            <mesh position={[0, ct.height / 2, 0]}>
              <cylinderGeometry args={[0.015, 0.02, ct.height, 6]} />
              <meshStandardMaterial color="#558B2F" roughness={0.9} />
            </mesh>
            {/* Brown cattail head */}
            <mesh position={[0, ct.height * 0.85, 0]}>
              <cylinderGeometry args={[0.05, 0.05, 0.18, 8]} />
              <meshStandardMaterial color="#5D4037" roughness={0.9} />
            </mesh>
            {/* Leaf */}
            <mesh position={[0.04, ct.height * 0.5, 0]} rotation={[0, 0, 0.3]} scale={[0.8, 1, 1]}>
              <coneGeometry args={[0.02, ct.height * 0.7, 4]} />
              <meshStandardMaterial color="#689F38" roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// ─── Rock — low-poly stylized boulder ───
function Rock({
  position,
  scale = 1,
  rotation = 0,
}: {
  position: [number, number, number];
  scale?: number;
  rotation?: number;
}) {
  return (
    <group position={position} rotation={[0, rotation, 0]} scale={scale}>
      <mesh castShadow receiveShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshToonMaterial color="#90A4AE" />
      </mesh>
      <mesh position={[0.3, 0.1, 0.2]} scale={0.5} castShadow>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshToonMaterial color="#78909C" />
      </mesh>
    </group>
  );
}

// ─── Instanced Rocks ───
// Two instance groups (main + pebble beside it), matching the original Rock shape.
// To keep the same "pebble beside main stone" look, we pre-rotate the pebble offset
// by each rock's rotation, then pass absolute positions to the pebble Instances.
function InstancedRocks({
  rocks,
}: {
  rocks: Array<{ pos: [number, number, number]; scale: number; rot: number }>;
}) {
  const limit = Math.max(rocks.length, 20);

  const pebbles = useMemo(() => {
    return rocks.map((r) => {
      // Original pebble was at local [0.3, 0.1, 0.2] × scale with the main rock's Y rotation.
      const lx = 0.3 * r.scale;
      const lz = 0.2 * r.scale;
      const cos = Math.cos(r.rot);
      const sin = Math.sin(r.rot);
      const wx = r.pos[0] + lx * cos - lz * sin;
      const wz = r.pos[2] + lx * sin + lz * cos;
      const wy = r.pos[1] + 0.1 * r.scale;
      return { pos: [wx, wy, wz] as [number, number, number], scale: r.scale * 0.5, rot: r.rot };
    });
  }, [rocks]);

  return (
    <group>
      {/* Main boulders */}
      <Instances limit={limit} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshToonMaterial color="#90A4AE" />
        {rocks.map((r, i) => (
          <Instance
            key={`rock-main-${i}`}
            position={r.pos}
            rotation={[0, r.rot, 0]}
            scale={r.scale}
          />
        ))}
      </Instances>
      {/* Pebbles */}
      <Instances limit={limit} castShadow>
        <dodecahedronGeometry args={[0.4, 0]} />
        <meshToonMaterial color="#78909C" />
        {pebbles.map((p, i) => (
          <Instance
            key={`rock-pebble-${i}`}
            position={p.pos}
            rotation={[0, p.rot, 0]}
            scale={p.scale}
          />
        ))}
      </Instances>
    </group>
  );
}

// ─── Bush — rounded green shrub ───
function Bush({
  position,
  color = '#4CAF50',
}: {
  position: [number, number, number];
  color?: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.55, 10, 10]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[0.3, 0.45, 0.15]} castShadow>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshToonMaterial color={color} />
      </mesh>
      <mesh position={[-0.25, 0.4, -0.1]} castShadow>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshToonMaterial color={color} />
      </mesh>
    </group>
  );
}

// ─── Instanced Bushes ───
// Three sphere sub-lobes per bush → 3 draw calls for all 12.
// Per-instance hue shift keeps them from looking like clones.
function InstancedBushes({
  bushes,
  variations,
}: {
  bushes: Array<{ pos: [number, number, number]; color: string }>;
  variations: Array<{ hueShift: number; lightShift: number }>;
}) {
  const limit = Math.max(bushes.length, 20);

  const tints = useMemo(
    () =>
      bushes.map((b, i) => {
        const c = new THREE.Color(b.color);
        c.offsetHSL(variations[i].hueShift, 0, variations[i].lightShift);
        return c;
      }),
    [bushes, variations]
  );

  return (
    <group>
      {/* Main lobe */}
      <Instances limit={limit} castShadow>
        <sphereGeometry args={[0.55, 10, 10]} />
        <meshToonMaterial color="#4CAF50" />
        {bushes.map((b, i) => (
          <Instance
            key={`bush-m-${i}`}
            position={[b.pos[0], b.pos[1] + 0.35, b.pos[2]]}
            color={tints[i]}
          />
        ))}
      </Instances>
      {/* Right lobe */}
      <Instances limit={limit} castShadow>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshToonMaterial color="#4CAF50" />
        {bushes.map((b, i) => (
          <Instance
            key={`bush-r-${i}`}
            position={[b.pos[0] + 0.3, b.pos[1] + 0.45, b.pos[2] + 0.15]}
            color={tints[i]}
          />
        ))}
      </Instances>
      {/* Left lobe */}
      <Instances limit={limit} castShadow>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshToonMaterial color="#4CAF50" />
        {bushes.map((b, i) => (
          <Instance
            key={`bush-l-${i}`}
            position={[b.pos[0] - 0.25, b.pos[1] + 0.4, b.pos[2] - 0.1]}
            color={tints[i]}
          />
        ))}
      </Instances>
    </group>
  );
}

// ─── Grass Tuft — small foliage accent ───
function GrassTuft({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.1, 0]}>
        <coneGeometry args={[0.08, 0.25, 5]} />
        <meshToonMaterial color="#66BB6A" />
      </mesh>
      <mesh position={[0.08, 0.08, 0.05]}>
        <coneGeometry args={[0.06, 0.2, 5]} />
        <meshToonMaterial color="#81C784" />
      </mesh>
      <mesh position={[-0.06, 0.09, -0.03]}>
        <coneGeometry args={[0.06, 0.22, 5]} />
        <meshToonMaterial color="#4CAF50" />
      </mesh>
    </group>
  );
}

// ─── Instanced Grass Tufts ───
// Three tiny cones per tuft × 28 tufts → 3 draw calls instead of 84.
function InstancedGrassTufts({ positions }: { positions: [number, number, number][] }) {
  const limit = Math.max(positions.length, 32);
  return (
    <group>
      <Instances limit={limit}>
        <coneGeometry args={[0.08, 0.25, 5]} />
        <meshToonMaterial color="#66BB6A" />
        {positions.map((pos, i) => (
          <Instance key={`g1-${i}`} position={[pos[0], pos[1] + 0.1, pos[2]]} />
        ))}
      </Instances>
      <Instances limit={limit}>
        <coneGeometry args={[0.06, 0.2, 5]} />
        <meshToonMaterial color="#81C784" />
        {positions.map((pos, i) => (
          <Instance key={`g2-${i}`} position={[pos[0] + 0.08, pos[1] + 0.08, pos[2] + 0.05]} />
        ))}
      </Instances>
      <Instances limit={limit}>
        <coneGeometry args={[0.06, 0.22, 5]} />
        <meshToonMaterial color="#4CAF50" />
        {positions.map((pos, i) => (
          <Instance key={`g3-${i}`} position={[pos[0] - 0.06, pos[1] + 0.09, pos[2] - 0.03]} />
        ))}
      </Instances>
    </group>
  );
}

// ─── Cloud ───
function Cloud({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Group>(null);
  const speed = useMemo(() => 0.002 + Math.random() * 0.003, []);

  useFrame(() => {
    if (ref.current) {
      ref.current.position.x += speed;
      if (ref.current.position.x > 60) ref.current.position.x = -60;
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh>
        <sphereGeometry args={[2, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} fog={false} />
      </mesh>
      <mesh position={[1.5, 0.3, 0]}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} fog={false} />
      </mesh>
      <mesh position={[-1.2, 0.2, 0.5]}>
        <sphereGeometry args={[1.8, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} fog={false} />
      </mesh>
    </group>
  );
}

// ─── Ambient Particles — drifting pollen/dust for atmospheric depth ───
function AmbientParticles() {
  const ref = useRef<THREE.Points>(null);
  const count = 90;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = Math.random() * 14 + 1;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += 0.008;
      pos[i * 3] += Math.sin(t * 0.4 + i * 0.7) * 0.003;
      pos[i * 3 + 2] += Math.cos(t * 0.3 + i * 0.5) * 0.003;
      if (pos[i * 3 + 1] > 18) {
        pos[i * 3 + 1] = 0.5;
        pos[i * 3] = (Math.random() - 0.5) * 80;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#FFF8E1"
        size={0.09}
        transparent
        opacity={0.55}
        sizeAttenuation
        fog={false}
        depthWrite={false}
      />
    </points>
  );
}

// ─── Positions ───
const TREE_POSITIONS: [number, number, number][] = [
  [-8, 0, -8], [8, 0, -8], [-8, 0, 8], [8, 0, 8],
  [-15, 0, 5], [15, 0, 5], [-15, 0, -5], [15, 0, -5],
  [-25, 0, -25], [25, 0, -25], [-25, 0, 25], [25, 0, 25],
  [-30, 0, 0], [30, 0, 0], [0, 0, -28], [0, 0, 30],
  [-12, 0, 20], [12, 0, -20], [-22, 0, 12], [22, 0, -12],
];

const BENCH_POSITIONS: [number, number, number, number?][] = [
  [-5, 0, -5, 0.3], [5, 0, -5, -0.3], [-5, 0, 5, -0.3], [5, 0, 5, 0.3],
  [-20, 0, -18, Math.PI / 4], [20, 0, -18, -Math.PI / 4],
  [-20, 0, 20, -Math.PI / 4], [20, 0, 20, Math.PI / 4],
];

const LAMP_POSITIONS: [number, number, number][] = [
  [-10, 0, 0], [10, 0, 0], [0, 0, -10], [0, 0, 10],
  [-20, 0, -20], [20, 0, -20], [-20, 0, 20], [20, 0, 20],
];

const CLOUD_POSITIONS: [number, number, number][] = [
  [-20, 30, -15], [15, 35, -20], [-30, 28, 10], [25, 32, 15],
  [0, 38, -25], [-10, 33, 20], [35, 30, 0],
];

const ROCK_POSITIONS: Array<{ pos: [number, number, number]; scale: number; rot: number }> = [
  { pos: [-14, 0, 6],   scale: 1.0, rot: 0.5 },
  { pos: [14, 0, -6],   scale: 0.8, rot: 1.2 },
  { pos: [-6, 0, 14],   scale: 1.3, rot: 2.1 },
  { pos: [6, 0, -14],   scale: 0.9, rot: 0.3 },
  { pos: [-28, 0, -8],  scale: 1.1, rot: 1.8 },
  { pos: [28, 0, 8],    scale: 1.0, rot: 0.9 },
  { pos: [-30, 0, 15],  scale: 0.7, rot: 2.5 },
  { pos: [30, 0, -18],  scale: 1.2, rot: 1.0 },
  { pos: [-10, 0, -24], scale: 0.9, rot: 0.6 },
  { pos: [10, 0, 24],   scale: 1.1, rot: 1.7 },
  { pos: [-24, 0, 28],  scale: 0.8, rot: 0.2 },
  { pos: [24, 0, -28],  scale: 1.0, rot: 2.2 },
];

const BUSH_POSITIONS: Array<{ pos: [number, number, number]; color: string }> = [
  { pos: [-12, 0, 2],   color: '#4CAF50' },
  { pos: [12, 0, -2],   color: '#66BB6A' },
  { pos: [-7, 0, 10],   color: '#43A047' },
  { pos: [7, 0, -10],   color: '#4CAF50' },
  { pos: [-22, 0, -5],  color: '#66BB6A' },
  { pos: [22, 0, 5],    color: '#43A047' },
  { pos: [-14, 0, -22], color: '#4CAF50' },
  { pos: [14, 0, 22],   color: '#66BB6A' },
  { pos: [-28, 0, 18],  color: '#43A047' },
  { pos: [28, 0, -18],  color: '#4CAF50' },
  { pos: [-3, 0, 18],   color: '#66BB6A' },
  { pos: [3, 0, -18],   color: '#43A047' },
];

const GRASS_TUFT_POSITIONS: [number, number, number][] = [
  [-9, 0, 3], [9, 0, -3], [-4, 0, 9], [4, 0, -9],
  [-13, 0, -3], [13, 0, 3], [-3, 0, 13], [3, 0, -13],
  [-19, 0, 6], [19, 0, -6], [-6, 0, 19], [6, 0, -19],
  [-24, 0, -2], [24, 0, 2], [-2, 0, 24], [2, 0, -24],
  [-11, 0, -11], [11, 0, 11], [-11, 0, 11], [11, 0, -11],
  [-16, 0, -8], [16, 0, 8], [-8, 0, 16], [8, 0, -16],
  [-30, 0, -12], [30, 0, 12], [-12, 0, 30], [12, 0, -30],
];
