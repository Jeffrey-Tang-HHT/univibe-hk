import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

/**
 * Zone-specific landmarks that give each area of the plaza a distinct identity.
 * Placed at the same coordinates used by PlayerController's ZONE_MAP:
 *   study  (-18, -15)   social (18, -15)
 *   dating (-18,  18)   cafe   (18,  18)
 *
 * Each landmark is rotated to "face" the plaza centre (0,0) so players
 * approaching from the middle see the front of it.
 */

interface PosProps {
  position: [number, number, number];
}

// ─────────────────────────────────────────────────────────────
// STUDY ZONE — Wooden pergola with a study table, stack of books
// ─────────────────────────────────────────────────────────────
function StudyPergola() {
  return (
    <group>
      {/* 4 corner posts */}
      {[[-2, -2], [2, -2], [-2, 2], [2, 2]].map(([x, z], i) => (
        <mesh key={`post-${i}`} position={[x, 1.5, z]} castShadow>
          <boxGeometry args={[0.22, 3, 0.22]} />
          <meshToonMaterial color="#6B4423" />
        </mesh>
      ))}
      {/* Frame beams */}
      <mesh position={[0, 3.05, -2]} castShadow>
        <boxGeometry args={[4.4, 0.14, 0.14]} />
        <meshToonMaterial color="#5D3A1F" />
      </mesh>
      <mesh position={[0, 3.05, 2]} castShadow>
        <boxGeometry args={[4.4, 0.14, 0.14]} />
        <meshToonMaterial color="#5D3A1F" />
      </mesh>
      {/* Roof slats */}
      {Array.from({ length: 9 }).map((_, i) => (
        <mesh key={`slat-${i}`} position={[0, 3.15, -2 + i * 0.5]} castShadow>
          <boxGeometry args={[4.2, 0.06, 0.08]} />
          <meshToonMaterial color="#8B5A2B" />
        </mesh>
      ))}
      {/* Hanging vines */}
      <mesh position={[0, 2.75, -2]}>
        <boxGeometry args={[4, 0.4, 0.05]} />
        <meshToonMaterial color="#4CAF50" transparent opacity={0.85} />
      </mesh>

      {/* Study table */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[2.2, 0.08, 1.1]} />
        <meshToonMaterial color="#D2B48C" />
      </mesh>
      {[[-1, 0.45], [1, 0.45], [-1, -0.45], [1, -0.45]].map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, 0.28, z]}>
          <boxGeometry args={[0.08, 0.5, 0.08]} />
          <meshToonMaterial color="#8B5A2B" />
        </mesh>
      ))}
      {/* Stack of books */}
      <mesh position={[-0.55, 0.66, 0.1]} castShadow>
        <boxGeometry args={[0.5, 0.08, 0.38]} />
        <meshToonMaterial color="#E74C3C" />
      </mesh>
      <mesh position={[-0.55, 0.74, 0.1]} castShadow>
        <boxGeometry args={[0.48, 0.08, 0.36]} />
        <meshToonMaterial color="#3498DB" />
      </mesh>
      <mesh position={[-0.55, 0.82, 0.1]} castShadow>
        <boxGeometry args={[0.45, 0.08, 0.34]} />
        <meshToonMaterial color="#F39C12" />
      </mesh>
      {/* Open book */}
      <mesh position={[0.5, 0.6, 0]} rotation={[-0.15, 0, 0]} castShadow>
        <boxGeometry args={[0.65, 0.02, 0.5]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[0.5, 0.615, 0]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[0.01, 0.03, 0.5]} />
        <meshToonMaterial color="#555" />
      </mesh>
      {/* Bench seats either side */}
      <mesh position={[0, 0.35, -0.95]} castShadow>
        <boxGeometry args={[1.8, 0.06, 0.3]} />
        <meshToonMaterial color="#8B5A2B" />
      </mesh>
      <mesh position={[0, 0.35, 0.95]} castShadow>
        <boxGeometry args={[1.8, 0.06, 0.3]} />
        <meshToonMaterial color="#8B5A2B" />
      </mesh>
      {[[-0.8, -0.95], [0.8, -0.95], [-0.8, 0.95], [0.8, 0.95]].map(([x, z], i) => (
        <mesh key={`bleg-${i}`} position={[x, 0.17, z]}>
          <boxGeometry args={[0.06, 0.34, 0.06]} />
          <meshToonMaterial color="#5D3A1F" />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// SOCIAL ZONE — Circular stage with backdrop, mic, speakers, fairy lights
// ─────────────────────────────────────────────────────────────
function SocialStage() {
  const bannerRef = useRef<THREE.Mesh>(null);
  const bulbsRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (bannerRef.current) {
      bannerRef.current.rotation.z = Math.sin(t * 1.2) * 0.04;
    }
    if (bulbsRef.current) {
      // subtle twinkle
      bulbsRef.current.children.forEach((child, i) => {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.7 + Math.sin(t * 3 + i) * 0.3;
      });
    }
  });

  const bulbColors = ['#FF5252', '#FFEB3B', '#4CAF50', '#2196F3', '#E040FB', '#FF9800', '#00E5FF', '#FFEB3B'];

  return (
    <group>
      {/* Stage base */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[2.6, 2.9, 0.4, 24]} />
        <meshToonMaterial color="#AD1457" />
      </mesh>
      <mesh position={[0, 0.42, 0]} receiveShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.04, 24]} />
        <meshToonMaterial color="#FCE4EC" />
      </mesh>
      {/* Backdrop wall */}
      <mesh position={[0, 1.8, -2.2]} castShadow>
        <boxGeometry args={[3.4, 3.2, 0.2]} />
        <meshToonMaterial color="#6A1B9A" />
      </mesh>
      {/* Banner on backdrop */}
      <mesh ref={bannerRef} position={[0, 2.4, -2.07]}>
        <planeGeometry args={[2.6, 0.9]} />
        <meshBasicMaterial color="#FFD54F" />
      </mesh>
      {/* Banner stripes */}
      <mesh position={[0, 2.7, -2.06]}>
        <planeGeometry args={[2.4, 0.12]} />
        <meshBasicMaterial color="#F57C00" />
      </mesh>
      <mesh position={[0, 2.15, -2.06]}>
        <planeGeometry args={[2.4, 0.12]} />
        <meshBasicMaterial color="#F57C00" />
      </mesh>

      {/* Microphone stand */}
      <mesh position={[0, 0.45, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 12]} />
        <meshToonMaterial color="#263238" />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 1.0, 8]} />
        <meshToonMaterial color="#455A64" />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.11, 12, 12]} />
        <meshToonMaterial color="#1A1A1A" />
      </mesh>

      {/* Speakers */}
      {[-2.2, 2.2].map((x, i) => (
        <group key={`spk-${i}`} position={[x, 0.5, 0.5]}>
          <mesh castShadow>
            <boxGeometry args={[0.55, 1, 0.45]} />
            <meshToonMaterial color="#1A1A1A" />
          </mesh>
          <mesh position={[0, 0.2, 0.23]}>
            <circleGeometry args={[0.15, 18]} />
            <meshBasicMaterial color="#616161" />
          </mesh>
          <mesh position={[0, -0.2, 0.23]}>
            <circleGeometry args={[0.1, 18]} />
            <meshBasicMaterial color="#424242" />
          </mesh>
        </group>
      ))}

      {/* String-light poles */}
      <mesh position={[-3.2, 1.9, 2.2]}>
        <cylinderGeometry args={[0.05, 0.05, 3.8, 8]} />
        <meshToonMaterial color="#555" />
      </mesh>
      <mesh position={[3.2, 1.9, 2.2]}>
        <cylinderGeometry args={[0.05, 0.05, 3.8, 8]} />
        <meshToonMaterial color="#555" />
      </mesh>
      {/* Hanging bulbs along a sag curve */}
      <group ref={bulbsRef}>
        {Array.from({ length: 8 }).map((_, i) => {
          const t = i / 7;
          const x = -3.2 + t * 6.4;
          const y = 3.7 - 0.5 * Math.sin(t * Math.PI);
          return (
            <mesh key={`bulb-${i}`} position={[x, y, 2.2]}>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshBasicMaterial color={bulbColors[i]} transparent opacity={0.9} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// DATING CORNER — Rose arch with floating heart and swing bench
// ─────────────────────────────────────────────────────────────
function DatingArch() {
  const heartRef = useRef<THREE.Group>(null);
  const swingRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (heartRef.current) {
      heartRef.current.position.y = 4.3 + Math.sin(t * 2) * 0.1;
      heartRef.current.rotation.y += 0.01;
    }
    if (swingRef.current) {
      swingRef.current.rotation.x = Math.sin(t * 0.8) * 0.1;
    }
  });

  return (
    <group>
      {/* Arch posts */}
      <mesh position={[-1.9, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 3.6, 12]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[1.9, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.2, 3.6, 12]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      {/* Arch top — half torus */}
      <mesh position={[0, 3.6, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[1.9, 0.15, 12, 22, Math.PI]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      {/* Roses around arch */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 15) * Math.PI;
        const r = 1.9 + (i % 2 === 0 ? 0 : 0.15);
        const pink = i % 3 === 0 ? '#F06292' : i % 3 === 1 ? '#EC407A' : '#FF80AB';
        return (
          <mesh key={`rose-${i}`} position={[Math.cos(angle) * r, 3.6 + Math.sin(angle) * r, 0]}>
            <sphereGeometry args={[0.17, 8, 8]} />
            <meshToonMaterial color={pink} />
          </mesh>
        );
      })}
      {/* Green leaves interspersed */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = ((i + 0.3) / 12) * Math.PI;
        return (
          <mesh
            key={`leaf-${i}`}
            position={[Math.cos(angle) * 1.85, 3.6 + Math.sin(angle) * 1.85, 0.18]}
          >
            <sphereGeometry args={[0.11, 6, 6]} />
            <meshToonMaterial color={i % 2 ? '#66BB6A' : '#43A047'} />
          </mesh>
        );
      })}

      {/* Floating heart */}
      <group ref={heartRef} position={[0, 4.3, 0]}>
        <mesh position={[-0.22, 0.1, 0]} castShadow>
          <sphereGeometry args={[0.3, 14, 14]} />
          <meshToonMaterial color="#FF1744" />
        </mesh>
        <mesh position={[0.22, 0.1, 0]} castShadow>
          <sphereGeometry args={[0.3, 14, 14]} />
          <meshToonMaterial color="#FF1744" />
        </mesh>
        <mesh position={[0, -0.15, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.42, 0.42, 0.42]} />
          <meshToonMaterial color="#FF1744" />
        </mesh>
      </group>

      {/* Swing bench hanging from arch */}
      <group ref={swingRef} position={[0, 3.45, 0]}>
        {/* Ropes */}
        <mesh position={[-0.7, -1.4, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 2.8, 6]} />
          <meshToonMaterial color="#6D4C41" />
        </mesh>
        <mesh position={[0.7, -1.4, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 2.8, 6]} />
          <meshToonMaterial color="#6D4C41" />
        </mesh>
        {/* Seat */}
        <mesh position={[0, -2.85, 0]} castShadow>
          <boxGeometry args={[1.7, 0.1, 0.45]} />
          <meshToonMaterial color="#8D6E63" />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, -2.55, -0.2]}>
          <boxGeometry args={[1.7, 0.5, 0.06]} />
          <meshToonMaterial color="#8D6E63" />
        </mesh>
      </group>

      {/* Flanking rose bushes */}
      <RoseBush position={[-2.8, 0, 0.9]} />
      <RoseBush position={[2.8, 0, 0.9]} />
      <RoseBush position={[-3.2, 0, -0.8]} />
      <RoseBush position={[3.2, 0, -0.8]} />
    </group>
  );
}

