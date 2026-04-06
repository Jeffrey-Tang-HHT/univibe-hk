import { supabaseQuery } from './utils/supabase.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { match_id, sender_id, content, type = 'text', voice_duration } = req.body;
    if (!match_id || !sender_id) return res.status(400).json({ error: 'Missing required fields' });
    if (type === 'text' && !content?.trim()) return res.status(400).json({ error: 'Message content required' });

    // Verify match exists and is active
    const matches = await supabaseQuery('matches', {
      filters: `id=eq.${match_id}&status=eq.active`
    });
    if (matches.length === 0) return res.status(404).json({ error: 'Match not found or expired' });

    const match = matches[0];
    // Verify sender is part of this match
    if (match.user1_id !== sender_id && match.user2_id !== sender_id) {
      return res.status(403).json({ error: 'Not part of this match' });
    }

    // Check if match has expired (48hr)
    if (new Date(match.expires_at) < new Date() && !match.last_message_at) {
      await supabaseQuery('matches', { method: 'PATCH', filters: `id=eq.${match_id}`, body: { status: 'expired' } });
      return res.status(410).json({ error: 'Match has expired' });
    }

    // Insert message
    const msgBody = { match_id, sender_id, content: content || '', type };
    if (type === 'voice' && voice_duration) msgBody.voice_duration = voice_duration;

    const result = await supabaseQuery('messages', { method: 'POST', body: msgBody });

    // If this is the first message, extend expiry (match stays active as long as people chat)
    if (!match.last_message_at) {
      await supabaseQuery('matches', {
        method: 'PATCH',
        filters: `id=eq.${match_id}`,
        body: { expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() }
      });
    }

    return res.status(201).json({ message: result[0] });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
}
