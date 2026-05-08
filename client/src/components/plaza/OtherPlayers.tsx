import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, Billboard, Html } from '@react-three/drei';
import Avatar3D, { getEmoteDuration, type EmoteName } from './Avatar3D';
import type { PlazaPlayer, PlazaBubble } from '@/lib/plaza';

interface OtherPlayersProps {
  players: PlazaPlayer[];
  bubbles: PlazaBubble[];
  onPlayerClick?: (player: PlazaPlayer) => void;
}

// Emoji glyph for each emote — mirrors EmoteBar's table so the popup
// matches what the user sees in the picker. Kept in this file (rather
// than imported from EmoteBar) because EmoteBar is HUD-side and this
// is scene-side; sharing the constant would create an awkward dep
// loop. Six entries, one short table — fine to duplicate.
const EMOTE_EMOJI: Record<EmoteName, string> = {
  wave:  '👋',
  cheer: '🙌',
  dance: '💃',
  clap:  '👏',
  bow:   '🙇',
  point: '👉',
  sit:   '🪑',
};

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
        emote={(player.emote as import('./Avatar3D').EmoteName) ?? null}
        emoteStartMs={player.emote_start_ms ?? 0}
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

      {/* Active-emote emoji popup — pops above the avatar's head when
          an emote starts and fades out as the emote ends. Lightweight
          companion to the body animation: even when an emote is hard
          to read at distance (e.g. a small wave seen from across the
          plaza), the emoji makes the gesture instantly legible. */}
      {player.emote && player.emote_start_ms > 0 && (
        <EmotePopup
          name={player.emote as EmoteName}
          startMs={player.emote_start_ms}
        />
      )}
    </group>
  );
}

// ─── EmotePopup ──────────────────────────────────────────────
// Small floating emoji rendered via drei <Html> so colour emojis
// render correctly (drei's <Text> uses Troika SDF, which doesn't
// handle colour emoji glyphs). Self-expires by checking elapsed
// time vs the emote's duration. Hides itself after the emote ends
// so we don't accumulate stale popups on the scene graph.
//
// Lifecycle visualised:
//   start ─[ pop in 200ms ]─[ hold ]─[ fade out 400ms ]─ done
function EmotePopup({ name, startMs }: { name: EmoteName; startMs: number }) {
  const elRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useFrame(() => {
    if (!elRef.current) return;
    const elapsed = Date.now() - startMs;
    const duration = getEmoteDuration(name);
    const totalLife = duration + 400; // emote duration + fade tail

    if (elapsed < 0 || elapsed > totalLife) {
      // React state flip rather than just hiding via style — once we're
      // done we want React to drop the <Html> portal entirely.
      if (visible) setVisible(false);
      return;
    }

    let opacity = 1;
    if (elapsed < 200) opacity = elapsed / 200;
    else if (elapsed > duration) opacity = Math.max(0, 1 - (elapsed - duration) / 400);

    // Subtle bob — tiny vertical wobble so the popup feels alive.
    const bob = Math.sin(elapsed * 0.008) * 4; // px, applied via translateY
    // Pop scale — overshoot then settle.
    let scale = 1;
    if (elapsed < 200) scale = THREE.MathUtils.lerp(0.4, 1.1, elapsed / 200);
    else if (elapsed < 350) scale = THREE.MathUtils.lerp(1.1, 1.0, (elapsed - 200) / 150);

    // We write directly to the element style — useState here would
    // re-render every frame, defeating the whole point of useFrame.
    elRef.current.style.opacity = String(opacity);
    elRef.current.style.transform = `translate(-50%, calc(-50% + ${-bob}px)) scale(${scale})`;
  });

  // Reset visibility if the parent reuses this component for a new
  // emote (different startMs) — the popup might have hidden itself
  // during the previous emote.
  useEffect(() => { setVisible(true); }, [startMs, name]);

  if (!visible) return null;

  const emoji = EMOTE_EMOJI[name] ?? '✨';

  return (
    <Html
      position={[0, 2.95, 0]}
      center
      zIndexRange={[20, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div
        ref={elRef}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%)',
          // Pill backdrop — same vibe as the name tag for visual continuity.
          padding: '4px 10px',
          borderRadius: 999,
          background: 'rgba(15, 17, 25, 0.78)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          fontSize: 22,
          lineHeight: 1,
          // System emoji font stack — matches whatever the user's OS
          // ships with rather than relying on a webfont.
          fontFamily: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
          whiteSpace: 'nowrap',
          willChange: 'opacity, transform',
        }}
      >
        {emoji}
      </div>
    </Html>
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
