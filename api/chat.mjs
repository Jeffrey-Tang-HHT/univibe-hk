import { supabaseQuery } from './utils/supabase.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = req.query.action;

  try {
    // ========== DISCOVER ==========
    if (action === 'discover' && req.method === 'GET') {
      const { user_id } = req.query;
      if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

      const allUsers = await supabaseQuery('users', {
        filters: `id=neq.${user_id}&mbti=not.is.null`,
        select: 'id,username,display_name,gender,school,faculty,mbti,bio,sexuality,interests,age,district,relationship_type,religion'
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

      const available = allUsers
        .filter(u => !matchedIds.has(u.id))
        .filter(u => u.interests && u.interests.length >= 3)
        .map(u => ({
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
        }));

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

      if (existing.length > 0) {
        return res.status(200).json({ match: existing[0], existing: true });
      }

      const result = await supabaseQuery('matches', {
        method: 'POST',
        body: { user1_id: id1, user2_id: id2, status: 'active' }
      });

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

      const results = await Promise.all(matches.map(async (match) => {
        const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;

        const partners = await supabaseQuery('users', {
          filters: `id=eq.${partnerId}`,
          select: 'id,username,display_name,gender,school,faculty,mbti,bio,sexuality,interests,age,district,relationship_type,religion'
        });
        const partner = partners[0] || null;

        const latestMsgs = await supabaseQuery('messages', {
          filters: `match_id=eq.${match.id}&order=created_at.desc&limit=1`,
          select: '*'
        });
        const lastMsg = latestMsgs[0] || null;

        const unreadMsgs = await supabaseQuery('messages', {
          filters: `match_id=eq.${match.id}&sender_id=neq.${userId}&read=eq.false`,
          select: 'id'
        });

        const allMsgs = await supabaseQuery('messages', {
          filters: `match_id=eq.${match.id}`,
          select: 'id'
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

      return res.status(200).json({ matches: results });
    }

    // ========== SEND MESSAGE ==========
    if (action === 'send-message' && req.method === 'POST') {
      const { match_id, sender_id, content, type = 'text', voice_duration } = req.body;
      if (!match_id || !sender_id) return res.status(400).json({ error: 'Missing required fields' });
      if (type === 'text' && !content?.trim()) return res.status(400).json({ error: 'Message content required' });

      const matches = await supabaseQuery('matches', {
        filters: `id=eq.${match_id}&status=eq.active`
      });
      if (matches.length === 0) return res.status(404).json({ error: 'Match not found or expired' });

      const match = matches[0];
      if (match.user1_id !== sender_id && match.user2_id !== sender_id) {
        return res.status(403).json({ error: 'Not part of this match' });
      }

      if (new Date(match.expires_at) < new Date() && !match.last_message_at) {
        await supabaseQuery('matches', { method: 'PATCH', filters: `id=eq.${match_id}`, body: { status: 'expired' } });
        return res.status(410).json({ error: 'Match has expired' });
      }

      const msgBody = { match_id, sender_id, content: content || '', type };
      if (type === 'voice' && voice_duration) msgBody.voice_duration = voice_duration;

      const result = await supabaseQuery('messages', { method: 'POST', body: msgBody });

      if (!match.last_message_at) {
        await supabaseQuery('matches', {
          method: 'PATCH',
          filters: `id=eq.${match_id}`,
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
        select: 'id,sender_id,content,type,voice_duration,read,created_at,deleted_by'
      });

      await supabaseQuery('messages', {
        method: 'PATCH',
        filters: `match_id=eq.${match_id}&sender_id=neq.${user_id}&read=eq.false`,
        body: { read: true }
      });

      return res.status(200).json({
        messages: messages
          .filter(m => {
            // Filter out messages deleted "for me"
            const deletedBy = m.deleted_by || [];
            return !deletedBy.includes(user_id);
          })
          .map(m => ({
            id: m.id,
            text: m.content,
            type: m.type,
            voice_duration: m.voice_duration,
            isMe: m.sender_id === user_id,
            read: m.read,
            time: m.created_at,
            sender_id: m.sender_id,
          }))
      });
    }

    // ========== UNMATCH ==========
    if (action === 'unmatch' && req.method === 'POST') {
      const { match_id, user_id } = req.body;
      if (!match_id || !user_id) return res.status(400).json({ error: 'Missing match_id or user_id' });

      // Verify user is part of this match
      const matches = await supabaseQuery('matches', {
        filters: `id=eq.${match_id}&or=(user1_id.eq.${user_id},user2_id.eq.${user_id})`
      });
      if (matches.length === 0) return res.status(403).json({ error: 'Not part of this match' });

      // Delete all messages for this match
      await supabaseQuery('messages', {
        method: 'DELETE',
        filters: `match_id=eq.${match_id}`
      });

      // Delete the match
      await supabaseQuery('matches', {
        method: 'DELETE',
        filters: `id=eq.${match_id}`
      });

      return res.status(200).json({ success: true });
    }

    // ========== DELETE MESSAGE ==========
    if (action === 'delete-message' && req.method === 'POST') {
      const { message_id, user_id, for_both } = req.body;
      if (!message_id || !user_id) return res.status(400).json({ error: 'Missing message_id or user_id' });

      if (for_both) {
        // Delete for everyone — only the sender can do this
        const msgs = await supabaseQuery('messages', {
          filters: `id=eq.${message_id}&sender_id=eq.${user_id}`
        });
        if (msgs.length === 0) return res.status(403).json({ error: 'Can only delete your own messages for everyone' });

        await supabaseQuery('messages', {
          method: 'DELETE',
          filters: `id=eq.${message_id}`
        });
      } else {
        // Delete for me — add user_id to deleted_by array
        const msgs = await supabaseQuery('messages', {
          filters: `id=eq.${message_id}`,
          select: 'id,deleted_by'
        });
        if (msgs.length === 0) return res.status(404).json({ error: 'Message not found' });

        const deletedBy = msgs[0].deleted_by || [];
        if (!deletedBy.includes(user_id)) {
          deletedBy.push(user_id);
          await supabaseQuery('messages', {
            method: 'PATCH',
            filters: `id=eq.${message_id}`,
            body: { deleted_by: deletedBy }
          });
        }
      }

      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action. Use ?action=discover|create-match|get-matches|send-message|get-messages|unmatch|delete-message' });
  } catch (err) {
    console.error('Chat API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
