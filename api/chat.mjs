import { supabaseQuery } from '../lib/supabase.mjs';
import { setCors, requireAuth, authenticate, isValidUUID, rateLimit, getClientIP, sanitizeContent, checkBodySize, validateImageBytes } from '../lib/security.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;
  const ip = getClientIP(req);

  // Reject oversized request bodies (10MB max for image uploads, 1MB otherwise)
  if (req.method === 'POST') {
    const maxSize = action === 'send-message' ? 10 * 1024 * 1024 : 1024 * 1024;
    if (!checkBodySize(req, res, maxSize)) return;
  }

  try {
    // ========== HEARTBEAT ==========
    if (action === 'heartbeat' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      if (!rateLimit(`heartbeat:${user.userId}`, 30, 60 * 1000)) return res.status(429).end();
      await supabaseQuery('users', {
        method: 'PATCH',
        filters: `id=eq.${user.userId}`,
        body: { last_seen: new Date().toISOString() }
      });
      return res.status(200).json({ success: true });
    }

    // ========== DISCOVER ==========
    if (action === 'discover' && req.method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const userId = user.userId;

      const allUsers = await supabaseQuery('users', {
        filters: `id=neq.${userId}&mbti=not.is.null`,
        select: 'id,username,display_name,gender,school,faculty,mbti,bio,sexuality,interests,age,district,relationship_type,religion,avatar_url,photos,last_seen'
      });

      const matches = await supabaseQuery('matches', {
        filters: `or=(user1_id.eq.${userId},user2_id.eq.${userId})`,
        select: 'user1_id,user2_id'
      });

      const matchedIds = new Set();
      matches.forEach(m => {
        if (m.user1_id !== userId) matchedIds.add(m.user1_id);
        if (m.user2_id !== userId) matchedIds.add(m.user2_id);
      });

      let blockedIds = new Set();
      try {
        const blocks = await supabaseQuery('blocks', {
          filters: `or=(blocker_id.eq.${userId},blocked_id.eq.${userId})`,
          select: 'blocker_id,blocked_id'
        });
        blocks.forEach(b => {
          if (b.blocker_id !== userId) blockedIds.add(b.blocker_id);
          if (b.blocked_id !== userId) blockedIds.add(b.blocked_id);
        });
      } catch (e) {}

      const available = allUsers
        .filter(u => !matchedIds.has(u.id))
        .filter(u => !blockedIds.has(u.id))
        .filter(u => u.interests && u.interests.length >= 3)
        .map(u => {
          let photos = [];
          try { photos = typeof u.photos === 'string' ? JSON.parse(u.photos) : (Array.isArray(u.photos) ? u.photos : []); } catch { photos = []; }
          return {
            id: u.id,
            gender: u.gender || 'other',
            age: u.age || 20,
            mbti: u.mbti,
            institution: u.school || '',
            faculty: u.faculty || '',
            major: u.faculty || '',
            district: u.district || '',
            relationshipType: u.relationship_type || '',
            religion: u.religion || '',
            interests: u.interests || [],
            bio: u.bio || '',
            sexuality: u.sexuality || '',
            blurLevel: 0,
            messages: 0,
            compatibility: Math.floor(60 + Math.random() * 35),
            avatar_url: u.avatar_url || null,
            photos: photos.filter(Boolean),
            last_seen: u.last_seen || null,
          };
        });

      return res.status(200).json({ profiles: available });
    }

    // ========== CREATE MATCH ==========
    if (action === 'create-match' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      const { user2_id } = req.body;
      if (!isValidUUID(user2_id)) return res.status(400).json({ error: 'Invalid user ID' });

      const user1_id = user.userId;
      const [id1, id2] = [user1_id, user2_id].sort();
      const existing = await supabaseQuery('matches', {
        filters: `user1_id=eq.${id1}&user2_id=eq.${id2}&status=eq.active`
      });
      if (existing.length > 0) return res.status(200).json({ match: existing[0], existing: true });
      const result = await supabaseQuery('matches', { method: 'POST', body: { user1_id: id1, user2_id: id2, status: 'active' } });
      return res.status(201).json({ match: result[0], existing: false });
    }

    // ========== GET MATCHES ==========
    if (action === 'get-matches' && req.method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const userId = user.userId;

      const matches = await supabaseQuery('matches', {
        filters: `status=eq.active&or=(user1_id.eq.${userId},user2_id.eq.${userId})`,
        select: '*'
      });

      let blockedIds = new Set();
      try {
        const blocks = await supabaseQuery('blocks', { filters: `blocker_id=eq.${userId}`, select: 'blocked_id' });
        blocks.forEach(b => blockedIds.add(b.blocked_id));
      } catch (e) {}

      const results = await Promise.all(matches.map(async (match) => {
        const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;
        if (blockedIds.has(partnerId)) return null;

        const partners = await supabaseQuery('users', {
          filters: `id=eq.${partnerId}`,
          select: 'id,username,display_name,gender,school,faculty,mbti,bio,sexuality,interests,age,district,relationship_type,religion,avatar_url,photos,last_seen'
        });
        const partner = partners[0] || null;

        const latestMsgs = await supabaseQuery('messages', {
          filters: `match_id=eq.${match.id}&order=created_at.desc&limit=1`, select: '*'
        });
        const lastMsg = latestMsgs[0] || null;

        const unreadMsgs = await supabaseQuery('messages', {
          filters: `match_id=eq.${match.id}&sender_id=neq.${userId}&read=eq.false`, select: 'id'
        });

        const allMsgs = await supabaseQuery('messages', {
          filters: `match_id=eq.${match.id}`, select: 'id'
        });

        return {
          match_id: match.id,
          partner,
          status: match.status,
          created_at: match.created_at,
          expires_at: match.expires_at,
          last_message: lastMsg?.content || null,
          last_message_at: lastMsg?.created_at || null,
          unread_count: unreadMsgs.length,
          message_count: allMsgs.length,
          blur_level: Math.min(100, Math.floor((allMsgs.length / 20) * 100)),
        };
      }));

      return res.status(200).json({ matches: results.filter(Boolean) });
    }

    // ========== SEND MESSAGE ==========
    if (action === 'send-message' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      const senderId = user.userId;
      const { match_id, content, type = 'text', voice_duration, image_base64 } = req.body;

      if (!match_id || !isValidUUID(match_id)) return res.status(400).json({ error: 'Invalid match_id' });
      if (type === 'text' && !content?.trim()) return res.status(400).json({ error: 'Message content required' });
      if (type === 'image' && !image_base64) return res.status(400).json({ error: 'Missing image data' });

      // Rate limit messages: 30 per minute per user
      if (!rateLimit(`msg:${senderId}`, 30, 60 * 1000)) {
        return res.status(429).json({ error: '訊息發送太快' });
      }

      const matches = await supabaseQuery('matches', { filters: `id=eq.${match_id}&status=eq.active` });
      if (matches.length === 0) return res.status(404).json({ error: 'Match not found or expired' });

      const match = matches[0];
      // Verify sender is part of this match
      if (match.user1_id !== senderId && match.user2_id !== senderId) {
        return res.status(403).json({ error: 'Not part of this match' });
      }

      if (new Date(match.expires_at) < new Date() && !match.last_message_at) {
        await supabaseQuery('matches', { method: 'PATCH', filters: `id=eq.${match_id}`, body: { status: 'expired' } });
        return res.status(410).json({ error: 'Match has expired' });
      }

      // Sanitize text content
      const sanitizedContent = type === 'text' ? sanitizeContent(content, 5000) : (content || '');

      let image_url = null;
      if (type === 'image' && image_base64) {
        const imgMatches = image_base64.match(/^data:image\/(jpeg|png|webp|gif);base64,(.+)$/);
        if (!imgMatches) return res.status(400).json({ error: 'Invalid image format. Only jpeg/png/webp/gif allowed.' });
        const mimeType = `image/${imgMatches[1]}`;
        const raw = imgMatches[2];
        const buffer = Buffer.from(raw, 'base64');

        if (buffer.length > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'Image too large (max 5MB)' });
        }

        // Verify actual file content matches declared MIME type
        if (!validateImageBytes(buffer, mimeType)) {
          return res.status(400).json({ error: 'File content does not match declared image type' });
        }

        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('gif') ? 'gif' : 'jpg';
        const fileName = `chat_${match_id}_${Date.now()}.${ext}`;

        try {
          const uploadRes = await fetch(
            `${SUPABASE_URL}/storage/v1/object/chat-images/${fileName}`,
            {
              method: 'POST',
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': mimeType,
                'x-upsert': 'true',
              },
              body: buffer,
            }
          );
          if (uploadRes.ok) {
            image_url = `${SUPABASE_URL}/storage/v1/object/public/chat-images/${fileName}`;
          } else {
            return res.status(500).json({ error: 'Image upload failed' });
          }
        } catch (e) {
          return res.status(500).json({ error: 'Image upload failed' });
        }
      }

      const msgBody = { match_id, sender_id: senderId, content: sanitizedContent || (type === 'image' ? '📷' : ''), type };
      if (type === 'voice' && voice_duration) msgBody.voice_duration = Math.min(Number(voice_duration) || 0, 300);
      if (type === 'image' && image_url) msgBody.image_url = image_url;
      const result = await supabaseQuery('messages', { method: 'POST', body: msgBody });

      if (!match.last_message_at) {
        await supabaseQuery('matches', {
          method: 'PATCH', filters: `id=eq.${match_id}`,
          body: { expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
        });
      }

      return res.status(201).json({ message: result[0] });
    }

    // ========== GET MESSAGES ==========
    if (action === 'get-messages' && req.method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const userId = user.userId;
      const { match_id } = req.query;

      if (!match_id || !isValidUUID(match_id)) return res.status(400).json({ error: 'Invalid match_id' });

      const matches = await supabaseQuery('matches', {
        filters: `id=eq.${match_id}&or=(user1_id.eq.${userId},user2_id.eq.${userId})`
      });
      if (matches.length === 0) return res.status(403).json({ error: 'Not part of this match' });

      const messages = await supabaseQuery('messages', {
        filters: `match_id=eq.${match_id}&order=created_at.asc`,
        select: 'id,sender_id,content,type,voice_duration,image_url,read,created_at,deleted_by'
      });

      await supabaseQuery('messages', {
        method: 'PATCH',
        filters: `match_id=eq.${match_id}&sender_id=neq.${userId}&read=eq.false`,
        body: { read: true }
      });

      return res.status(200).json({
        messages: messages
          .filter(m => !(m.deleted_by || []).includes(userId))
          .map(m => ({
            id: m.id, text: m.content, type: m.type, voice_duration: m.voice_duration,
            image_url: m.image_url || null,
            isMe: m.sender_id === userId, read: m.read, time: m.created_at, sender_id: m.sender_id,
          }))
      });
    }

    // ========== UNMATCH ==========
    if (action === 'unmatch' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      const { match_id } = req.body;
      if (!match_id || !isValidUUID(match_id)) return res.status(400).json({ error: 'Invalid match_id' });

      const matches = await supabaseQuery('matches', {
        filters: `id=eq.${match_id}&or=(user1_id.eq.${user.userId},user2_id.eq.${user.userId})`
      });
      if (matches.length === 0) return res.status(403).json({ error: 'Not part of this match' });
      await supabaseQuery('messages', { method: 'DELETE', filters: `match_id=eq.${match_id}` });
      await supabaseQuery('matches', { method: 'DELETE', filters: `id=eq.${match_id}` });
      return res.status(200).json({ success: true });
    }

    // ========== DELETE MESSAGE ==========
    if (action === 'delete-message' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      const { message_id, for_both } = req.body;
      if (!message_id || !isValidUUID(message_id)) return res.status(400).json({ error: 'Invalid message_id' });

      if (for_both) {
        const msgs = await supabaseQuery('messages', { filters: `id=eq.${message_id}&sender_id=eq.${user.userId}` });
        if (msgs.length === 0) return res.status(403).json({ error: 'Can only delete your own messages' });
        await supabaseQuery('messages', { method: 'DELETE', filters: `id=eq.${message_id}` });
      } else {
        const msgs = await supabaseQuery('messages', { filters: `id=eq.${message_id}`, select: 'id,deleted_by' });
        if (msgs.length === 0) return res.status(404).json({ error: 'Message not found' });
        const deletedBy = msgs[0].deleted_by || [];
        if (!deletedBy.includes(user.userId)) {
          deletedBy.push(user.userId);
          await supabaseQuery('messages', { method: 'PATCH', filters: `id=eq.${message_id}`, body: { deleted_by: deletedBy } });
        }
      }
      return res.status(200).json({ success: true });
    }

    // ========== BLOCK USER ==========
    if (action === 'block' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      const { blocked_id } = req.body;
      if (!isValidUUID(blocked_id)) return res.status(400).json({ error: 'Invalid user ID' });
      if (blocked_id === user.userId) return res.status(400).json({ error: 'Cannot block yourself' });

      try {
        await supabaseQuery('blocks', { method: 'POST', body: { blocker_id: user.userId, blocked_id } });
      } catch (e) { /* already blocked */ }

      const matches = await supabaseQuery('matches', {
        filters: `status=eq.active&or=(and(user1_id.eq.${user.userId},user2_id.eq.${blocked_id}),and(user1_id.eq.${blocked_id},user2_id.eq.${user.userId}))`,
        select: 'id'
      });
      for (const match of matches) {
        await supabaseQuery('messages', { method: 'DELETE', filters: `match_id=eq.${match.id}` });
        await supabaseQuery('matches', { method: 'DELETE', filters: `id=eq.${match.id}` });
      }
      return res.status(200).json({ success: true });
    }

    // ========== REPORT USER ==========
    if (action === 'report' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      const { reported_id, reason } = req.body;
      if (!isValidUUID(reported_id)) return res.status(400).json({ error: 'Invalid user ID' });
      if (!rateLimit(`report:${user.userId}`, 10, 60 * 60 * 1000)) {
        return res.status(429).json({ error: '舉報太頻繁' });
      }
      await supabaseQuery('reports', { method: 'POST', body: { reporter_id: user.userId, reported_id, reason: sanitizeContent(reason || '', 1000) } });
      return res.status(200).json({ success: true });
    }

    // ========== LIKE USER ==========
    if (action === 'like-user' && req.method === 'POST') {
      const user = requireAuth(req, res); if (!user) return;
      const likerId = user.userId;
      const { liked_id, is_super = false } = req.body;
      if (!isValidUUID(liked_id)) return res.status(400).json({ error: 'Invalid user ID' });
      if (liked_id === likerId) return res.status(400).json({ error: 'Cannot like yourself' });

      // Rate limit likes
      if (!rateLimit(`like:${likerId}`, 50, 60 * 60 * 1000)) {
        return res.status(429).json({ error: '操作太頻繁' });
      }

      if (is_super) {
        const users = await supabaseQuery('users', { filters: `id=eq.${likerId}`, select: 'super_likes_remaining,last_super_like_reset' });
        const u = users[0];
        if (u) {
          const today = new Date().toISOString().split('T')[0];
          let remaining = u.super_likes_remaining ?? 3;
          if (u.last_super_like_reset !== today) {
            remaining = 3;
            await supabaseQuery('users', { method: 'PATCH', filters: `id=eq.${likerId}`, body: { super_likes_remaining: 3, last_super_like_reset: today } });
          }
          if (remaining <= 0) return res.status(400).json({ error: 'No super likes remaining today' });
          await supabaseQuery('users', { method: 'PATCH', filters: `id=eq.${likerId}`, body: { super_likes_remaining: remaining - 1 } });
        }
      }

      try {
        await supabaseQuery('likes', { method: 'POST', body: { liker_id: likerId, liked_id, is_super: !!is_super } });
      } catch (e) {
        await supabaseQuery('likes', { method: 'PATCH', filters: `liker_id=eq.${likerId}&liked_id=eq.${liked_id}`, body: { is_super: !!is_super } });
      }

      let matched = false;
      try {
        const mutual = await supabaseQuery('likes', { filters: `liker_id=eq.${liked_id}&liked_id=eq.${likerId}` });
        if (mutual.length > 0) {
          const existingMatch = await supabaseQuery('matches', {
            filters: `or=(and(user1_id.eq.${likerId},user2_id.eq.${liked_id}),and(user1_id.eq.${liked_id},user2_id.eq.${likerId}))&status=eq.active`
          });
          if (existingMatch.length === 0) {
            await supabaseQuery('matches', { method: 'POST', body: { user1_id: likerId, user2_id: liked_id, status: 'active' } });
            matched = true;
          }
        }
      } catch (e) {}

      return res.status(200).json({ success: true, is_super: !!is_super, matched });
    }

    // ========== GET LIKED BY ==========
    if (action === 'get-liked-by' && req.method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const userId = user.userId;

      const likes = await supabaseQuery('likes', {
        filters: `liked_id=eq.${userId}&order=created_at.desc`,
        select: '*'
      });

      const results = await Promise.all(likes.map(async (like) => {
        try {
          const users = await supabaseQuery('users', {
            filters: `id=eq.${like.liker_id}`,
            select: 'id,username,display_name,gender,school,faculty,mbti,bio,sexuality,interests,age,district,relationship_type,religion,avatar_url,photos,last_seen'
          });
          const u = users[0];
          if (!u) return null;
          let photos = [];
          try { photos = typeof u.photos === 'string' ? JSON.parse(u.photos) : (Array.isArray(u.photos) ? u.photos : []); } catch { photos = []; }
          return {
            like_id: like.id, is_super: like.is_super, liked_at: like.created_at,
            profile: {
              id: u.id, gender: u.gender || 'other', age: u.age || 20, mbti: u.mbti || '????',
              institution: u.school || '', faculty: u.faculty || '', interests: u.interests || [],
              bio: u.bio || '', sexuality: u.sexuality || '', avatar_url: u.avatar_url || null,
              photos: photos.filter(Boolean), last_seen: u.last_seen || null,
            }
          };
        } catch (e) { return null; }
      }));

      let matchedIds = new Set();
      try {
        const matches = await supabaseQuery('matches', {
          filters: `or=(user1_id.eq.${userId},user2_id.eq.${userId})&status=eq.active`,
          select: 'user1_id,user2_id'
        });
        matches.forEach(m => {
          if (m.user1_id !== userId) matchedIds.add(m.user1_id);
          if (m.user2_id !== userId) matchedIds.add(m.user2_id);
        });
      } catch (e) {}

      return res.status(200).json({ liked_by: results.filter(r => r && !matchedIds.has(r.profile.id)) });
    }

    // ========== GET SUPER LIKES REMAINING ==========
    if (action === 'get-super-likes' && req.method === 'GET') {
      const user = requireAuth(req, res); if (!user) return;
      const users = await supabaseQuery('users', { filters: `id=eq.${user.userId}`, select: 'super_likes_remaining,last_super_like_reset' });
      const u = users[0];
      if (!u) return res.status(404).json({ error: 'User not found' });
      const today = new Date().toISOString().split('T')[0];
      let remaining = u.super_likes_remaining ?? 3;
      if (u.last_super_like_reset !== today) remaining = 3;
      return res.status(200).json({ remaining });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
