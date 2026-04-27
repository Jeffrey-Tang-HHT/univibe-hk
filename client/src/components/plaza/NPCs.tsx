import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import Avatar from './Avatar3D';
import type { AvatarConfig } from '@/lib/plaza';
import { resolveCollision, PLAYER_RADIUS } from './colliders';

/**
 * NPC (Non-Player Character) population that brings the plaza to life.
 *
 * Design:
 *  - ~30 NPCs, procedurally generated with a seeded RNG so the same NPCs
 *    spawn in the same spots / colours / names on every reload (otherwise
 *    the plaza visibly shuffles every page-load and feels unstable).
 *  - Mix of static (sitting/standing groups), path walkers (back-and-forth
 *    on a fixed line) and wanderers (idle → pick random nearby target →
 *    walk → idle → repeat).
 *  - Wanderers respect the same `colliders.ts` resolver the player uses,
 *    so they never clip through buildings/trees/fountains.
 *  - All NPCs share a single parent useFrame instead of N hooks. At
 *    ~30 NPCs the per-NPC hook overhead starts mattering on mobile.
 *  - Uses the same `Avatar3D` component as the player — visual parity is
 *    automatic.
 *
 * NPCs are rendered by THIS component only. They never enter the
 * `players` array used by `OtherPlayers.tsx` or chat/match systems —
 * keep that boundary clean so guarded social interactions can't target
 * them.
 *
 * Future upgrade: when the player's Avatar3D is swapped for a GLTF model,
 * this component will inherit that upgrade automatically since it renders
 * the same component.
 */

// ───────── Public population size ─────────
// Exported so Plaza.tsx can mix this into the "online" count if desired.
export const NPC_COUNT = 30;

// ───────── NPC behaviour types ─────────

type NPCBehavior =
  | { kind: 'static'; facing: number }
  | { kind: 'walk'; from: [number, number]; to: [number, number]; speed: number }
  | { kind: 'wander'; center: [number, number]; radius: number; speed: number };

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
    { en: 'Group project later', zh: '等下要小組討論' },
  ],
  social: [
    { en: 'Great vibe today!', zh: '今天氣氛不錯!' },
    { en: 'Who\'s playing next?', zh: '接下來誰表演?' },
    { en: 'Let\'s dance!', zh: '來跳舞吧!' },
    { en: 'Love this song', zh: '超愛這首歌' },
    { en: 'Epic performance', zh: '表演太讚了' },
    { en: 'Selfie time?', zh: '自拍一張?' },
  ],
  dating: [
    { en: 'Such a pretty spot 💕', zh: '這裡好浪漫 💕' },
    { en: 'Wanna grab dinner?', zh: '一起吃晚餐?' },
    { en: 'The roses smell lovely', zh: '玫瑰好香' },
    { en: 'Made it official 😊', zh: '我們在一起了 😊' },
    { en: 'You free this weekend?', zh: '週末有空嗎?' },
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
    { en: 'See you around!', zh: '再見!' },
  ],
};

// ───────── Seeded RNG (mulberry32) ─────────
// Same seed → same plaza on every reload. Bump the seed to "remix" the
// population without code changes.

const NPC_SEED = 0x756e6967; // "unig" in ASCII — change to remix

function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────── Procedural generation pools ─────────

const FIRST_NAMES = [
  // Mix of English nicknames and short Cantonese-romanised — feels Hong Kong
  // university without being on-the-nose.
  'Jamie', 'Kai', 'Leo', 'Maya', 'Sam', 'Avery', 'Riley', 'Taylor',
  'Jordan', 'Morgan', 'Cam', 'Quinn', 'Rio', 'Ash', 'Sky', 'Noa',
  'Wing', 'Hei', 'Yan', 'Ka', 'Lok', 'Sze', 'Tsz', 'Hin',
  'Mei', 'Ming', 'Chun', 'Lin', 'Yui', 'Ren', 'Eli', 'Nico',
  'Sasha', 'Robin', 'Drew', 'Jess', 'Alex', 'Charlie', 'Nat', 'Devi',
];

const SHIRT_COLORS = [
  '#3F51B5', '#E91E63', '#FFC107', '#AD1457', '#F06292',
  '#FF7043', '#00897B', '#039BE5', '#7B1FA2', '#43A047',
  '#FB8C00', '#26A69A', '#5E35B1', '#EC407A', '#26C6DA',
];

const PANTS_COLORS = [
  '#424242', '#37474F', '#1A237E', '#311B92', '#263238',
  '#4A148C', '#455A64', '#3E2723', '#212121',
];

