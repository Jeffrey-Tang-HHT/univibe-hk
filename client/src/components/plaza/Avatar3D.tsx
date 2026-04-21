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

// ─────────────────────────────────────────────────────────────
// Walk-cycle tuning.
//
// A natural human gait is ~2 steps/second; each step alternates L/R so the
// sine wave frequency we want is STEP_HZ = ~2.2. We multiply by 2π to
// convert to rad/s for the sin() argument.
//
// swingAmp is how far each limb rotates (radians) at peak swing. Legs swing
// more than arms — looks more like walking than like miming.
// ─────────────────────────────────────────────────────────────
const STEP_HZ = 2.2;                       // ~2.2 full strides/sec
const ARM_SWING = 0.55;                    // ± radians
const LEG_SWING = 0.75;                    // ± radians
const IDLE_DAMP = 6;                       // how fast limbs return to neutral when stopping

export default function Avatar({ config = DEFAULT_CONFIG, isMoving = false, onClick }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);

  // Phase accumulator drives the walk cycle. We only advance it when moving
  // so the pose freezes on the last frame when stopping, then eases back
  // toward neutral via the lerp below.
  const phaseRef = useRef(0);
  const bounceRef = useRef(0);

  const c = { ...DEFAULT_CONFIG, ...config };

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // ── Overall body bounce (vertical) ──
    bounceRef.current += delta * (isMoving ? 8 : 2);
    const bounce = Math.sin(bounceRef.current) * (isMoving ? 0.08 : 0.03);
    groupRef.current.position.y = bounce;

    // ── Body sway when moving (subtle roll) ──
    if (isMoving) {
      groupRef.current.rotation.z = Math.sin(bounceRef.current * 0.5) * 0.05;
    } else {
      groupRef.current.rotation.z *= 0.95;
    }

    // ── Limb walk cycle ──
    // Advance phase only while walking so the pose is deterministic from the
    // *distance* walked rather than wall-clock time (feels more anchored).
    if (isMoving) {
      phaseRef.current += delta * STEP_HZ * Math.PI * 2;
    }

    // Target rotations. Arms and legs on the same side swing OPPOSITE to
    // each other (standard contralateral gait): left arm forward pairs with
    // right leg forward.
    const walkPhase = phaseRef.current;
    const armAmp = isMoving ? ARM_SWING : 0;
    const legAmp = isMoving ? LEG_SWING : 0;

    const targetLArm = Math.sin(walkPhase) * armAmp;
    const targetRArm = -Math.sin(walkPhase) * armAmp;
    const targetLLeg = -Math.sin(walkPhase) * legAmp;
    const targetRLeg = Math.sin(walkPhase) * legAmp;

    // Ease toward target. When stopping (amp=0), limbs settle to neutral.
    const ease = Math.min(1, delta * IDLE_DAMP);
    if (leftArmRef.current)
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, targetLArm, ease);
    if (rightArmRef.current)
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, targetRArm, ease);
    if (leftLegRef.current)
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, targetLLeg, ease);
    if (rightLegRef.current)
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, targetRLeg, ease);
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
        <mesh position={[0, 1.5, 0.32]} rotation={[0.3, 0, 0]}>
          <torusGeometry args={[0.06, 0.015, 8, 12, Math.PI]} />
          <meshBasicMaterial color="#E8857A" />
        </mesh>
      )}
      {c.expression === 1 && (
        <mesh position={[0, 1.49, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#E8857A" />
        </mesh>
      )}
      {c.expression === 2 && (
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

      {/* ─── Arms (rotate about the shoulder) ───
          Each arm is a group positioned at the shoulder joint (y=1.2, top
          of torso). The capsule and hand inside the group are offset
          downward so they swing around the shoulder rather than the elbow. */}
      <group ref={leftArmRef} position={[-0.32, 1.2, 0]}>
        <mesh position={[0, -0.2, 0]} material={shirtMat} castShadow>
          <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={skinMat}>
          <sphereGeometry args={[0.06, 8, 8]} />
        </mesh>
      </group>

      <group ref={rightArmRef} position={[0.32, 1.2, 0]}>
        <mesh position={[0, -0.2, 0]} material={shirtMat} castShadow>
          <capsuleGeometry args={[0.07, 0.35, 4, 8]} />
        </mesh>
        <mesh position={[0, -0.48, 0]} material={skinMat}>
          <sphereGeometry args={[0.06, 8, 8]} />
        </mesh>
      </group>

      {/* ─── Legs (rotate about the hip) ───
          Hip pivot at y=0.7 (where pants meet the torso). Leg capsule and
          shoe are offset downward from the pivot. */}
      <group ref={leftLegRef} position={[-0.1, 0.7, 0]}>
        <mesh position={[0, -0.25, 0]} material={pantsMat} castShadow>
          <capsuleGeometry args={[0.09, 0.3, 4, 8]} />
        </mesh>
        <mesh position={[0, -0.48, 0.04]}>
          <boxGeometry args={[0.12, 0.06, 0.18]} />
          <meshToonMaterial color="#1a1a1a" />
        </mesh>
      </group>

      <group ref={rightLegRef} position={[0.1, 0.7, 0]}>
        <mesh position={[0, -0.25, 0]} material={pantsMat} castShadow>
          <capsuleGeometry args={[0.09, 0.3, 4, 8]} />
        </mesh>
        <mesh position={[0, -0.48, 0.04]}>
          <boxGeometry args={[0.12, 0.06, 0.18]} />
          <meshToonMaterial color="#1a1a1a" />
        </mesh>
      </group>

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
