import { useRef, useMemo, useState, useEffect } from 'react';
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

// ─── Emote system ───────────────────────────────────────────────
// An emote is a short scripted animation that overrides the walk-
// cycle for a fixed duration. Each emote receives the elapsed time
// since the emote started (0..duration) and writes target rotations
// for arms / legs / body. The base avatar then lerps toward those
// targets just like it does for walk.
//
// Adding a new emote: drop another entry into EMOTES below. Done.

export type EmoteName = 'wave' | 'dance' | 'clap' | 'bow' | 'cheer' | 'sit' | 'point';

interface EmotePose {
  // All in radians. Optional → leave at 0 / current.
  lArm?: number;          // left arm rotation.x (forward swing)
  rArm?: number;          // right arm rotation.x
  lArmZ?: number;         // left arm rotation.z (raise to side)
  rArmZ?: number;         // right arm rotation.z
  lLeg?: number;
  rLeg?: number;
  bodyTiltX?: number;     // group rotation.x (bow forward)
  bodyTiltZ?: number;     // group rotation.z (sway / lean)
  bodyY?: number;         // group position.y offset (sit / hop)
}

interface EmoteDef {
  durationMs: number;
  /** Returns the target pose at the given progress 0..1. */
  pose: (progress: number, elapsedSec: number) => EmotePose;
}

const EMOTES: Record<EmoteName, EmoteDef> = {
  wave: {
    durationMs: 2400,
    pose: (_p, t) => ({
      // Right arm raised straight up, swinging side-to-side at the shoulder.
      // Use rotation.z so the arm rotates *outward* about the body axis.
      rArmZ: -Math.PI / 1.6 + Math.sin(t * 6) * 0.35,
      rArm: 0,
      lArm: 0,
    }),
  },
  dance: {
    durationMs: 4000,
    pose: (_p, t) => ({
      // Both arms up at angles, alternating left/right hop, body sway.
      lArmZ: 0.9 + Math.sin(t * 8) * 0.25,
      rArmZ: -0.9 - Math.sin(t * 8) * 0.25,
      lArm: Math.sin(t * 6) * 0.15,
      rArm: -Math.sin(t * 6) * 0.15,
      bodyTiltZ: Math.sin(t * 8) * 0.08,
      bodyY: Math.abs(Math.sin(t * 8)) * 0.18,
      lLeg: Math.sin(t * 8) * 0.25,
      rLeg: -Math.sin(t * 8) * 0.25,
    }),
  },
  clap: {
    durationMs: 2200,
    pose: (_p, t) => {
      // Both arms forward (~ -π/2 about x). Hands meet then part.
      const meet = Math.abs(Math.sin(t * 6));
      return {
        lArm: -Math.PI / 2.2,
        rArm: -Math.PI / 2.2,
        lArmZ: 0.3 + meet * 0.25,
        rArmZ: -0.3 - meet * 0.25,
      };
    },
  },
  bow: {
    durationMs: 1800,
    pose: (p) => {
      // Tilt forward, hold, ease back. Triangular curve over progress.
      const tilt = p < 0.5 ? p * 2 : 1 - (p - 0.5) * 2;
      return {
        bodyTiltX: tilt * 0.6,
        lArm: -tilt * 0.4,
        rArm: -tilt * 0.4,
      };
    },
  },
  cheer: {
    durationMs: 2200,
    pose: (_p, t) => ({
      // Both arms shoot up; small bounce.
      lArmZ: 1.1 + Math.sin(t * 10) * 0.08,
      rArmZ: -1.1 - Math.sin(t * 10) * 0.08,
      bodyY: Math.abs(Math.sin(t * 4)) * 0.12,
    }),
  },
  sit: {
    durationMs: 3000,
    pose: () => ({
      // Lower body, swing legs forward (away from torso).
      bodyY: -0.35,
      lLeg: -Math.PI / 2.5,
      rLeg: -Math.PI / 2.5,
      lArm: -0.2,
      rArm: -0.2,
    }),
  },
  point: {
    durationMs: 2000,
    pose: () => ({
      // Right arm forward (-π/2 about x sends arm forward, since the arm
      // hangs down by default). Slight outward angle for personality.
      rArm: -Math.PI / 2,
      rArmZ: -0.15,
    }),
  },
};

