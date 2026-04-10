import { updateUser, getUserById } from './utils/supabase.mjs';
import { verifyToken } from './utils/token.mjs';
import { setCors, sanitizeText, rateLimit } from './utils/security.mjs';

const ALLOWED_FIELDS = ['display_name', 'avatar_url', 'photos', 'gender', 'sexuality', 'school', 'faculty', 'district', 'mbti', 'age', 'bio', 'relationship_type', 'religion', 'interests', 'language'];
const TEXT_FIELDS = ['display_name', 'gender', 'sexuality', 'school', 'faculty', 'district', 'mbti', 'bio', 'relationship_type', 'religion', 'language'];
const MAX_LENGTHS = { display_name: 50, bio: 2000, school: 100, faculty: 100, district: 100, mbti: 4, gender: 20, sexuality: 30, relationship_type: 30, religion: 30, language: 10 };

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: '未授權' });
    const decoded = verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: '登入已過期，請重新登入' });

    if (!rateLimit(`profile:${decoded.userId}`, 20, 60 * 1000)) {
      return res.status(429).json({ error: '操作太頻繁' });
    }

    const updates = req.body;
    const sanitized = {};
    for (const key of ALLOWED_FIELDS) {
      if (updates[key] !== undefined) {
        if (TEXT_FIELDS.includes(key)) {
          sanitized[key] = sanitizeText(String(updates[key]), MAX_LENGTHS[key] || 200);
        } else if (key === 'age') {
          const age = parseInt(updates[key]);
          if (age >= 16 && age <= 100) sanitized[key] = age;
        } else if (key === 'interests') {
          if (Array.isArray(updates[key])) {
            sanitized[key] = updates[key].slice(0, 20).map(i => sanitizeText(String(i), 50));
          }
        } else {
          sanitized[key] = updates[key];
        }
      }
    }
    if (Object.keys(sanitized).length === 0) return res.status(400).json({ error: '沒有要更新的資料' });

    await updateUser(decoded.userId, sanitized);
    const user = await getUserById(decoded.userId);
    const { password_hash, ...profile } = user;
    return res.status(200).json({ success: true, user: profile, profile });
  } catch (err) {
    console.error('Update profile error:', err);
    return res.status(500).json({ error: '更新失敗' });
  }
}
