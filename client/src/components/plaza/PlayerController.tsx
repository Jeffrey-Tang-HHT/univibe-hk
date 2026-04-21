import { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import Avatar3D from './Avatar3D';
import { resolveCollision } from './colliders';
import type { AvatarConfig } from '@/lib/plaza';

interface PlayerControllerProps {
  config: AvatarConfig;
  onPositionUpdate: (x: number, y: number, z: number, rotation: number, zone: string, isMoving: boolean) => void;
  speed?: number;
  touchDirRef?: React.MutableRefObject<{ x: number; z: number }>;
}

const ZONE_MAP = [
  { name: 'center', cx: 0, cz: 0, radius: 8 },
  { name: 'study', cx: -18, cz: -15, radius: 9 },
  { name: 'social', cx: 18, cz: -15, radius: 9 },
  { name: 'dating', cx: -18, cz: 18, radius: 9 },
  { name: 'cafe', cx: 18, cz: 18, radius: 9 },
];

function getZone(x: number, z: number): string {
  for (const zone of ZONE_MAP) {
    const dx = x - zone.cx;
    const dz = z - zone.cz;
    if (Math.sqrt(dx * dx + dz * dz) < zone.radius) return zone.name;
  }
  return 'center';
}

export default function PlayerController({ config, onPositionUpdate, speed = 8, touchDirRef }: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const velocityRef = useRef(new THREE.Vector3());
  const targetRotRef = useRef(0);
  const currentRotRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const { camera } = useThree();

  // isMoving is reactive state so Avatar3D re-renders and animates its limbs
  // whenever the player starts/stops. We only flip it when crossing the
  // threshold to avoid tearing through React state on every frame.
  const [isMoving, setIsMoving] = useState(false);
  const wasMovingRef = useRef(false);

  // Keyboard handlers
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
      e.preventDefault();
      keysRef.current.add(key);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysRef.current.delete(e.key.toLowerCase());
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    const keys = keysRef.current;
    const moveDir = new THREE.Vector3();

    // Keyboard direction (each unit vector)
    if (keys.has('w') || keys.has('arrowup')) moveDir.z -= 1;
    if (keys.has('s') || keys.has('arrowdown')) moveDir.z += 1;
    if (keys.has('a') || keys.has('arrowleft')) moveDir.x -= 1;
    if (keys.has('d') || keys.has('arrowright')) moveDir.x += 1;

    // Touch direction (analog, magnitude ≤ 1 from joystick)
    if (touchDirRef) {
      moveDir.x += touchDirRef.current.x;
      moveDir.z += touchDirRef.current.z;
    }

    const len = moveDir.length();
    const inputActive = len > 0.02;

    if (inputActive) {
      // Clamp magnitude to 1 (preserves analog joystick speed when len < 1)
      if (len > 1) moveDir.divideScalar(len);

      // Target rotation from movement direction
      targetRotRef.current = Math.atan2(moveDir.x, moveDir.z);

      // Apply movement into velocity, then into position (with collision).
      const vel = velocityRef.current;
      vel.lerp(moveDir.clone().multiplyScalar(speed), 0.15);

      const desiredX = groupRef.current.position.x + vel.x * delta;
      const desiredZ = groupRef.current.position.z + vel.z * delta;

      // Clamp to world bounds first (cheaper than collider test).
      const clampedX = Math.max(-45, Math.min(45, desiredX));
      const clampedZ = Math.max(-45, Math.min(45, desiredZ));

      // Resolve against the scene's colliders (buildings, fountain, trees, …).
      const { x: resolvedX, z: resolvedZ } = resolveCollision(clampedX, clampedZ);

      groupRef.current.position.x = resolvedX;
      groupRef.current.position.z = resolvedZ;
    } else {
      // Coast + friction when no input
      velocityRef.current.multiplyScalar(0.9);
      if (velocityRef.current.length() > 0.01) {
        const desiredX = groupRef.current.position.x + velocityRef.current.x * delta;
        const desiredZ = groupRef.current.position.z + velocityRef.current.z * delta;
        const clampedX = Math.max(-45, Math.min(45, desiredX));
        const clampedZ = Math.max(-45, Math.min(45, desiredZ));
        const { x: resolvedX, z: resolvedZ } = resolveCollision(clampedX, clampedZ);
        groupRef.current.position.x = resolvedX;
        groupRef.current.position.z = resolvedZ;
      }
    }

    // Smooth rotation
    currentRotRef.current = THREE.MathUtils.lerp(
      currentRotRef.current,
      targetRotRef.current,
      0.1
    );
    groupRef.current.rotation.y = currentRotRef.current;

    // Camera follow (third-person, slightly isometric)
    const playerPos = groupRef.current.position;
    const cameraOffset = new THREE.Vector3(0, 14, 14);
    const targetCameraPos = new THREE.Vector3(
      playerPos.x + cameraOffset.x,
      playerPos.y + cameraOffset.y,
      playerPos.z + cameraOffset.z
    );
    camera.position.lerp(targetCameraPos, 0.05);
    camera.lookAt(playerPos.x, playerPos.y + 1.2, playerPos.z);

    // ── Moving state for Avatar3D limb animation ──
    // True if the user is holding input OR the player is still gliding from
    // residual velocity. We flip React state only on threshold crossings.
    const effectivelyMoving = inputActive || velocityRef.current.length() > 0.1;
    if (effectivelyMoving !== wasMovingRef.current) {
      wasMovingRef.current = effectivelyMoving;
      setIsMoving(effectivelyMoving);
    }

    // Send position updates every 200ms
    const now = Date.now();
    if (now - lastUpdateRef.current > 200) {
      lastUpdateRef.current = now;
      const zone = getZone(playerPos.x, playerPos.z);
      onPositionUpdate(
        playerPos.x,
        playerPos.y,
        playerPos.z,
        currentRotRef.current,
        zone,
        effectivelyMoving
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 5]}>
      <Avatar3D config={config} isMoving={isMoving} />
    </group>
  );
}
