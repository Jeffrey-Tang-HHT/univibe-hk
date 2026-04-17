import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

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
  return (
    <group>
      {/* Ground plane */}
      <Ground />

      {/* Zone markers */}
      {ZONES.map((zone, i) => (
        <ZoneMarker key={i} zone={zone} lang={lang} />
      ))}

      {/* Trees */}
      {TREE_POSITIONS.map((pos, i) => (
        <Tree key={`tree-${i}`} position={pos} scale={0.8 + Math.random() * 0.4} />
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

      {/* Ambient decoration */}
      <Pathway />

      {/* Sky dome */}
      <mesh>
        <sphereGeometry args={[80, 32, 32]} />
        <meshBasicMaterial color="#87CEEB" side={THREE.BackSide} />
      </mesh>

      {/* Clouds */}
      {CLOUD_POSITIONS.map((pos, i) => (
        <Cloud key={`cloud-${i}`} position={pos} />
      ))}
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
        font="/fonts/Inter-Bold.woff"
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

// ─── Pathway ───
function Pathway() {
  return (
    <group>
      {/* Main pathways (cross shape) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[3, 70]} />
        <meshStandardMaterial color="#D7CCC8" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[70, 3]} />
        <meshStandardMaterial color="#D7CCC8" roughness={1} />
      </mesh>
      {/* Diagonal paths */}
      <mesh rotation={[-Math.PI / 2, Math.PI / 4, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[2, 50]} />
        <meshStandardMaterial color="#BCAAA4" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, -Math.PI / 4, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[2, 50]} />
        <meshStandardMaterial color="#BCAAA4" roughness={1} />
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
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
      </mesh>
      <mesh position={[1.5, 0.3, 0]}>
        <sphereGeometry args={[1.5, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
      </mesh>
      <mesh position={[-1.2, 0.2, 0.5]}>
        <sphereGeometry args={[1.8, 8, 8]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.8} />
      </mesh>
    </group>
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
