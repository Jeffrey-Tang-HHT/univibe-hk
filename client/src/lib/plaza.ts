import { getToken } from './auth';

const API_BASE = '/api/plaza';

// Centralised scene-id type. Mirrors VALID_SCENES in api/plaza.mjs and the
// CHECK constraint in migration-v7-interiors.sql.
export type SceneId = 'plaza' | 'library' | 'cafe' | 'social' | 'dating';

async function plazaFetch(action: string, options: RequestInit = {}) {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');

  const url = `${API_BASE}?action=${action}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

export interface AvatarConfig {
  bodyColor: string;
  skinColor: string;
  hairColor: string;
  hairStyle: number;
  shirtColor: string;
  pantsColor: string;
  accessory: number;
  expression: number;
}

export interface PlazaPlayer {
  id: string;
  display_name: string;
  school: string;
  mbti: string;
  avatar_config: AvatarConfig;
  x: number;
  y: number;
  z: number;
  rotation: number;
  zone: string;
  scene: SceneId;
  is_moving: boolean;
  is_me: boolean;
}

export interface PlazaBubble {
  id: string;
  user_id: string;
  display_name: string;
  content: string;
  x: number;
  y: number;
  z: number;
  scene: SceneId;
  created_at: string;
}

export const DEFAULT_AVATAR: AvatarConfig = {
  bodyColor: '#6C63FF',
  skinColor: '#FFD5B8',
  hairColor: '#4A3728',
  hairStyle: 0,
  shirtColor: '#6C63FF',
  pantsColor: '#2D2D2D',
  accessory: 0,
  expression: 0,
};

export async function updatePosition(data: {
  x: number; y: number; z: number;
  rotation: number; zone: string; is_moving: boolean;
  scene: SceneId;
}) {
  return plazaFetch('update-position', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Note: the existing `plazaFetch` builds the URL as `?action=...`, so threading
// a second query param means inlining `&scene=...` in the action string.
// Slightly hacky, but it avoids changing the helper signature for what's
// essentially a one-off case until/unless we refactor the lib more broadly.
export async function getPlayers(scene: SceneId): Promise<{ players: PlazaPlayer[] }> {
  return plazaFetch(`get-players&scene=${encodeURIComponent(scene)}`);
}

export async function sendBubble(content: string, x: number, y: number, z: number, scene: SceneId) {
  return plazaFetch('send-bubble', {
    method: 'POST',
    body: JSON.stringify({ content, x, y, z, scene }),
  });
}

export async function getBubbles(scene: SceneId): Promise<{ bubbles: PlazaBubble[] }> {
  return plazaFetch(`get-bubbles&scene=${encodeURIComponent(scene)}`);
}

export async function saveAvatar(avatar_config: AvatarConfig) {
  return plazaFetch('save-avatar', {
    method: 'POST',
    body: JSON.stringify({ avatar_config }),
  });
}

export async function leavePlaza() {
  return plazaFetch('leave', { method: 'POST' });
}
