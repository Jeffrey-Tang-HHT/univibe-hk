// Chat API helper — handles all chat operations
import { getToken } from './auth';

const API_BASE = '/api';

function headers() {
  return { 'Content-Type': 'application/json' };
}

// Create a match (vibe check)
export async function createMatch(userId: string, targetId: string) {
  const res = await fetch(`${API_BASE}/create-match`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ user1_id: userId, user2_id: targetId }),
  });
  return res.json();
}

// Get all matches for a user
export async function getMatches(userId: string) {
  const res = await fetch(`${API_BASE}/get-matches?user_id=${userId}`);
  return res.json();
}

// Get messages for a match
export async function getMessages(matchId: string, userId: string) {
  const res = await fetch(`${API_BASE}/get-messages?match_id=${matchId}&user_id=${userId}`);
  return res.json();
}

// Send a text message
export async function sendMessage(matchId: string, senderId: string, content: string) {
  const res = await fetch(`${API_BASE}/send-message`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ match_id: matchId, sender_id: senderId, content, type: 'text' }),
  });
  return res.json();
}

// Send a voice message
export async function sendVoiceMessage(matchId: string, senderId: string, duration: number) {
  const res = await fetch(`${API_BASE}/send-message`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ match_id: matchId, sender_id: senderId, content: '🎤 Voice note', type: 'voice', voice_duration: duration }),
  });
  return res.json();
}

// Discover profiles
export async function discoverProfiles(userId: string) {
  const res = await fetch(`${API_BASE}/discover?user_id=${userId}`);
  return res.json();
}

// Format timestamp to relative time
export function formatMessageTime(timestamp: string, lang: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const minutes = Math.floor((now - then) / 60000);
  if (minutes < 1) return lang === 'zh' ? '剛剛' : 'Just now';
  if (minutes < 60) return lang === 'zh' ? `${minutes}分鐘前` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === 'zh' ? `${hours}小時前` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === 'zh' ? `${days}日前` : `${days}d ago`;
  return lang === 'zh' ? `${Math.floor(days / 7)}週前` : `${Math.floor(days / 7)}w ago`;
}
