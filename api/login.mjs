import { getUserByUsername } from './utils/supabase.mjs';
import { verifyPassword } from './utils/password.mjs';
import { createToken } from './utils/token.mjs';
import { updateLastLogin } from './utils/supabase.mjs';
import { setCors, rateLimit, getClientIP } from './utils/security.mjs';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);

  // Rate limit: 10 login attempts per IP per 15 min
  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: '登入嘗試太頻繁，請15分鐘後再試' });
  }

  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '請輸入用戶名和密碼' });
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: '無效的輸入' });
    }

    // Rate limit per username too (prevents distributed brute-force on one account)
    if (!rateLimit(`login:user:${username.toLowerCase()}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ error: '此帳號登入嘗試太頻繁，請稍後再試' });
    }

    const user = await getUserByUsername(username.toLowerCase());
    if (!user) return res.status(401).json({ error: '用戶名或密碼錯誤' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: '用戶名或密碼錯誤' });

    await updateLastLogin(user.id).catch(() => {});
    const token = createToken(user.id, user.username);

    return res.status(200).json({
      success: true, token,
      user: {
        id: user.id, email: user.email, username: user.username,
        displayName: user.display_name, avatar_url: user.avatar_url,
        gender: user.gender, school: user.school, faculty: user.faculty, mbti: user.mbti,
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: '登入失敗，請稍後再試' });
  }
}
