import { supabaseQuery } from './utils/supabase.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'Missing user_id' });

    // Get all active matches where user is involved
    const matches = await supabaseQuery('matches', {
      filters: `status=eq.active&or=(user1_id.eq.${userId},user2_id.eq.${userId})`,
      select: '*'
    });

    // For each match, get partner info and latest message
    const results = await Promise.all(matches.map(async (match) => {
      const partnerId = match.user1_id === userId ? match.user2_id : match.user1_id;

      // Get partner profile
      const partners = await supabaseQuery('users', {
        filters: `id=eq.${partnerId}`,
        select: 'id,username,display_name,gender,school,faculty,mbti,bio,sexuality,interests,age,district,relationship_type,religion'
      });
      const partner = partners[0] || null;

      // Get latest message
      const latestMsgs = await supabaseQuery('messages', {
        filters: `match_id=eq.${match.id}&order=created_at.desc&limit=1`,
        select: '*'
      });
      const lastMsg = latestMsgs[0] || null;

      // Count unread messages
      const unreadMsgs = await supabaseQuery('messages', {
        filters: `match_id=eq.${match.id}&sender_id=neq.${userId}&read=eq.false`,
        select: 'id'
      });

      // Count total messages for blur level calculation
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
        last_message_type: lastMsg?.type || null,
        unread_count: unreadMsgs.length,
        message_count: allMsgs.length,
        blur_level: Math.min(100, Math.floor((allMsgs.length / 20) * 100)),
      };
    }));

    return res.status(200).json({ matches: results });
  } catch (err) {
    console.error('Get matches error:', err);
    return res.status(500).json({ error: 'Failed to get matches' });
  }
}
