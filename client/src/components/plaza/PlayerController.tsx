import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import Avatar3D from './Avatar3D';
import type { AvatarConfig } from '@/lib/plaza';

interface PlayerControllerProps {
  config: AvatarConfig;
  onPositionUpdate: (x: number, y: number, z: number, rotation: number, zone: string, isMoving: boolean) => void;
  speed?: number;
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

export default function PlayerController({ config, onPositionUpdate, speed = 8 }: PlayerControllerProps) {
  const groupRef = useRef<THREE.Group>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const velocityRef = useRef(new THREE.Vector3());
  const targetRotRef = useRef(0);
  const currentRotRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const { camera } = useThree();

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

    // Movement direction
    if (keys.has('w') || keys.has('arrowup')) moveDir.z -= 1;
    if (keys.has('s') || keys.has('arrowdown')) moveDir.z += 1;
    if (keys.has('a') || keys.has('arrowleft')) moveDir.x -= 1;
    if (keys.has('d') || keys.has('arrowright')) moveDir.x += 1;

    const isMoving = moveDir.length() > 0;

    if (isMoving) {
      moveDir.normalize();

      // Calculate target rotation based on movement direction
      targetRotRef.current = Math.atan2(moveDir.x, moveDir.z);

      // Apply movement
      const vel = velocityRef.current;
      vel.lerp(moveDir.multiplyScalar(speed), 0.15);
      groupRef.current.position.x += vel.x * delta;
      groupRef.current.position.z += vel.z * delta;

      // Clamp to bounds
      groupRef.current.position.x = Math.max(-45, Math.min(45, groupRef.current.position.x));
      groupRef.current.position.z = Math.max(-45, Math.min(45, groupRef.current.position.z));
    } else {
      velocityRef.current.multiplyScalar(0.9);
      if (velocityRef.current.length() > 0.01) {
        groupRef.current.position.x += velocityRef.current.x * delta;
        groupRef.current.position.z += velocityRef.current.z * delta;
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
        isMoving || velocityRef.current.length() > 0.1
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 5]}>
      <Avatar3D config={config} isMoving={keysRef.current.size > 0} />
    </group>
  );
}