function RoseBush({ position }: PosProps) {
  return (
    <group position={position}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.55, 10, 10]} />
        <meshToonMaterial color="#2E7D32" />
      </mesh>
      <mesh position={[0.28, 0.55, 0.12]} castShadow>
        <sphereGeometry args={[0.13, 8, 8]} />
        <meshToonMaterial color="#EC407A" />
      </mesh>
      <mesh position={[-0.22, 0.62, -0.15]} castShadow>
        <sphereGeometry args={[0.11, 8, 8]} />
        <meshToonMaterial color="#F06292" />
      </mesh>
      <mesh position={[0.1, 0.58, -0.28]} castShadow>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshToonMaterial color="#EC407A" />
      </mesh>
      <mesh position={[-0.15, 0.5, 0.25]} castShadow>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshToonMaterial color="#FF80AB" />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// CAFÉ — Coffee kiosk with striped awning + outdoor tables & umbrellas
// ─────────────────────────────────────────────────────────────
function CafeKiosk() {
  const steam1 = useRef<THREE.Mesh>(null);
  const steam2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    [steam1, steam2].forEach((ref, i) => {
      if (!ref.current) return;
      const phase = (t * 0.4 + i * 0.3) % 1;
      ref.current.position.y = 1.35 + phase * 0.8;
      (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.5 - phase * 0.45;
      ref.current.scale.setScalar(0.7 + phase * 0.6);
    });
  });

  return (
    <group>
      {/* Kiosk main body */}
      <mesh position={[0, 0.9, -1.1]} castShadow>
        <boxGeometry args={[3, 1.8, 1.5]} />
        <meshToonMaterial color="#795548" />
      </mesh>
      {/* Darker wood trim */}
      <mesh position={[0, 0.1, -1.1]}>
        <boxGeometry args={[3.05, 0.2, 1.55]} />
        <meshToonMaterial color="#4E342E" />
      </mesh>
      {/* Striped awning — 3 layers for stripe effect */}
      <mesh position={[0, 2.0, -1.1]} rotation={[0.15, 0, 0]} castShadow>
        <boxGeometry args={[3.4, 0.06, 1.8]} />
        <meshToonMaterial color="#D32F2F" />
      </mesh>
      <mesh position={[0, 2.06, -0.85]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[3.42, 0.07, 1.3]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[0, 2.12, -0.58]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[3.4, 0.06, 0.8]} />
        <meshToonMaterial color="#D32F2F" />
      </mesh>
      {/* Awning pole supports */}
      <mesh position={[-1.4, 2.1, -0.3]} rotation={[0, 0, -0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
        <meshToonMaterial color="#555" />
      </mesh>
      <mesh position={[1.4, 2.1, -0.3]} rotation={[0, 0, 0.1]}>
        <cylinderGeometry args={[0.04, 0.04, 0.8, 6]} />
        <meshToonMaterial color="#555" />
      </mesh>
      {/* Counter (opening) */}
      <mesh position={[0, 1.2, -0.3]} castShadow>
        <boxGeometry args={[2.8, 0.1, 0.5]} />
        <meshToonMaterial color="#3E2723" />
      </mesh>
      {/* Menu board */}
      <mesh position={[0, 1.5, -1.84]}>
        <planeGeometry args={[2.0, 0.8]} />
        <meshBasicMaterial color="#212121" />
      </mesh>
      {/* Menu items (yellow blocks) */}
      <mesh position={[-0.6, 1.65, -1.83]}>
        <planeGeometry args={[0.6, 0.08]} />
        <meshBasicMaterial color="#FFE082" />
      </mesh>
      <mesh position={[-0.6, 1.5, -1.83]}>
        <planeGeometry args={[0.5, 0.06]} />
        <meshBasicMaterial color="#FFE082" />
      </mesh>
      <mesh position={[-0.6, 1.36, -1.83]}>
        <planeGeometry args={[0.55, 0.06]} />
        <meshBasicMaterial color="#FFE082" />
      </mesh>
      <mesh position={[0.5, 1.65, -1.83]}>
        <planeGeometry args={[0.5, 0.08]} />
        <meshBasicMaterial color="#FF8A65" />
      </mesh>
      <mesh position={[0.5, 1.5, -1.83]}>
        <planeGeometry args={[0.45, 0.06]} />
        <meshBasicMaterial color="#FFE082" />
      </mesh>

      {/* Coffee cup + steam (2 cups) */}
      <group position={[-0.9, 1.25, -0.3]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.08, 0.18, 14]} />
          <meshToonMaterial color="#FAFAFA" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 14]} />
          <meshToonMaterial color="#6F4E37" />
        </mesh>
        <mesh ref={steam1} position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.5} />
        </mesh>
      </group>
      <group position={[0.8, 1.25, -0.3]}>
        <mesh>
          <cylinderGeometry args={[0.1, 0.08, 0.18, 14]} />
          <meshToonMaterial color="#FFCCBC" />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.02, 14]} />
          <meshToonMaterial color="#8D6E63" />
        </mesh>
        <mesh ref={steam2} position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.4} />
        </mesh>
      </group>

      {/* Outdoor tables with umbrellas */}
      <CafeTable position={[-2.2, 0, 1.8]} umbrellaColor="#D32F2F" />
      <CafeTable position={[2.2, 0, 1.8]} umbrellaColor="#FBC02D" />
      <CafeTable position={[0, 0, 3]} umbrellaColor="#5D4037" />
    </group>
  );
}