const SKIN_COLORS = [
  '#F4C7A4', '#E8B896', '#D4A574', '#F2D6B8', '#EDC3A3',
  '#C48862', '#FAD4B2', '#E6B896', '#FFD5B8', '#B8855E',
];

const HAIR_COLORS = [
  '#2B1810', '#4A2E1E', '#1A1A1A', '#5D4037', '#3E2723',
  '#212121', '#795548', '#6D4C41', '#4E342E',
];

const BODY_COLORS = [
  '#6C63FF', '#E91E63', '#FF6B6B', '#9C27B0', '#C4B5FD',
  '#FFA07A', '#8BC34A', '#26A69A', '#FF8A65', '#7986CB',
];

// ───────── Spawn anchors per zone ─────────
// Each zone gets a centre + radius for wanderers, plus optional fixed-seat
// positions for static NPCs (matching the visible benches/tables/etc).
// All coords are world-space [x, z].

const ZONE_ANCHORS: {
  zone: string;
  center: [number, number];
  radius: number;
  staticSeats: [number, number, number][]; // x, z, facing(rad)
}[] = [
  {
    zone: 'study',
    center: [-18, -15],
    radius: 6,
    staticSeats: [
      [-19.5, -15, Math.PI / 6],
      [-16.5, -15, -Math.PI / 6],
      [-20.5, -13.5, Math.PI / 4],
    ],
  },
  {
    zone: 'social',
    center: [18, -15],
    radius: 6,
    staticSeats: [
      [16, -13.5, -Math.PI / 2],
      [17.5, -13.5, -Math.PI / 2],
      [19.5, -13.5, -Math.PI / 2],
    ],
  },
  {
    zone: 'dating',
    center: [-18, 18],
    radius: 5,
    staticSeats: [
      [-18, 17, 0],
      [-19, 19, Math.PI / 8],
    ],
  },
  {
    zone: 'cafe',
    center: [18, 18],
    radius: 5,
    staticSeats: [
      [15.8, 19.8, Math.PI / 3],
      [20.2, 19.8, -Math.PI / 3],
      [17.5, 21, -Math.PI / 4],
    ],
  },
  {
    zone: 'center',
    center: [0, 0],
    radius: 9,
    staticSeats: [],
  },
];

// ───────── Path-walker routes ─────────
// A handful of NPCs follow fixed paths between zones — gives the plaza a
// visible sense of "students moving between buildings" without all 30 just
// loitering in clusters.
const PATH_ROUTES: { from: [number, number]; to: [number, number] }[] = [
  { from: [-6, -4], to: [-12, -10] },   // centre → study
  { from: [6, -4], to: [12, -10] },     // centre → social
  { from: [-6, 4], to: [-12, 12] },     // centre → dating
  { from: [6, 4], to: [12, 12] },       // centre → cafe
  { from: [-15, 0], to: [15, 0] },      // east-west crosswalk
];

// ───────── Generator ─────────