/** Public helper if other components need durations (e.g. the EmoteBar
 *  cooldown indicator). Returns ms. */
export function getEmoteDuration(name: EmoteName): number {
  return EMOTES[name]?.durationMs ?? 2000;
}

interface AvatarProps {
  config?: AvatarConfig;
  isMoving?: boolean;
  onClick?: () => void;
  /** Active emote name. Pass null/undefined when no emote is playing. */
  emote?: EmoteName | null;
  /** Wall-clock ms when the emote started. Used to compute progress. */
  emoteStartMs?: number;
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

// ─── Reduced-motion mode ──────────────────────────────────────
// Some students get motion sickness from the bouncy walk cycle. When
// the OS-level `prefers-reduced-motion` flag is set, we:
//   • drop the body bounce to ~0,
//   • halve arm/leg swing,
//   • shorten emotes' visible bobbing (the pose still plays, but
//     anything driven by sin(t) inside an emote naturally has less
//     impact because the swings are halved across the board).
// The flag is read once via matchMedia and re-read on change events,
// so toggling the OS setting takes effect without a reload.
function usePrefersReducedMotion(): boolean {
  const [reduce, setReduce] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduce(e.matches);
    // Safari < 14 only supports addListener; modern browsers have addEventListener.
    if (mql.addEventListener) mql.addEventListener('change', onChange);
    else mql.addListener(onChange);
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange);
      else mql.removeListener(onChange);
    };
  }, []);
  return reduce;
}

