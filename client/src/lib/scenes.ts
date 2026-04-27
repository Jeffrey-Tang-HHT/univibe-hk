// ─────────────────────────────────────────────────────────────
// Scene registry — single source of truth for all walk-in scenes.
//
// Adding a fifth interior is one entry here + one geometry file
// in components/plaza/scenes/. The router, transition system,
// API, and HUD all read from this.
// ─────────────────────────────────────────────────────────────

import type { SceneId } from './plaza';

export type ParticleKind = 'petals' | 'sparkles' | 'dust' | 'leaves' | 'motes';

export interface SceneConfig {
  id: SceneId;
  // Display names, both languages.
  nameZh: string;
  nameEn: string;
  // Short tagline shown in the entry-trigger prompt.
  taglineZh: string;
  taglineEn: string;
  // Where the player spawns inside this scene.
  // `[x, y, z]` in world units (meters).
  spawn: [number, number, number];
  // World-bounds for clamping the player & camera. Half-extents around 0.
  // Plaza uses ±50; interiors are much smaller.
  bounds: { hx: number; hz: number };
  // Trigger — the spot in the *plaza* you walk onto to enter this scene.
  // Only populated for non-plaza scenes (the plaza itself has no trigger).
  // The exit point inside the interior brings you back to here.
  entryFromPlaza?: { x: number; z: number; radius: number };
  // Where the player lands in the plaza when they exit this scene.
  // Defaults to entryFromPlaza + a small offset away from the trigger.
  exitToPlaza?: { x: number; z: number };
  // Ambient sound — a path under client/public/audio/. If the file isn't
  // present, the player just stays silent for that scene (no error thrown).
  ambientSound?: string;
  // Per-scene particle config. Drop 1 ships a single shared particle system;
  // Drop 2 customises it per scene.
  particles: {
    kind: ParticleKind;
    color: string;
    density: number; // 0..1, fraction of a baseline budget
  };
  // Used by the SceneTransition fade for theme-aware tinting.
  themeColor: string;
}

// ─── The five scenes ───
// IMPORTANT: keep this in lockstep with the SceneId union in lib/plaza.ts
// and the VALID_SCENES list / CHECK constraint in api/plaza.mjs and
// migration-v7-interiors.sql.
export const SCENES: Record<SceneId, SceneConfig> = {
  plaza: {
    id: 'plaza',
    nameZh: '中央廣場',
    nameEn: 'Central Plaza',
    taglineZh: '回到廣場',
    taglineEn: 'Back to plaza',
    spawn: [0, 0, 5],
    bounds: { hx: 50, hz: 50 },
    // No entry trigger — plaza is the hub.
    particles: { kind: 'motes', color: '#FFE4C4', density: 0.4 },
    themeColor: '#4ECDC4',
  },
  library: {
    id: 'library',
    nameZh: '圖書館',
    nameEn: 'Library',
    taglineZh: '安靜的閱讀空間',
    taglineEn: 'A quiet study space',
    spawn: [0, 0, 6],
    bounds: { hx: 8, hz: 8 },
    // The library landmark in the plaza is at roughly (-18, -15) — Study Zone
    // anchor from Environment3D.tsx. Trigger sits a couple metres in front.
    entryFromPlaza: { x: -18, z: -10, radius: 1.6 },
    exitToPlaza:    { x: -18, z: -8 },
    ambientSound: '/audio/library.mp3',
    particles: { kind: 'dust', color: '#F5E6C8', density: 0.5 },
    themeColor: '#45B7D1',
  },
  cafe: {
    id: 'cafe',
    nameZh: '咖啡廳',
    nameEn: 'Café',
    taglineZh: '溫暖的角落',
    taglineEn: 'A warm corner',
    spawn: [0, 0, 5],
    bounds: { hx: 7, hz: 7 },
    // Café landmark anchor: (18, 18). Trigger a couple metres in front.
    entryFromPlaza: { x: 18, z: 12, radius: 1.6 },
    exitToPlaza:    { x: 18, z: 10 },
    ambientSound: '/audio/cafe.mp3',
    particles: { kind: 'motes', color: '#FFB27A', density: 0.6 },
    themeColor: '#FFA07A',
  },
  social: {
    id: 'social',
    nameZh: '社交區',
    nameEn: 'Social Stage',
    taglineZh: '熱鬧的舞台',
    taglineEn: 'A lively stage',
    spawn: [0, 0, 6],
    bounds: { hx: 9, hz: 9 },
    // Social Zone anchor: (18, -15). Trigger a couple metres in front (toward centre).
    entryFromPlaza: { x: 18, z: -10, radius: 1.6 },
    exitToPlaza:    { x: 18, z: -8 },
    ambientSound: '/audio/social.mp3',
    particles: { kind: 'sparkles', color: '#FF6B6B', density: 0.7 },
    themeColor: '#FF6B6B',
  },
  dating: {
    id: 'dating',
    nameZh: '交友角',
    nameEn: 'Dating Corner',
    taglineZh: '黃昏的露台',
    taglineEn: 'A sunset rooftop',
    spawn: [0, 0, 5],
    bounds: { hx: 8, hz: 8 },
    // Dating Corner anchor: (-18, 18). Trigger a couple metres in front.
    entryFromPlaza: { x: -18, z: 12, radius: 1.6 },
    exitToPlaza:    { x: -18, z: 10 },
    ambientSound: '/audio/dating.mp3',
    particles: { kind: 'petals', color: '#FFB6C1', density: 0.55 },
    themeColor: '#C4B5FD',
  },
};

// All scene IDs except plaza — handy when building the entry-trigger list.
export const INTERIOR_SCENES: SceneId[] = ['library', 'cafe', 'social', 'dating'];

// All scene IDs — keep this exported for any code that wants to iterate.
export const ALL_SCENES: SceneId[] = ['plaza', ...INTERIOR_SCENES];

export function getSceneConfig(id: SceneId): SceneConfig {
  return SCENES[id];
}

// Defensive: convert anything (e.g. a value from localStorage or an API
// response) into a known SceneId, defaulting to 'plaza'.
export function normalizeSceneId(value: unknown): SceneId {
  if (typeof value !== 'string') return 'plaza';
  if (value in SCENES) return value as SceneId;
  return 'plaza';
}
