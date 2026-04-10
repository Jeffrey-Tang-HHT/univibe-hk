import { getUserById } from './utils/supabase.mjs';
import { verifyToken } from './utils/token.mjs';
import { setCors } from './utils/security.mjs';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: '未授權' });
    const decoded = verifyToken(auth.split(' ')[1]);
    if (!decoded) return res.status(401).json({ error: '登入已過期，請重新登入' });

    const user = await getUserById(decoded.userId);
    if (!user) return res.status(404).json({ error: '用戶不存在' });

    const { password_hash, ...profile } = user;
    if (typeof profile.photos === 'string') { try { profile.photos = JSON.parse(profile.photos); } catch { profile.photos = []; } }
    if (!Array.isArray(profile.photos)) profile.photos = [];
    return res.status(200).json({ success: true, user: profile, profile });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: '獲取個人資料失敗' });
  }
}
