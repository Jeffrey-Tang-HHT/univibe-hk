import { supabaseQuery } from './utils/supabase.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { match_id, user_id } = req.query;
    if (!match_id || !user_id) return res.status(400).json({ error: 'Missing match_id or user_id' });

    // Verify user is part of this match
    const matches = await supabaseQuery('matches', {
      filters: `id=eq.${match_id}&or=(user1_id.eq.${user_id},user2_id.eq.${user_id})`
    });
    if (matches.length === 0) return res.status(403).json({ error: 'Not part of this match' });

    // Get all messages ordered by time
    const messages = await supabaseQuery('messages', {
      filters: `match_id=eq.${match_id}&order=created_at.asc`,
      select: 'id,sender_id,content,type,voice_duration,read,created_at'
    });

    // Mark unread messages from the OTHER person as read
    await supabaseQuery('messages', {
      method: 'PATCH',
      filters: `match_id=eq.${match_id}&sender_id=neq.${user_id}&read=eq.false`,
      body: { read: true }
    });

    return res.status(200).json({
      messages: messages.map(m => ({
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
  } catch (err) {
    console.error('Get messages error:', err);
    return res.status(500).json({ error: 'Failed to get messages' });
  }
}