export default function Avatar({
  config = DEFAULT_CONFIG,
  isMoving = false,
  onClick,
  emote = null,
  emoteStartMs = 0,
}: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftLegRef = useRef<THREE.Group>(null);
  const rightLegRef = useRef<THREE.Group>(null);
  // Shadow disc — sibling-style behaviour without actually lifting it
  // out of the avatar group. Each frame we counter the group's y so
  // the disc stays at world y ≈ 0.01 even during sit (group y = -0.35)
  // or cheer (group y > 0). Mat ref lets us also fade with body height.
  const shadowRef = useRef<THREE.Mesh>(null);
  const shadowMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Accessibility: respect the OS reduced-motion preference. Halves
  // walk amplitudes and zeroes the body bounce. Emotes still play
  // (they're communicative — the user opted in by tapping a button).
  const reduceMotion = usePrefersReducedMotion();
  const motionScale = reduceMotion ? 0.5 : 1;

  // Phase accumulator drives the walk cycle. We only advance it when moving
  // so the pose freezes on the last frame when stopping, then eases back
  // toward neutral via the lerp below.
  const phaseRef = useRef(0);
  const bounceRef = useRef(0);

  const c = { ...DEFAULT_CONFIG, ...config };

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // ── Emote takeover check ─────────────────────────────────────
    // When an emote is active and not yet expired, it overrides the
    // walk-cycle. The walk cycle runs unchanged otherwise.
    let emoteActive = false;
    let emotePose: EmotePose | null = null;
    if (emote && emoteStartMs > 0) {
      const def = EMOTES[emote];
      if (def) {
        const elapsedMs = Date.now() - emoteStartMs;
        if (elapsedMs >= 0 && elapsedMs <= def.durationMs) {
          emoteActive = true;
          const progress = elapsedMs / def.durationMs;
          emotePose = def.pose(progress, elapsedMs / 1000);
        }
      }
    }

    // ── Overall body bounce (vertical) ──
    bounceRef.current += delta * (isMoving ? 8 : 2);
    // motionScale = 0.5 when prefers-reduced-motion is set → halves bob.
    const baseBounce =
      Math.sin(bounceRef.current) * (isMoving ? 0.08 : 0.03) * motionScale;
    const targetY = (emotePose?.bodyY ?? 0) + (emoteActive ? 0 : baseBounce);
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y, targetY, Math.min(1, delta * 8),
    );

    // ── Body tilt / sway ──
    const targetTiltZ = emotePose?.bodyTiltZ ?? (isMoving ? Math.sin(bounceRef.current * 0.5) * 0.05 * motionScale : 0);
    const targetTiltX = emotePose?.bodyTiltX ?? 0;
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z, targetTiltZ, Math.min(1, delta * 6),
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x, targetTiltX, Math.min(1, delta * 6),
    );

    // ── Limb walk cycle / emote ──
    if (isMoving && !emoteActive) {
      phaseRef.current += delta * STEP_HZ * Math.PI * 2;
    }

    const walkPhase = phaseRef.current;
    // Reduced motion: halve the limb swings as well.
    const armAmp = (isMoving && !emoteActive) ? ARM_SWING * motionScale : 0;
    const legAmp = (isMoving && !emoteActive) ? LEG_SWING * motionScale : 0;

    // Walk targets
    const walkLArm = Math.sin(walkPhase) * armAmp;
    const walkRArm = -Math.sin(walkPhase) * armAmp;
    const walkLLeg = -Math.sin(walkPhase) * legAmp;
    const walkRLeg = Math.sin(walkPhase) * legAmp;

    // Emote targets (override walk when active). Default 0 for any axis
    // the emote doesn't drive, so unspecified limbs return to neutral.
    const targetLArmX = emoteActive ? (emotePose?.lArm ?? 0) : walkLArm;
    const targetRArmX = emoteActive ? (emotePose?.rArm ?? 0) : walkRArm;
    const targetLLegX = emoteActive ? (emotePose?.lLeg ?? 0) : walkLLeg;
    const targetRLegX = emoteActive ? (emotePose?.rLeg ?? 0) : walkRLeg;
    const targetLArmZ = emoteActive ? (emotePose?.lArmZ ?? 0) : 0;
    const targetRArmZ = emoteActive ? (emotePose?.rArmZ ?? 0) : 0;

    // Ease toward target. Slightly faster ease during emotes so the
    // pose actually arrives within the emote's duration.
    const ease = Math.min(1, delta * (emoteActive ? 9 : IDLE_DAMP));
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, targetLArmX, ease);
      leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, targetLArmZ, ease);
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, targetRArmX, ease);
      rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, targetRArmZ, ease);
    }
    if (leftLegRef.current)
      leftLegRef.current.rotation.x = THREE.MathUtils.lerp(leftLegRef.current.rotation.x, targetLLegX, ease);
    if (rightLegRef.current)
      rightLegRef.current.rotation.x = THREE.MathUtils.lerp(rightLegRef.current.rotation.x, targetRLegX, ease);

    // ── Shadow disc anchoring ──
    // The avatar group has scale 0.5, so a shadow at local y=0.01 would
    // sink into the ground when the group's y goes negative (sit emote)
    // or float visibly when the body lifts (cheer / jump). Counter the
    // group y in local space so the disc stays at world y ≈ 0.01.
    //   world_y = groupY + shadowY * 0.5  →  shadowY = (0.01 - groupY) / 0.5
    if (shadowRef.current) {
      const groupY = groupRef.current.position.y;
      shadowRef.current.position.y = (0.01 - groupY) * 2;

      // Subtle scale + fade with body height so the shadow reads as a
      // contact patch: larger/softer when the avatar is up off the
      // ground, smaller/darker when sitting on it. Clamps keep it
      // sensible for any future bigger emote ranges.
      const bodyHeight = Math.max(-0.5, Math.min(0.5, groupY));
      const scale = THREE.MathUtils.clamp(1 + bodyHeight * 0.6, 0.7, 1.4);
      shadowRef.current.scale.set(scale, scale, 1);
      if (shadowMatRef.current) {
        shadowMatRef.current.opacity = THREE.MathUtils.clamp(
          0.18 - bodyHeight * 0.15, 0.08, 0.22,
        );
      }
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

      {/* Shadow blob — local y is rewritten each frame so the disc
          stays glued to the ground even when the body lifts/sits. */}
      <mesh ref={shadowRef} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[0.25, 16]} />
        <meshBasicMaterial ref={shadowMatRef} color="#000000" transparent opacity={0.15} />
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
