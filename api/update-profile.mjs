import { updateUser, getUserById } from './utils/supabase.mjs';
import { verifyToken } from './utils/token.mjs';
const ALLOWED_FIELDS = ['display_name', 'avatar_url', 'gender', 'sexuality', 'school', 'faculty', 'district', 'mbti', 'age', 'bio', 'relationship_type', 'religion', 'interests', 'language'];
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Accept both POST and PATCH
  if (req.method !== 'POST' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: '未授權' });
    const decoded = verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: '登入已過期，請重新登入' });
    const updates = req.body;
    const sanitized = {};
    for (const key of ALLOWED_FIELDS) {
      if (updates[key] !== undefined) sanitized[key] = updates[key];
    }
    if (Object.keys(sanitized).length === 0) return res.status(400).json({ error: '沒有要更新的資料' });
    await updateUser(decoded.userId, sanitized);
    const user = await getUserById(decoded.userId);
    const { password_hash, ...profile } = user;
    // Return both keys for compatibility
    return res.status(200).json({ success: true, user: profile, profile });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: '更新失敗' });
  }
}
