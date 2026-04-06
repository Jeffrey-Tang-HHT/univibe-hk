import { supabaseQuery } from './utils/supabase.mjs';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  try {
    // ========== HEARTBEAT (update last_seen) ==========
    if (action === 'heartbeat' && req.method === 'POST') {
      const { user_id } = req.body;
      if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
      await supabaseQuery('users', {
        method: 'PATCH',
        filters: `id=eq.${user_id}`,
        body: { last_seen: new Date().toISOString() }
      });
      return res.status(200).json({ success: true });
    }

    // ========== DISCOVER ==========
    if (action === 'discover' && req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

      const allUsers = await supabaseQuery('users', {
        filters: `id=neq.${user_id}&mbti=not.is.null`,
        select: 'id,username,display_name,gender,school,faculty,mbti,bio,sexuality,interests,age,district,relationship_type,religion,avatar_url,photos,last_seen'
      });

      const matches = await supabaseQuery('matches', {
        filters: `or=(user1_id.eq.${user_id},user2_id.eq.${user_id})`,
        select: 'user1_id,user2_id'
      });

      const matchedIds = new Set();
      matches.forEach(m => {
        if (m.user1_id !== user_id) matchedIds.add(m.user1_id);
        if (m.user2_id !== user_id) matchedIds.add(m.user2_id);
      });

      let blockedIds = new Set();
      try {
        const blocks = await supabaseQuery('blocks', {
          filters: `or=(blocker_id.eq.${user_id},blocked_id.eq.${user_id})`,
          select: 'blocker_id,blocked_id'
        });
        blocks.forEach(b => {
          if (b.blocker_id !== user_id) blockedIds.add(b.blocker_id);
          if (b.blocked_id !== user_id) blockedIds.add(b.blocked_id);
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
      const { user1_id, user2_id } = req.body;
      if (!user1_id || !user2_id) return res.status(400).json({ error: 'Missing user IDs' });
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
      const userId = req.query.user_id;
      if (!userId) return res.status(400).json({ error: 'Missing user_id' });

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
      const { match_id, sender_id, content, type = 'text', voice_duration, image_base64 } = req.body;
      if (!match_id || !sender_id) return res.status(400).json({ error: 'Missing required fields' });
      if (type === 'text' && !content?.trim()) return res.status(400).json({ error: 'Message content required' });
      if (type === 'image' && !image_base64) return res.status(400).json({ error: 'Missing image data' });

      const matches = await supabaseQuery('matches', { filters: `id=eq.${match_id}&status=eq.active` });
      if (matches.length === 0) return res.status(404).json({ error: 'Match not found or expired' });

      const match = matches[0];
      if (match.user1_id !== sender_id && match.user2_id !== sender_id) {
        return res.status(403).json({ error: 'Not part of this match' });
      }

      if (new Date(match.expires_at) < new Date() && !match.last_message_at) {
        await supabaseQuery('matches', { method: 'PATCH', filters: `id=eq.${match_id}`, body: { status: 'expired' } });
        return res.status(410).json({ error: 'Match has expired' });
      }

      let image_url = null;
      if (type === 'image' && image_base64) {
        // Upload image to Supabase Storage
        const imgMatches = image_base64.match(/^data:image\/(jpeg|png|webp|gif);base64,(.+)$/);
        const mimeType = imgMatches ? `image/${imgMatches[1]}` : 'image/jpeg';
        const raw = imgMatches ? imgMatches[2] : image_base64;
        const buffer = Buffer.from(raw, 'base64');

        if (buffer.length > 5 * 1024 * 1024) {
          return res.status(400).json({ error: 'Image too large (max 5MB)' });
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
            // Fallback: store as data URL (truncated for safety)
            image_url = `data:${mimeType};base64,${raw.substring(0, 800000)}`;
          }
        } catch (e) {
          image_url = `data:${mimeType};base64,${raw.substring(0, 800000)}`;
        }
      }

      const msgBody = { match_id, sender_id, content: content || (type === 'image' ? '📷' : ''), type };
      if (type === 'voice' && voice_duration) msgBody.voice_duration = voice_duration;
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
      const { match_id, user_id } = req.query;
      if (!match_id || !user_id) return res.status(400).json({ error: 'Missing match_id or user_id' });

      const matches = await supabaseQuery('matches', {
        filters: `id=eq.${match_id}&or=(user1_id.eq.${user_id},user2_id.eq.${user_id})`
      });
      if (matches.length === 0) return res.status(403).json({ error: 'Not part of this match' });

      const messages = await supabaseQuery('messages', {
        filters: `match_id=eq.${match_id}&order=created_at.asc`,
        select: 'id,sender_id,content,type,voice_duration,image_url,read,created_at,deleted_by'
      });

      await supabaseQuery('messages', {
        method: 'PATCH',
        filters: `match_id=eq.${match_id}&sender_id=neq.${user_id}&read=eq.false`,
        body: { read: true }
      });

      return res.status(200).json({
        messages: messages
          .filter(m => !(m.deleted_by || []).includes(user_id))
          .map(m => ({
            id: m.id, text: m.content, type: m.type, voice_duration: m.voice_duration,
            image_url: m.image_url || null,
            isMe: m.sender_id === user_id, read: m.read, time: m.created_at, sender_id: m.sender_id,
          }))
      });
    }

    // ========== UNMATCH ==========
    if (action === 'unmatch' && req.method === 'POST') {
      const { match_id, user_id } = req.body;
      if (!match_id || !user_id) return res.status(400).json({ error: 'Missing match_id or user_id' });
      const matches = await supabaseQuery('matches', {
        filters: `id=eq.${match_id}&or=(user1_id.eq.${user_id},user2_id.eq.${user_id})`
      });
      if (matches.length === 0) return res.status(403).json({ error: 'Not part of this match' });
      await supabaseQuery('messages', { method: 'DELETE', filters: `match_id=eq.${match_id}` });
      await supabaseQuery('matches', { method: 'DELETE', filters: `id=eq.${match_id}` });
      return res.status(200).json({ success: true });
    }

    // ========== DELETE MESSAGE ==========
    if (action === 'delete-message' && req.method === 'POST') {
      const { message_id, user_id, for_both } = req.body;
      if (!message_id || !user_id) return res.status(400).json({ error: 'Missing message_id or user_id' });
      if (for_both) {
        const msgs = await supabaseQuery('messages', { filters: `id=eq.${message_id}&sender_id=eq.${user_id}` });
        if (msgs.length === 0) return res.status(403).json({ error: 'Can only delete your own messages' });
        await supabaseQuery('messages', { method: 'DELETE', filters: `id=eq.${message_id}` });
      } else {
        const msgs = await supabaseQuery('messages', { filters: `id=eq.${message_id}`, select: 'id,deleted_by' });
        if (msgs.length === 0) return res.status(404).json({ error: 'Message not found' });
        const deletedBy = msgs[0].deleted_by || [];
        if (!deletedBy.includes(user_id)) {
          deletedBy.push(user_id);
          await supabaseQuery('messages', { method: 'PATCH', filters: `id=eq.${message_id}`, body: { deleted_by: deletedBy } });
        }
      }
      return res.status(200).json({ success: true });
    }

    // ========== BLOCK USER ==========
    if (action === 'block' && req.method === 'POST') {
      const { blocker_id, blocked_id } = req.body;
      if (!blocker_id || !blocked_id) return res.status(400).json({ error: 'Missing user IDs' });
      try {
        await supabaseQuery('blocks', { method: 'POST', body: { blocker_id, blocked_id } });
      } catch (e) { /* already blocked */ }

      // Also unmatch
      const matches = await supabaseQuery('matches', {
        filters: `status=eq.active&or=(and(user1_id.eq.${blocker_id},user2_id.eq.${blocked_id}),and(user1_id.eq.${blocked_id},user2_id.eq.${blocker_id}))`,
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
      const { reporter_id, reported_id, reason } = req.body;
      if (!reporter_id || !reported_id) return res.status(400).json({ error: 'Missing user IDs' });
      await supabaseQuery('reports', { method: 'POST', body: { reporter_id, reported_id, reason: reason || '' } });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
