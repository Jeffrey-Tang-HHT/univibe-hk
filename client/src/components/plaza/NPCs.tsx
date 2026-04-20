import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import Avatar from './Avatar3D';
import type { AvatarConfig } from '@/lib/plaza';

/**
 * NPC (Non-Player Character) population that brings the plaza to life.
 *
 * Design:
 *  - 8 NPCs total, distributed contextually across zones
 *  - Mix of static (sitting/standing groups) and walkers (back-and-forth on paths)
 *  - Uses the same `Avatar3D` component as the player — visual parity is automatic
 *  - Each NPC has a zone-appropriate name (displayed in nameplate) and a pool of
 *    zone-appropriate chat lines that pop up occasionally in floating bubbles
 *
 * Future upgrade: when the player's Avatar3D is swapped for a GLTF model, this
 * component will inherit that upgrade automatically since it renders the same
 * component.
 */

// ───────── NPC behaviour types ─────────

type NPCBehavior =
  | { kind: 'static'; facing: number } // Stand still, face a direction (radians)
  | { kind: 'walk'; from: [number, number]; to: [number, number]; speed: number };

interface NPCData {
  id: string;
  name: string;
  zone: string; // For chat-line selection
  config: AvatarConfig;
  position: [number, number]; // Starting position (x, z)
  behavior: NPCBehavior;
  chatChance: number; // 0-1, probability per chat-tick (every ~10s)
}

// ───────── Chat line pools (bilingual, context-aware) ─────────

interface ChatLine {
  en: string;
  zh: string;
}

const CHAT_POOLS: Record<string, ChatLine[]> = {
  study: [
    { en: 'Finals week 😵', zh: '期末週要命…' },
    { en: 'Need coffee', zh: '我需要咖啡' },
    { en: 'Mind if I join?', zh: '可以一起讀嗎?' },
    { en: 'So many notes...', zh: '筆記好多' },
    { en: 'Library was full', zh: '圖書館爆滿' },
  ],
  social: [
    { en: 'Great vibe today!', zh: '今天氣氛不錯!' },
    { en: 'Who\'s playing next?', zh: '接下來誰表演?' },
    { en: 'Let\'s dance!', zh: '來跳舞吧!' },
    { en: 'Love this song', zh: '超愛這首歌' },
    { en: 'Epic performance', zh: '表演太讚了' },
  ],
  dating: [
    { en: 'Such a pretty spot 💕', zh: '這裡好浪漫 💕' },
    { en: 'Wanna grab dinner?', zh: '一起吃晚餐?' },
    { en: 'The roses smell lovely', zh: '玫瑰好香' },
    { en: 'Made it official 😊', zh: '我們在一起了 😊' },
  ],
  cafe: [
    { en: 'This latte is amazing', zh: '這杯拿鐵超讚' },
    { en: 'One more shot please', zh: '再一杯!' },
    { en: 'Wifi password?', zh: 'Wifi 密碼是什麼?' },
    { en: 'The pastries are fresh', zh: '甜點好新鮮' },
    { en: 'Perfect study break', zh: '完美的休息時間' },
  ],
  center: [
    { en: 'Meet you at the fountain', zh: '噴泉前見' },
    { en: 'Nice day out', zh: '天氣真好' },
    { en: 'Heading to class', zh: '要去上課了' },
    { en: 'Running late 🏃', zh: '我要遲到了 🏃' },
  ],
};

// ───────── NPC population config ─────────

