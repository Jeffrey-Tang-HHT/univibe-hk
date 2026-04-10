// Chat API helper — all chat operations go through /api/chat?action=xxx

const API = '/api/chat';

function authHeaders() {
  const token = localStorage.getItem('unigo_token');
  return { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
}

export async function createMatch(userId: string, targetId: string) {
  const res = await fetch(`${API}?action=create-match`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ user1_id: userId, user2_id: targetId }),
  });
  return res.json();
}

export async function getMatches(userId: string) {
  const res = await fetch(`${API}?action=get-matches&user_id=${userId}`, { headers: authHeaders() });
  return res.json();
}

export async function getMessages(matchId: string, userId: string) {
  const res = await fetch(`${API}?action=get-messages&match_id=${matchId}&user_id=${userId}`, { headers: authHeaders() });
  return res.json();
}

export async function sendMessage(matchId: string, senderId: string, content: string) {
  const res = await fetch(`${API}?action=send-message`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ match_id: matchId, sender_id: senderId, content, type: 'text' }),
  });
  return res.json();
}

export async function sendVoiceMessage(matchId: string, senderId: string, duration: number) {
  const res = await fetch(`${API}?action=send-message`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ match_id: matchId, sender_id: senderId, content: '🎤', type: 'voice', voice_duration: duration }),
  });
  return res.json();
}

export async function sendImageMessage(matchId: string, senderId: string, imageBase64: string) {
  const res = await fetch(`${API}?action=send-message`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ match_id: matchId, sender_id: senderId, content: '📷', type: 'image', image_base64: imageBase64 }),
  });
  return res.json();
}

export async function discoverProfiles(userId: string) {
  const res = await fetch(`${API}?action=discover&user_id=${userId}`, { headers: authHeaders() });
  return res.json();
}

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

export async function unmatch(matchId: string, userId: string) {
  const res = await fetch(`${API}?action=unmatch`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ match_id: matchId, user_id: userId }),
  });
  return res.json();
}

export async function rematchUser(matchId: string) {
  const res = await fetch(`${API}?action=rematch`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ match_id: matchId }),
  });
  return res.json();
}

export async function getUnmatched(userId: string) {
  const res = await fetch(`${API}?action=get-unmatched&user_id=${userId}`, { headers: authHeaders() });
  return res.json();
}

export async function deleteMessage(messageId: string, userId: string, forBoth: boolean) {
  const res = await fetch(`${API}?action=delete-message`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ message_id: messageId, user_id: userId, for_both: forBoth }),
  });
  return res.json();
}

export async function blockUser(blockerId: string, blockedId: string) {
  const res = await fetch(`${API}?action=block`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ blocker_id: blockerId, blocked_id: blockedId }),
  });
  return res.json();
}

export async function reportUser(reporterId: string, reportedId: string, reason: string) {
  const res = await fetch(`${API}?action=report`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ reporter_id: reporterId, reported_id: reportedId, reason }),
  });
  return res.json();
}

export async function heartbeat(userId: string) {
  const res = await fetch(`${API}?action=heartbeat`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
  return res.json();
}

export async function uploadAvatar(imageBase64: string, index?: number): Promise<{ success: boolean; avatar_url?: string; photos?: string[]; index?: number }> {
  const res = await fetch('/api/upload-avatar', {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ image_base64: imageBase64, index: index ?? -1 }),
  });
  return res.json();
}

export async function deletePhoto(index: number): Promise<{ success: boolean; photos?: string[]; avatar_url?: string }> {
  const res = await fetch('/api/upload-avatar', {
    method: 'DELETE', headers: authHeaders(),
    body: JSON.stringify({ index }),
  });
  return res.json();
}

export function getOnlineStatus(lastSeen: string | null, lang: string): { online: boolean; text: string } {
  if (!lastSeen) return { online: false, text: lang === 'zh' ? '離線' : 'Offline' };
  const diff = Date.now() - new Date(lastSeen).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 5) return { online: true, text: lang === 'zh' ? '在線' : 'Online' };
  if (minutes < 60) return { online: false, text: lang === 'zh' ? `${minutes}分鐘前在線` : `${minutes}m ago` };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { online: false, text: lang === 'zh' ? `${hours}小時前在線` : `${hours}h ago` };
  return { online: false, text: lang === 'zh' ? `${Math.floor(hours / 24)}日前在線` : `${Math.floor(hours / 24)}d ago` };
}

// ========== LIKES / SUPER LIKE ==========

export async function likeUser(likerId: string, likedId: string, isSuper = false) {
  const res = await fetch(`${API}?action=like-user`, {
    method: 'POST', headers: authHeaders(),
    body: JSON.stringify({ liker_id: likerId, liked_id: likedId, is_super: isSuper }),
  });
  return res.json();
}

export async function getLikedBy(userId: string) {
  const res = await fetch(`${API}?action=get-liked-by&user_id=${userId}`, { headers: authHeaders() });
  return res.json();
}

export async function getSuperLikesRemaining(userId: string) {
  const res = await fetch(`${API}?action=get-super-likes&user_id=${userId}`, { headers: authHeaders() });
  return res.json();
}
