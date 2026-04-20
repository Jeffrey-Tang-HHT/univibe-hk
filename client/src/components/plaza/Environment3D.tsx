import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import ZoneLandmarks from './ZoneLandmarks';

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

export default function Environment({ lang = 'zh' }: { lang?: string }) {
  // Stable randomized values — computed once per mount, not per render
  const treeScales = useMemo(
    () => TREE_POSITIONS.map(() => 0.8 + Math.random() * 0.4),
    []
  );

  return (
    <group>
      {/* Atmospheric fog — distant objects fade into sky color */}
      <fog attach="fog" args={['#C8E0F0', 35, 95]} />

      {/* Ground plane */}
      <Ground />

      {/* Zone markers */}
      {ZONES.map((zone, i) => (
        <ZoneMarker key={i} zone={zone} lang={lang} />
      ))}

      {/* Zone landmarks — distinctive structures for each zone */}
      <ZoneLandmarks />

      {/* Trees */}
      {TREE_POSITIONS.map((pos, i) => (
        <Tree key={`tree-${i}`} position={pos} scale={treeScales[i]} />
      ))}

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

      {/* Lamp posts */}
      {LAMP_POSITIONS.map((pos, i) => (
        <LampPost key={`lamp-${i}`} position={pos} />
      ))}

      {/* Winding paths from centre to each zone */}
      <WindingPaths />

      {/* Cobbled plaza around the fountain */}
      <CobbledPlaza />

      {/* Ponds */}
      <Pond position={[-26, 0, 3]} radius={2.5} />
      <Pond position={[26, 0, 3]} radius={2.2} />

      {/* Rocks scattered around */}
      {ROCK_POSITIONS.map((r, i) => (
        <Rock key={`rock-${i}`} position={r.pos} scale={r.scale} rotation={r.rot} />
      ))}

      {/* Bushes filling in the grass */}
      {BUSH_POSITIONS.map((b, i) => (
        <Bush key={`bush-${i}`} position={b.pos} color={b.color} />
      ))}

      {/* Grass tufts for ground detail */}
      {GRASS_TUFT_POSITIONS.map((pos, i) => (
        <GrassTuft key={`grass-${i}`} position={pos} />
      ))}

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[80, 32, 32]} />
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} fog={false} />
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
      color: '#7CB342',
      roughness: 0.9,
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
function ZoneMarker({ zone, lang }: { zone: ZoneConfig; lang: string }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      (ref.current.material as THREE.MeshBasicMaterial).opacity =
        0.15 + Math.sin(Date.now() * 0.002) * 0.05;
    }
  });

  return (
    <group position={zone.position}>
      <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[zone.size[0] / 2, 32]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.2} />
      </mesh>
      {/* Zone ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[zone.size[0] / 2 - 0.3, zone.size[0] / 2, 32]} />
        <meshBasicMaterial color={zone.color} transparent opacity={0.5} />
      </mesh>
      {/* Zone label */}
      <Text
        position={[0, 3, 0]}
        fontSize={1.2}
        color={zone.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {lang === 'zh' ? zone.label : zone.labelEn}
      </Text>
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

// ─── Fountain ───
function Fountain({ position }: { position: [number, number, number] }) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (waterRef.current) {
      waterRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group position={position}>
      {/* Base */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[2.5, 3, 0.6, 24]} />
        <meshToonMaterial color="#B0BEC5" />
      </mesh>
      {/* Inner wall */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[2.2, 2.2, 0.3, 24]} />
        <meshToonMaterial color="#90A4AE" />
      </mesh>
      {/* Water */}
      <mesh ref={waterRef} position={[0, 0.45, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.1, 24]} />
        <meshBasicMaterial color="#4FC3F7" transparent opacity={0.7} />
      </mesh>
      {/* Center pillar */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.25, 0.35, 1.8, 12]} />
        <meshToonMaterial color="#CFD8DC" />
      </mesh>
      {/* Top basin */}
      <mesh position={[0, 1.8, 0]}>
        <cylinderGeometry args={[0.8, 0.6, 0.3, 12]} />
        <meshToonMaterial color="#B0BEC5" />
      </mesh>
      {/* Water spout */}
      <WaterSpout />
    </group>
  );
}

