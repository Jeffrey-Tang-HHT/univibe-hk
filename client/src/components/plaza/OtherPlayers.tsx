import { useRef, useMemo } from 'react';
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

// ─────────────────────────────────────────────────────────────
// Name tag layout
//
// The old tag was a single dark plane + two Text nodes. The new one is still
// built from planes (so it stays fully inside the Three.js scene — no DOM
// bleed-through, no z-index hell with the MiniMap), but layered to look like
// a glass pill:
//
//   [ bottom shadow ] [ dark translucent body ] [ inner tint ] [ accent strip ]
//
// "Accent strip" is a slim coloured bar along the top edge. It picks up the
// player's own shirt colour as a subtle personal identifier, and switches to
// a warm gold when the player has an active chat bubble ("speaking" proxy).
// Real proximity-voice state would plug in here trivially — just swap the
// bubble check for a voice-active flag.
// ─────────────────────────────────────────────────────────────
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

  targetPos.current.set(player.x, 0, player.z);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.lerp(targetPos.current, 0.1);
    const currentRot = groupRef.current.rotation.y;
    const targetRot = player.rotation;
    groupRef.current.rotation.y = THREE.MathUtils.lerp(currentRot, targetRot, 0.1);
  });

  const isSpeaking = !!bubble;
  const accentColor = isSpeaking ? '#FFD54F' : (player.avatar_config?.shirtColor || '#6C63FF');

  // Tag sizing. Keep roughly proportional to display-name length but with a
  // sensible minimum so single-character names don't produce a tiny sliver.
  const { tagW, subW, hasSubtitle } = useMemo(() => {
    const nameW = Math.max(1.4, player.display_name.length * 0.15 + 0.5);
    const subtitle = [player.school, player.mbti].filter(Boolean).join(' · ');
    const subtitleW = subtitle ? Math.max(1.2, subtitle.length * 0.08 + 0.4) : 0;
    return { tagW: Math.max(nameW, subtitleW), subW: subtitleW, hasSubtitle: !!subtitle };
  }, [player.display_name, player.school, player.mbti]);

  const tagH = hasSubtitle ? 0.52 : 0.36;

  return (
    <group ref={groupRef} position={[player.x, 0, player.z]}>
      <Avatar3D
        config={player.avatar_config}
        isMoving={player.is_moving}
        onClick={onClick}
      />

      {/* Name tag — billboarded layered planes */}
      <Billboard position={[0, 1.95, 0]}>
        {/* Soft drop shadow */}
        <mesh position={[0, -0.02, -0.03]}>
          <planeGeometry args={[tagW + 0.14, tagH + 0.14]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.18} />
        </mesh>
        {/* Dark body — mimics backdrop-filter since three can't actually blur DOM */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[tagW, tagH]} />
          <meshBasicMaterial color="#0F1119" transparent opacity={0.72} />
        </mesh>
        {/* Inner accent tint — subtle colour wash at the bottom */}
        <mesh position={[0, -tagH * 0.35, -0.015]}>
          <planeGeometry args={[tagW * 0.96, tagH * 0.28]} />
          <meshBasicMaterial color={accentColor} transparent opacity={0.12} />
        </mesh>
        {/* Top accent strip — personal colour; turns gold when speaking */}
        <mesh position={[0, tagH / 2 - 0.02, -0.01]}>
          <planeGeometry args={[tagW * 0.9, 0.04]} />
          <meshBasicMaterial color={accentColor} transparent opacity={isSpeaking ? 1 : 0.75} />
        </mesh>
        {/* Speaking pulse dot — only when bubble present */}
        {isSpeaking && (
          <SpeakerDot accentColor={accentColor} x={-tagW / 2 + 0.13} y={tagH / 2 - 0.12} />
        )}

        {/* Display name */}
        <Text
          position={[isSpeaking ? 0.05 : 0, hasSubtitle ? 0.09 : 0, 0]}
          fontSize={0.18}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
          maxWidth={3}
          outlineWidth={0.006}
          outlineColor="#0F1119"
        >
          {player.display_name}
        </Text>

        {/* Subtitle */}
        {hasSubtitle && (
          <Text
            position={[0, -0.11, 0]}
            fontSize={0.1}
            color="#B0BEC5"
            anchorX="center"
            anchorY="middle"
            maxWidth={3}
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

// Pulsing dot drawn next to the name when the player is "speaking"
// (placeholder for real voice state — currently proxied by chat bubble).
function SpeakerDot({ accentColor, x, y }: { accentColor: string; x: number; y: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const s = 1 + Math.sin(Date.now() * 0.006) * 0.25;
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} position={[x, y, 0]}>
      <circleGeometry args={[0.04, 12]} />
      <meshBasicMaterial color={accentColor} />
    </mesh>
  );
}

function ChatBubble3D({ content }: { content: string }) {
  const ref = useRef<THREE.Group>(null);
  const createdAt = useRef(Date.now());

  useFrame(() => {
    if (!ref.current) return;
    const age = (Date.now() - createdAt.current) / 1000;
    const opacity = Math.max(0, 1 - (age - 6) / 2);
    ref.current.visible = opacity > 0;
  });

  return (
    <group ref={ref}>
      <Billboard position={[0, 2.55, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[Math.min(3, Math.max(1.2, content.length * 0.12 + 0.5)), 0.45]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0, -0.015]}>
          <planeGeometry args={[Math.min(3.06, Math.max(1.26, content.length * 0.12 + 0.56)), 0.51]} />
          <meshBasicMaterial color="#E0E0E0" transparent opacity={0.9} />
        </mesh>
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