const NPCS: NPCData[] = [
  // STUDY ZONE — 2 NPCs near the pergola
  {
    id: 'npc-study-1',
    name: 'Jamie',
    zone: 'study',
    // Sitting at the left desk of the pergola (world pos approx offset from zone center at -18,-15)
    config: {
      bodyColor: '#6C63FF', skinColor: '#F4C7A4', hairColor: '#2B1810', hairStyle: 0,
      shirtColor: '#3F51B5', pantsColor: '#424242', accessory: 0, expression: 0,
    },
    position: [-19.5, -15],
    behavior: { kind: 'static', facing: Math.PI / 6 },
    chatChance: 0.35,
  },
  {
    id: 'npc-study-2',
    name: 'Kai',
    zone: 'study',
    config: {
      bodyColor: '#E91E63', skinColor: '#E8B896', hairColor: '#4A2E1E', hairStyle: 0,
      shirtColor: '#E91E63', pantsColor: '#37474F', accessory: 0, expression: 0,
    },
    position: [-16.5, -15],
    behavior: { kind: 'static', facing: -Math.PI / 6 },
    chatChance: 0.3,
  },

  // SOCIAL ZONE — 2 NPCs near the stage
  {
    id: 'npc-social-1',
    name: 'Leo',
    zone: 'social',
    config: {
      bodyColor: '#FF6B6B', skinColor: '#D4A574', hairColor: '#1A1A1A', hairStyle: 0,
      shirtColor: '#FFC107', pantsColor: '#1A237E', accessory: 0, expression: 0,
    },
    position: [16, -13.5],
    behavior: { kind: 'static', facing: -Math.PI / 2 }, // Facing stage (north)
    chatChance: 0.4,
  },
  {
    id: 'npc-social-2',
    name: 'Maya',
    zone: 'social',
    config: {
      bodyColor: '#9C27B0', skinColor: '#F2D6B8', hairColor: '#5D4037', hairStyle: 0,
      shirtColor: '#AD1457', pantsColor: '#311B92', accessory: 0, expression: 0,
    },
    position: [17.5, -13.5],
    behavior: { kind: 'static', facing: -Math.PI / 2 },
    chatChance: 0.4,
  },

  // DATING CORNER — 1 NPC near the arch
  {
    id: 'npc-dating-1',
    name: 'Sam',
    zone: 'dating',
    config: {
      bodyColor: '#C4B5FD', skinColor: '#EDC3A3', hairColor: '#3E2723', hairStyle: 0,
      shirtColor: '#F06292', pantsColor: '#4A148C', accessory: 0, expression: 0,
    },
    position: [-18, 17], // Standing near bench under arch
    behavior: { kind: 'static', facing: 0 }, // Facing south (toward center)
    chatChance: 0.25,
  },

  // CAFÉ — 2 NPCs at outdoor tables
  {
    id: 'npc-cafe-1',
    name: 'Avery',
    zone: 'cafe',
    config: {
      bodyColor: '#FFA07A', skinColor: '#C48862', hairColor: '#212121', hairStyle: 0,
      shirtColor: '#FF7043', pantsColor: '#263238', accessory: 0, expression: 0,
    },
    position: [15.8, 19.8], // Left cafe table area
    behavior: { kind: 'static', facing: Math.PI / 3 },
    chatChance: 0.35,
  },
  {
    id: 'npc-cafe-2',
    name: 'Riley',
    zone: 'cafe',
    config: {
      bodyColor: '#8BC34A', skinColor: '#FAD4B2', hairColor: '#795548', hairStyle: 0,
      shirtColor: '#00897B', pantsColor: '#263238', accessory: 0, expression: 0,
    },
    position: [20.2, 19.8],
    behavior: { kind: 'static', facing: -Math.PI / 3 },
    chatChance: 0.35,
  },

  // WALKER — 1 NPC walking the main path between center and study zone
  {
    id: 'npc-walker-1',
    name: 'Taylor',
    zone: 'center',
    config: {
      bodyColor: '#26A69A', skinColor: '#E6B896', hairColor: '#6D4C41', hairStyle: 0,
      shirtColor: '#039BE5', pantsColor: '#455A64', accessory: 0, expression: 0,
    },
    position: [-6, -4],
    behavior: {
      kind: 'walk',
      from: [-6, -4],
      to: [-12, -10],
      speed: 1.2,
    },
    chatChance: 0.25,
  },
];

// ───────── Individual NPC component ─────────

