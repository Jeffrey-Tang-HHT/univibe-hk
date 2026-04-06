import { supabaseQuery } from './utils/supabase.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

    // Get all users who have set up a dating profile (have mbti + interests)
    const allUsers = await supabaseQuery('users', {
      filters: `id=neq.${user_id}&mbti=not.is.null`,
      select: 'id,username,display_name,gender,school,faculty,mbti,bio,sexuality,interests,age,district,relationship_type,religion'
    });

    // Filter out users the current user has already matched with
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
  } catch (err) {
    console.error('Discover error:', err);
    return res.status(500).json({ error: 'Failed to get profiles' });
  }
}