function WaterSpout() {
  const ref = useRef<THREE.Points>(null);
  const count = 40;

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.3;
      arr[i * 3] = Math.cos(angle) * radius;
      arr[i * 3 + 1] = 2.0 + Math.random() * 0.5;
      arr[i * 3 + 2] = Math.sin(angle) * radius;
    }
    return arr;
  }, []);

  useFrame(() => {
    if (!ref.current) return;
    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] -= 0.02;
      if (pos[i * 3 + 1] < 1.0) {
        pos[i * 3 + 1] = 2.0 + Math.random() * 0.5;
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
      <pointsMaterial color="#4FC3F7" size={0.08} transparent opacity={0.6} />
    </points>
  );
}

// ─── Building ───
function Building({
  position, scale, color, label, labelEn, lang
}: {
  position: [number, number, number];
  scale: [number, number, number];
  color: string;
  label: string;
  labelEn: string;
  lang: string;
}) {
  return (
    <group position={position}>
      <mesh position={[0, scale[1] / 2, 0]} castShadow>
        <boxGeometry args={scale} />
        <meshToonMaterial color={color} />
      </mesh>
      {/* Windows */}
      {Array.from({ length: Math.floor(scale[0] / 2) }).map((_, i) => (
        Array.from({ length: Math.floor(scale[1] / 1.5) }).map((_, j) => (
          <mesh
            key={`${i}-${j}`}
            position={[
              -scale[0] / 2 + 1 + i * 2,
              1 + j * 1.5,
              scale[2] / 2 + 0.01
            ]}
          >
            <planeGeometry args={[0.8, 1]} />
            <meshBasicMaterial color="#E3F2FD" transparent opacity={0.8} />
          </mesh>
        ))
      ))}
      {/* Label */}
      <Text
        position={[0, scale[1] + 0.5, scale[2] / 2 + 0.1]}
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

// ─── Pond — animated water with stones around ───
function Pond({ position, radius = 2.5 }: { position: [number, number, number]; radius?: number }) {
  const waterRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (waterRef.current) {
      const t = clock.getElapsedTime();
      waterRef.current.scale.x = 1 + Math.sin(t * 1.5) * 0.01;
      waterRef.current.scale.z = 1 + Math.cos(t * 1.3) * 0.01;
    }
  });

  return (
    <group position={position}>
      {/* Pond basin — dark ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <ringGeometry args={[radius * 0.95, radius * 1.15, 24]} />
        <meshStandardMaterial color="#6D4C41" roughness={1} />
      </mesh>
      {/* Water surface */}
      <mesh ref={waterRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[radius, 32]} />
        <meshStandardMaterial
          color="#4FC3F7"
          roughness={0.3}
          metalness={0.2}
          transparent
          opacity={0.85}
        />
      </mesh>
      {/* Highlight ring for water sheen */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.055, 0]}>
        <ringGeometry args={[radius * 0.5, radius * 0.7, 32]} />
        <meshBasicMaterial color="#81D4FA" transparent opacity={0.25} />
      </mesh>
      {/* Lily pads */}
      {[0, 2.1, 4.3].map((angle, i) => (
        <group key={i} position={[Math.cos(angle) * radius * 0.55, 0.08, Math.sin(angle) * radius * 0.55]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.35, 10]} />
            <meshToonMaterial color="#388E3C" />
          </mesh>
          {i === 0 && (
            <mesh position={[0, 0.05, 0]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshToonMaterial color="#F8BBD0" />
            </mesh>
          )}
        </group>
      ))}
      {/* Edge stones */}
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={`stone-${i}`}
            position={[Math.cos(a) * radius * 1.1, 0.1, Math.sin(a) * radius * 1.1]}
            rotation={[0, a, 0]}
            castShadow
          >
            <dodecahedronGeometry args={[0.25, 0]} />
            <meshToonMaterial color="#78909C" />
          </mesh>
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