function CafeTable({ position, umbrellaColor }: PosProps & { umbrellaColor: string }) {
  return (
    <group position={position}>
      {/* Table top */}
      <mesh position={[0, 0.72, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.05, 18]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.08, 14]} />
        <meshToonMaterial color="#616161" />
      </mesh>

      {/* Umbrella pole */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 2.1, 6]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      {/* Umbrella canopy — 6-gore cone */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <coneGeometry args={[1.3, 0.55, 12]} />
        <meshToonMaterial color={umbrellaColor} />
      </mesh>
      <mesh position={[0, 2.78, 0]}>
        <sphereGeometry args={[0.06, 10, 10]} />
        <meshToonMaterial color="#FFD54F" />
      </mesh>

      {/* Two chairs */}
      <CafeChair position={[0.92, 0, 0]} rotation={-Math.PI / 2} />
      <CafeChair position={[-0.92, 0, 0]} rotation={Math.PI / 2} />
    </group>
  );
}

function CafeChair({ position, rotation = 0 }: PosProps & { rotation?: number }) {
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh position={[0, 0.42, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 14]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.42, 6]} />
        <meshToonMaterial color="#757575" />
      </mesh>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.06, 12]} />
        <meshToonMaterial color="#616161" />
      </mesh>
      {/* Backrest */}
      <mesh position={[0, 0.68, -0.18]}>
        <boxGeometry args={[0.38, 0.32, 0.04]} />
        <meshToonMaterial color="#FAFAFA" />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Flower patches — decorative grass-level colour pops
