import { supabaseQuery } from './utils/supabase.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user1_id, user2_id } = req.body;
    if (!user1_id || !user2_id) return res.status(400).json({ error: 'Missing user IDs' });

    // Ensure consistent ordering (smaller UUID first) to prevent duplicates
    const [id1, id2] = [user1_id, user2_id].sort();

    // Check if match already exists
    const existing = await supabaseQuery('matches', {
      filters: `user1_id=eq.${id1}&user2_id=eq.${id2}&status=eq.active`
    });

    if (existing.length > 0) {
      return res.status(200).json({ match: existing[0], existing: true });
    }

    // Create new match
    const result = await supabaseQuery('matches', {
      method: 'POST',
      body: { user1_id: id1, user2_id: id2, status: 'active' }
    });

    return res.status(201).json({ match: result[0], existing: false });
  } catch (err) {
    console.error('Create match error:', err);
    return res.status(500).json({ error: 'Failed to create match' });
  }
}
