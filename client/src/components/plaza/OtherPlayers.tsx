import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import Avatar3D from './Avatar3D';
import type { PlazaPlayer, PlazaBubble } from '@/lib/plaza';

interface OtherPlayersProps {
  players: PlazaPlayer[];
  bubbles: PlazaBubble[];
  onPlayerClick?: (player: PlazaPlayer) => void;
}

export default function OtherPlayers({ players, bubbles, onPlayerClick }: OtherPlayersProps) {
  return (
    <group>
      {players.filter(p => !p.is_me).map(player => (
        <RemotePlayer
          key={player.id}
          player={player}
          bubble={bubbles.find(b => b.user_id === player.id)}
          onClick={() => onPlayerClick?.(player)}
        />
      ))}
    </group>
  );
}

function RemotePlayer({
  player,
  bubble,
  onClick,
}: {
  player: PlazaPlayer;
  bubble?: PlazaBubble;
  onClick?: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3(player.x, 0, player.z));

  // Update target position when player data changes
  targetPos.current.set(player.x, 0, player.z);

  useFrame(() => {
    if (!groupRef.current) return;

    // Smooth interpolation to target position
    groupRef.current.position.lerp(targetPos.current, 0.1);

    // Smooth rotation
    const currentRot = groupRef.current.rotation.y;
    const targetRot = player.rotation;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(currentRot, targetRot, 0.1);
  });

  return (
    <group ref={groupRef} position={[player.x, 0, player.z]}>
      <Avatar3D
        config={player.avatar_config}
        isMoving={player.is_moving}
        onClick={onClick}
      />

      {/* Name tag */}
      <Billboard position={[0, 1.8, 0]}>
        {/* Background */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[Math.max(1.5, player.display_name.length * 0.15 + 0.4), 0.35]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.5} />
        </mesh>
        <Text
          fontSize={0.18}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          maxWidth={3}
        >
          {player.display_name}
        </Text>
        {/* School + MBTI subtitle */}
        {(player.school || player.mbti) && (
          <Text
            position={[0, -0.2, 0]}
            fontSize={0.1}
            color="#B0BEC5"
            anchorX="center"
            anchorY="middle"
          >
            {[player.school, player.mbti].filter(Boolean).join(' · ')}
          </Text>
        )}
      </Billboard>

      {/* Chat bubble */}
      {bubble && <ChatBubble3D content={bubble.content} />}
    </group>
  );
}

function ChatBubble3D({ content }: { content: string }) {
  const ref = useRef<THREE.Group>(null);
  const createdAt = useRef(Date.now());

  useFrame(() => {
    if (!ref.current) return;
    // Fade out after 8 seconds
    const age = (Date.now() - createdAt.current) / 1000;
    const opacity = Math.max(0, 1 - (age - 6) / 2);
    ref.current.visible = opacity > 0;
  });

  return (
    <group ref={ref}>
      <Billboard position={[0, 2.3, 0]}>
        {/* Bubble background */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[Math.min(3, Math.max(1.2, content.length * 0.12 + 0.5)), 0.45]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.9} />
        </mesh>
        {/* Bubble border */}
        <mesh position={[0, 0, -0.015]}>
          <planeGeometry args={[Math.min(3.06, Math.max(1.26, content.length * 0.12 + 0.56)), 0.51]} />
          <meshBasicMaterial color="#E0E0E0" transparent opacity={0.9} />
        </mesh>
        {/* Bubble tail */}
        <mesh position={[0, -0.28, -0.02]} rotation={[0, 0, Math.PI / 4]}>
          <planeGeometry args={[0.12, 0.12]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.9} />
        </mesh>
        <Text
          fontSize={0.16}
          color="#333333"
          anchorX="center"
          anchorY="middle"
          maxWidth={2.8}
        >
          {content}
        </Text>
      </Billboard>
    </group>
  );
}