function generateNPCs(): NPCData[] {
  const rand = mulberry32(NPC_SEED);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const npcs: NPCData[] = [];

  // 1. Fill static seats first — these "anchor" each zone with sitting NPCs
  //    so the plaza never looks empty even if wanderers cluster elsewhere.
  for (const anchor of ZONE_ANCHORS) {
    for (let i = 0; i < anchor.staticSeats.length && npcs.length < NPC_COUNT * 0.4; i++) {
      const [x, z, facing] = anchor.staticSeats[i];
      npcs.push({
        id: `npc-static-${anchor.zone}-${i}`,
        name: pick(FIRST_NAMES),
        zone: anchor.zone,
        config: {
          bodyColor: pick(BODY_COLORS),
          skinColor: pick(SKIN_COLORS),
          hairColor: pick(HAIR_COLORS),
          hairStyle: Math.floor(rand() * 3),
          shirtColor: pick(SHIRT_COLORS),
          pantsColor: pick(PANTS_COLORS),
          accessory: rand() < 0.3 ? Math.floor(rand() * 3) : 0,
          expression: 0,
        },
        position: [x, z],
        behavior: { kind: 'static', facing },
        chatChance: 0.25 + rand() * 0.2,
      });
    }
  }

  // 2. Add a few path walkers
  const pathCount = Math.min(PATH_ROUTES.length, Math.floor(NPC_COUNT * 0.2));
  for (let i = 0; i < pathCount && npcs.length < NPC_COUNT; i++) {
    const route = PATH_ROUTES[i];
    npcs.push({
      id: `npc-walker-${i}`,
      name: pick(FIRST_NAMES),
      zone: 'center',
      config: {
        bodyColor: pick(BODY_COLORS),
        skinColor: pick(SKIN_COLORS),
        hairColor: pick(HAIR_COLORS),
        hairStyle: Math.floor(rand() * 3),
        shirtColor: pick(SHIRT_COLORS),
        pantsColor: pick(PANTS_COLORS),
        accessory: rand() < 0.2 ? Math.floor(rand() * 3) : 0,
        expression: 0,
      },
      position: [route.from[0], route.from[1]],
      behavior: {
        kind: 'walk',
        from: route.from,
        to: route.to,
        speed: 0.9 + rand() * 0.5,
      },
      chatChance: 0.2 + rand() * 0.15,
    });
  }

  // 3. Fill the rest with wanderers, distributed across zones round-robin
  let zoneIdx = 0;
  while (npcs.length < NPC_COUNT) {
    const anchor = ZONE_ANCHORS[zoneIdx % ZONE_ANCHORS.length];
    zoneIdx++;
    // Random starting offset within the wander radius
    const angle = rand() * Math.PI * 2;
    const r = rand() * anchor.radius;
    const startX = anchor.center[0] + Math.cos(angle) * r;
    const startZ = anchor.center[1] + Math.sin(angle) * r;
    npcs.push({
      id: `npc-wander-${npcs.length}`,
      name: pick(FIRST_NAMES),
      zone: anchor.zone,
      config: {
        bodyColor: pick(BODY_COLORS),
        skinColor: pick(SKIN_COLORS),
        hairColor: pick(HAIR_COLORS),
        hairStyle: Math.floor(rand() * 3),
        shirtColor: pick(SHIRT_COLORS),
        pantsColor: pick(PANTS_COLORS),
        accessory: rand() < 0.25 ? Math.floor(rand() * 3) : 0,
        expression: 0,
      },
      position: [startX, startZ],
      behavior: {
        kind: 'wander',
        center: anchor.center,
        radius: anchor.radius,
        // Speed varied per-NPC so they don't visibly march in lockstep
        speed: 0.5 + rand() * 0.7,
      },
      chatChance: 0.18 + rand() * 0.18,
    });
  }

  return npcs;
}

// ───────── Per-NPC runtime state (held outside React) ─────────

interface NPCRuntime {
  data: NPCData;
  group: THREE.Group | null;
  // Walker
  walkPhase: number;
  walkDir: 1 | -1;
  // Wanderer
  wanderMode: 'idle' | 'walking';
  wanderTarget: [number, number];
  wanderIdleUntil: number;
}

function pickWanderTarget(
  center: [number, number],
  radius: number,
  rand: () => number
): [number, number] {
  // Sample a handful of points and reject ones that resolveCollision moves
  // by more than a tiny amount — that means the point is inside a collider.
  for (let attempt = 0; attempt < 8; attempt++) {
    const angle = rand() * Math.PI * 2;
    const r = rand() * radius;
    const x = center[0] + Math.cos(angle) * r;
    const z = center[1] + Math.sin(angle) * r;
    const resolved = resolveCollision(x, z);
    const drift = Math.hypot(resolved.x - x, resolved.z - z);
    if (drift < PLAYER_RADIUS * 0.5) return [x, z];
  }
  // Fallback: return centre. Better than spinning forever.
  return [center[0], center[1]];
}

// ───────── Single Avatar+nameplate render unit ─────────
// Refs are wired up by parent so the shared frame loop can drive position.

interface NPCAvatarProps {
  data: NPCData;
  lang: string;
  registerGroup: (id: string, group: THREE.Group | null) => void;
}

