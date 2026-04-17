import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { AvatarConfig } from '@/lib/plaza';

const DEFAULT_CONFIG: AvatarConfig = {
  bodyColor: '#6C63FF',
  skinColor: '#FFD5B8',
  hairColor: '#4A3728',
  hairStyle: 0,
  shirtColor: '#6C63FF',
  pantsColor: '#2D2D2D',
  accessory: 0,
  expression: 0,
};

interface AvatarProps {
  config?: AvatarConfig;
  isMoving?: boolean;
  onClick?: () => void;
}

export default function Avatar({ config = DEFAULT_CONFIG, isMoving = false, onClick }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bounceRef = useRef(0);

  const c = { ...DEFAULT_CONFIG, ...config };

  // Idle bounce animation
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    bounceRef.current += delta * (isMoving ? 8 : 2);
    const bounce = Math.sin(bounceRef.current) * (isMoving ? 0.08 : 0.03);
    groupRef.current.position.y = bounce;

    // Slight sway when moving
    if (isMoving) {
      groupRef.current.rotation.z = Math.sin(bounceRef.current * 0.5) * 0.05;
    } else {
      groupRef.current.rotation.z *= 0.95;
    }
  });

  const skinMat = useMemo(() => new THREE.MeshToonMaterial({ color: c.skinColor }), [c.skinColor]);
  const shirtMat = useMemo(() => new THREE.MeshToonMaterial({ color: c.shirtColor }), [c.shirtColor]);
  const pantsMat = useMemo(() => new THREE.MeshToonMaterial({ color: c.pantsColor }), [c.pantsColor]);
  const hairMat = useMemo(() => new THREE.MeshToonMaterial({ color: c.hairColor }), [c.hairColor]);

  return (
    <group ref={groupRef} onClick={onClick} scale={[0.5, 0.5, 0.5]}>
      {/* Head */}
      <mesh position={[0, 1.6, 0]} material={skinMat} castShadow>
        <sphereGeometry args={[0.35, 16, 16]} />
      </mesh>

      {/* Eyes */}
      <mesh position={[-0.1, 1.65, 0.3]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#2D2D2D" />
      </mesh>
      <mesh position={[0.1, 1.65, 0.3]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color="#2D2D2D" />
      </mesh>

      {/* Eye highlights */}
      <mesh position={[-0.08, 1.67, 0.34]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <mesh position={[0.12, 1.67, 0.34]}>
        <sphereGeometry args={[0.015, 6, 6]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>

      {/* Mouth expressions */}
      {c.expression === 0 && (
        // Smile
        <mesh position={[0, 1.5, 0.32]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.06, 0.015, 8, 12, Math.PI]} />
          <meshBasicMaterial color="#E8857A" />
        </mesh>
      )}
      {c.expression === 1 && (
        // Open smile
        <mesh position={[0, 1.49, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#E8857A" />
        </mesh>
      )}
      {c.expression === 2 && (
        // Neutral
        <mesh position={[0, 1.5, 0.33]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.01, 8]} />
          <meshBasicMaterial color="#D4736A" />
        </mesh>
      )}

      {/* Blush */}
      <mesh position={[-0.2, 1.55, 0.25]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#FFB6B6" transparent opacity={0.4} />
      </mesh>
      <mesh position={[0.2, 1.55, 0.25]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#FFB6B6" transparent opacity={0.4} />
      </mesh>

      {/* Hair styles */}
      <HairStyle style={c.hairStyle} material={hairMat} />

      {/* Body / Shirt */}
      <mesh position={[0, 1.0, 0]} material={shirtMat} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.6, 12]} />
      </mesh>

      {/* Arms */}
      <mesh position={[-0.32, 1.0, 0]} material={shirtMat} castShadow>
        <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
      </mesh>
      <mesh position={[0.32, 1.0, 0]} material={shirtMat} castShadow>
        <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
      </mesh>

      {/* Hands */}
      <mesh position={[-0.32, 0.72, 0]} material={skinMat}>
        <sphereGeometry args={[0.06, 8, 8]} />
      </mesh>
      <mesh position={[0.32, 0.72, 0]} material={skinMat}>
        <sphereGeometry args={[0.06, 8, 8]} />
      </mesh>

      {/* Pants / Legs */}
      <mesh position={[-0.1, 0.45, 0]} material={pantsMat} castShadow>
        <capsuleGeometry args={[0.09, 0.3, 4, 8]} />
      </mesh>
      <mesh position={[0.1, 0.45, 0]} material={pantsMat} castShadow>
        <capsuleGeometry args={[0.09, 0.3, 4, 8]} />
      </mesh>

      {/* Shoes */}
      <mesh position={[-0.1, 0.22, 0.04]}>
        <boxGeometry args={[0.12, 0.06, 0.18]} />
        <meshToonMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.1, 0.22, 0.04]}>
        <boxGeometry args={[0.12, 0.06, 0.18]} />
        <meshToonMaterial color="#1a1a1a" />
      </mesh>

      {/* Accessory */}
      <Accessory type={c.accessory} />

      {/* Shadow blob */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.25, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
    </group>
  );
}

function HairStyle({ style, material }: { style: number; material: THREE.Material }) {
  switch (style) {
    case 0: // Short messy
      return (
        <group>
          <mesh position={[0, 1.82, -0.05]} material={material}>
            <sphereGeometry args={[0.33, 12, 12]} />
          </mesh>
          <mesh position={[0, 1.95, 0.05]} material={material}>
            <sphereGeometry args={[0.15, 8, 8]} />
          </mesh>
        </group>
      );
    case 1: // Long straight
      return (
        <group>
          <mesh position={[0, 1.8, -0.05]} material={material}>
            <sphereGeometry args={[0.36, 12, 12]} />
          </mesh>
          <mesh position={[0, 1.5, -0.18]} material={material}>
            <boxGeometry args={[0.55, 0.6, 0.15]} />
          </mesh>
        </group>
      );
    case 2: // Spiky
      return (
        <group>
          <mesh position={[0, 1.85, 0]} material={material}>
            <coneGeometry args={[0.25, 0.3, 8]} />
          </mesh>
          <mesh position={[-0.15, 1.85, 0]} material={material} rotation={[0, 0, 0.3]}>
            <coneGeometry args={[0.1, 0.2, 6]} />
          </mesh>
          <mesh position={[0.15, 1.85, 0]} material={material} rotation={[0, 0, -0.3]}>
            <coneGeometry args={[0.1, 0.2, 6]} />
          </mesh>
        </group>
      );
    case 3: // Bun
      return (
        <group>
          <mesh position={[0, 1.82, -0.05]} material={material}>
            <sphereGeometry args={[0.33, 12, 12]} />
          </mesh>
          <mesh position={[0, 2.05, -0.1]} material={material}>
            <sphereGeometry args={[0.15, 10, 10]} />
          </mesh>
        </group>
      );
    case 4: // Curly/Afro
      return (
        <mesh position={[0, 1.8, 0]} material={material}>
          <sphereGeometry args={[0.42, 12, 12]} />
        </mesh>
      );
    case 5: // Side part
      return (
        <group>
          <mesh position={[0, 1.82, -0.02]} material={material}>
            <sphereGeometry args={[0.34, 12, 12]} />
          </mesh>
          <mesh position={[0.2, 1.8, 0.1]} material={material}>
            <sphereGeometry args={[0.15, 8, 8]} />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}

function Accessory({ type }: { type: number }) {
  switch (type) {
    case 1: // Glasses
      return (
        <group position={[0, 1.65, 0.3]}>
          <mesh position={[-0.1, 0, 0.02]}>
            <torusGeometry args={[0.06, 0.01, 8, 16]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          <mesh position={[0.1, 0, 0.02]}>
            <torusGeometry args={[0.06, 0.01, 8, 16]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
          <mesh position={[0, 0, 0.02]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.005, 0.08, 4]} />
            <meshBasicMaterial color="#333333" />
          </mesh>
        </group>
      );
    case 2: // Cap
      return (
        <group position={[0, 1.85, 0.05]}>
          <mesh>
            <cylinderGeometry args={[0.3, 0.32, 0.15, 16]} />
            <meshToonMaterial color="#FF6B6B" />
          </mesh>
          <mesh position={[0, -0.05, 0.25]} rotation={[0.3, 0, 0]}>
            <boxGeometry args={[0.3, 0.03, 0.2]} />
            <meshToonMaterial color="#FF6B6B" />
          </mesh>
        </group>
      );
    case 3: // Headphones
      return (
        <group position={[0, 1.75, 0]}>
          <mesh position={[0, 0.15, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[0.3, 0.02, 8, 16, Math.PI]} />
            <meshToonMaterial color="#333333" />
          </mesh>
          <mesh position={[-0.3, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 12]} />
            <meshToonMaterial color="#444444" />
          </mesh>
          <mesh position={[0.3, 0, 0]}>
            <cylinderGeometry args={[0.07, 0.07, 0.05, 12]} />
            <meshToonMaterial color="#444444" />
          </mesh>
        </group>
      );
    case 4: // Bow
      return (
        <group position={[0.2, 1.9, 0.1]}>
          <mesh position={[-0.05, 0, 0]} rotation={[0, 0, 0.3]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshToonMaterial color="#FF69B4" />
          </mesh>
          <mesh position={[0.05, 0, 0]} rotation={[0, 0, -0.3]}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshToonMaterial color="#FF69B4" />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshToonMaterial color="#FF1493" />
          </mesh>
        </group>
      );
    default:
      return null;
  }
}