function NPC({ data, lang }: { data: NPCData; lang: string }) {
  const groupRef = useRef<THREE.Group>(null);
  const [bubbleLine, setBubbleLine] = useState<ChatLine | null>(null);

  // Walker state
  const walkState = useRef({
    phase: 0, // 0..1 progress
    direction: 1, // +1 or -1
  });

  // Periodic chat bubble scheduler
  useEffect(() => {
    let mounted = true;
    const schedule = () => {
      // Next chat attempt in 6-18 seconds
      const delay = 6000 + Math.random() * 12000;
      const timer = setTimeout(() => {
        if (!mounted) return;
        if (Math.random() < data.chatChance) {
          const pool = CHAT_POOLS[data.zone] || CHAT_POOLS.center;
          const line = pool[Math.floor(Math.random() * pool.length)];
          setBubbleLine(line);
          // Hide after 3.5s
          setTimeout(() => mounted && setBubbleLine(null), 3500);
        }
        schedule();
      }, delay);
      return timer;
    };
    const timer = schedule();
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [data.chatChance, data.zone]);

  // Animation loop
  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    if (data.behavior.kind === 'walk') {
      const { from, to, speed } = data.behavior;
      // Ping-pong walk
      walkState.current.phase += walkState.current.direction * speed * 0.003;
      if (walkState.current.phase >= 1) {
        walkState.current.phase = 1;
        walkState.current.direction = -1;
      } else if (walkState.current.phase <= 0) {
        walkState.current.phase = 0;
        walkState.current.direction = 1;
      }
      const p = walkState.current.phase;
      const x = from[0] + (to[0] - from[0]) * p;
      const z = from[1] + (to[1] - from[1]) * p;
      groupRef.current.position.x = x;
      groupRef.current.position.z = z;
      // Face direction of travel
      const dx = (to[0] - from[0]) * walkState.current.direction;
      const dz = (to[1] - from[1]) * walkState.current.direction;
      const angle = Math.atan2(dx, dz);
      // Smooth rotation
      const targetY = angle;
      const curY = groupRef.current.rotation.y;
      let diff = targetY - curY;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      groupRef.current.rotation.y = curY + diff * 0.1;
    } else {
      // Static — subtle idle sway
      groupRef.current.rotation.y =
        data.behavior.facing + Math.sin(t * 0.4 + data.position[0]) * 0.08;
    }
  });

  const isMoving = data.behavior.kind === 'walk';
  const initialPos: [number, number, number] = [data.position[0], 0, data.position[1]];

  return (
    <group ref={groupRef} position={initialPos}>
      <Avatar config={data.config} isMoving={isMoving} />

      {/* Nameplate — always visible, small */}
      <Html
        position={[0, 2.0, 0]}
        center
        zIndexRange={[10, 0]}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            padding: '2px 8px',
            borderRadius: 999,
            background: 'rgba(20, 22, 30, 0.7)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.9)',
            fontSize: 10,
            fontWeight: 500,
            fontFamily: "'Space Grotesk', sans-serif",
            letterSpacing: '0.01em',
            whiteSpace: 'nowrap',
            userSelect: 'none',
          }}
        >
          {data.name}
        </div>
      </Html>

      {/* Chat bubble — appears periodically */}
      {bubbleLine && (
        <Html
          position={[0, 2.6, 0]}
          center
          zIndexRange={[15, 5]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            style={{
              animation: 'npc-bubble-in 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
              transformOrigin: 'bottom center',
            }}
          >
            <div
              style={{
                position: 'relative',
                padding: '6px 12px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.98)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.2), 0 2px 6px rgba(0,0,0,0.15)',
                maxWidth: 180,
                fontFamily: "'Space Grotesk', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                color: '#1a1a2e',
                lineHeight: 1.35,
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {lang === 'zh' ? bubbleLine.zh : bubbleLine.en}
              {/* Tail */}
              <div
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: '50%',
                  transform: 'translateX(-50%) rotate(45deg)',
                  width: 10,
                  height: 10,
                  background: 'rgba(255, 255, 255, 0.98)',
                  boxShadow: '2px 2px 4px rgba(0,0,0,0.08)',
                }}
              />
            </div>
          </div>
          <style>{`
            @keyframes npc-bubble-in {
              from { opacity: 0; transform: translateY(8px) scale(0.85); }
              to   { opacity: 1; transform: translateY(0)   scale(1); }
            }
          `}</style>
        </Html>
      )}
    </group>
  );
}

// ───────── Population component ─────────

export default function NPCs({ lang }: { lang: string }) {
  // Memoize the NPC list so we don't rebuild on every render
  const npcList = useMemo(() => NPCS, []);

  return (
    <group>
      {npcList.map((npc) => (
        <NPC key={npc.id} data={npc} lang={lang} />
      ))}
    </group>
  );
}