function NPCAvatar({ data, lang, registerGroup }: NPCAvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [bubbleLine, setBubbleLine] = useState<ChatLine | null>(null);

  // Register/unregister with parent
  useEffect(() => {
    registerGroup(data.id, groupRef.current);
    return () => registerGroup(data.id, null);
  }, [data.id, registerGroup]);

  // Periodic chat bubble scheduler — kept per-NPC because timers are cheap
  // (setTimeout, not RAF) so this doesn't scale-bottleneck.
  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const delay = 6000 + Math.random() * 12000;
      timer = setTimeout(() => {
        if (!mounted) return;
        if (Math.random() < data.chatChance) {
          const pool = CHAT_POOLS[data.zone] || CHAT_POOLS.center;
          const line = pool[Math.floor(Math.random() * pool.length)];
          setBubbleLine(line);
          setTimeout(() => mounted && setBubbleLine(null), 3500);
        }
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [data.chatChance, data.zone]);

  const isMoving = data.behavior.kind !== 'static';
  const initialPos: [number, number, number] = [data.position[0], 0, data.position[1]];

  return (
    <group ref={groupRef} position={initialPos}>
      <Avatar config={data.config} isMoving={isMoving} />

      {/* Nameplate */}
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
  // Generated once per mount; the seeded RNG keeps this stable across reloads.
  const npcList = useMemo(() => generateNPCs(), []);

  // Ref-keyed runtime state, one entry per NPC. Held outside React so the
  // single shared useFrame can update positions without triggering renders.
  const runtimes = useRef<Map<string, NPCRuntime>>(new Map());

  // Frame-loop RNG — kept stable across frames so wander targets feel
  // organic rather than drifting on every call.
  const frameRandRef = useRef(mulberry32(NPC_SEED ^ 0xa7));

  // Initialise runtime entries lazily. Walkers start mid-path on a random
  // phase to de-sync the marching.
  useMemo(() => {
    const rand = mulberry32(NPC_SEED ^ 0x55);
    for (const npc of npcList) {
      runtimes.current.set(npc.id, {
        data: npc,
        group: null,
        walkPhase: rand(),
        walkDir: rand() < 0.5 ? 1 : -1,
        wanderMode: 'idle',
        wanderTarget: [npc.position[0], npc.position[1]],
        wanderIdleUntil: rand() * 4,
      });
    }
  }, [npcList]);

  const registerGroup = (id: string, group: THREE.Group | null) => {
    const rt = runtimes.current.get(id);
    if (rt) rt.group = group;
  };

  // Single shared frame loop for all NPCs.
  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    // Cap delta to avoid huge teleports on tab-switch resume.
    const dt = Math.min(delta, 0.05);
    const rand = frameRandRef.current;

    for (const rt of runtimes.current.values()) {
      const g = rt.group;
      if (!g) continue;
      const { behavior } = rt.data;

      if (behavior.kind === 'static') {
        // Subtle idle sway — desynced per-NPC by their start position.
        g.rotation.y = behavior.facing + Math.sin(t * 0.4 + rt.data.position[0]) * 0.08;
      } else if (behavior.kind === 'walk') {
        // Ping-pong along a fixed line.
        rt.walkPhase += rt.walkDir * behavior.speed * dt * 0.18;
        if (rt.walkPhase >= 1) {
          rt.walkPhase = 1;
          rt.walkDir = -1;
        } else if (rt.walkPhase <= 0) {
          rt.walkPhase = 0;
          rt.walkDir = 1;
        }
        const p = rt.walkPhase;
        g.position.x = behavior.from[0] + (behavior.to[0] - behavior.from[0]) * p;
        g.position.z = behavior.from[1] + (behavior.to[1] - behavior.from[1]) * p;
        const dx = (behavior.to[0] - behavior.from[0]) * rt.walkDir;
        const dz = (behavior.to[1] - behavior.from[1]) * rt.walkDir;
        const angle = Math.atan2(dx, dz);
        let diff = angle - g.rotation.y;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        g.rotation.y += diff * Math.min(1, dt * 6);
      } else {
        // Wander state machine
        if (rt.wanderMode === 'idle') {
          if (t > rt.wanderIdleUntil) {
            rt.wanderTarget = pickWanderTarget(behavior.center, behavior.radius, rand);
            rt.wanderMode = 'walking';
          }
        } else {
          const cur = g.position;
          const dx = rt.wanderTarget[0] - cur.x;
          const dz = rt.wanderTarget[1] - cur.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.3) {
            rt.wanderMode = 'idle';
            rt.wanderIdleUntil = t + 0.5 + rand() * 3.5;
          } else {
            const step = behavior.speed * dt;
            const nx = cur.x + (dx / dist) * step;
            const nz = cur.z + (dz / dist) * step;
            const resolved = resolveCollision(nx, nz);
            // If collision pushed us back significantly, abort this target.
            const drift = Math.hypot(resolved.x - nx, resolved.z - nz);
            if (drift > step * 1.5) {
              rt.wanderMode = 'idle';
              rt.wanderIdleUntil = t + 0.3 + rand() * 1.5;
            } else {
              cur.x = resolved.x;
              cur.z = resolved.z;
              const angle = Math.atan2(dx, dz);
              let diff = angle - g.rotation.y;
              while (diff > Math.PI) diff -= 2 * Math.PI;
              while (diff < -Math.PI) diff += 2 * Math.PI;
              g.rotation.y += diff * Math.min(1, dt * 6);
            }
          }
        }
      }
    }
  });

  return (
    <group>
      {npcList.map((npc) => (
        <NPCAvatar
          key={npc.id}
          data={npc}
          lang={lang}
          registerGroup={registerGroup}
        />
      ))}
    </group>
  );
}
