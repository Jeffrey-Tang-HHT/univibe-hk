import { getToken } from './auth';

const API_BASE = '/api/plaza';

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
}) {
  return plazaFetch('update-position', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getPlayers(): Promise<{ players: PlazaPlayer[] }> {
  return plazaFetch('get-players');
}

export async function sendBubble(content: string, x: number, y: number, z: number) {
  return plazaFetch('send-bubble', {
    method: 'POST',
    body: JSON.stringify({ content, x, y, z }),
  });
}

export async function getBubbles(): Promise<{ bubbles: PlazaBubble[] }> {
  return plazaFetch('get-bubbles');
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