// ─────────────────────────────────────────────────────────────
function FlowerPatch({ position, color = '#FFEB3B' }: PosProps & { color?: string }) {
  return (
    <group position={position}>
      {[[0, 0], [0.3, 0.2], [-0.25, 0.15], [0.1, -0.25], [-0.2, -0.1]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Stem */}
          <mesh position={[0, 0.15, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.3, 4]} />
            <meshToonMaterial color="#388E3C" />
          </mesh>
          {/* Flower head */}
          <mesh position={[0, 0.33, 0]}>
            <sphereGeometry args={[0.08, 6, 6]} />
            <meshToonMaterial color={color} />
          </mesh>
          {/* Centre */}
          <mesh position={[0, 0.33, 0.03]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshToonMaterial color="#FF9800" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Main export: places every landmark + flowers at correct positions
// Rotations face each zone's "front" toward the plaza centre (0,0).
// ─────────────────────────────────────────────────────────────
export default function ZoneLandmarks() {
  return (
    <group>
      {/* Study Zone — at (-18, -15), facing centre (SE) */}
      <group position={[-18, 0, -15]} rotation={[0, Math.atan2(18, -15), 0]}>
        <StudyPergola />
      </group>

      {/* Social Zone — at (18, -15), facing centre (SW) */}
      <group position={[18, 0, -15]} rotation={[0, Math.atan2(-18, -15), 0]}>
        <SocialStage />
      </group>

      {/* Dating Corner — at (-18, 18), facing centre (NE) */}
      <group position={[-18, 0, 18]} rotation={[0, Math.atan2(18, 15), 0]}>
        <DatingArch />
      </group>

      {/* Café — at (18, 18), facing centre (NW) */}
      <group position={[18, 0, 18]} rotation={[0, Math.atan2(-18, 15), 0]}>
        <CafeKiosk />
      </group>

      {/* Flower patches scattered around the plaza */}
      <FlowerPatch position={[-6, 0, 2]} color="#FFEB3B" />
      <FlowerPatch position={[6, 0, -2]} color="#E91E63" />
      <FlowerPatch position={[-4, 0, -6]} color="#FFFFFF" />
      <FlowerPatch position={[4, 0, 6]} color="#FF9800" />
      <FlowerPatch position={[-10, 0, 0]} color="#9C27B0" />
      <FlowerPatch position={[10, 0, 0]} color="#FFEB3B" />
      <FlowerPatch position={[0, 0, -12]} color="#E91E63" />
      <FlowerPatch position={[0, 0, 12]} color="#FFFFFF" />
      <FlowerPatch position={[-24, 0, 0]} color="#FF5722" />
      <FlowerPatch position={[24, 0, 0]} color="#03A9F4" />
    </group>
  );
}
