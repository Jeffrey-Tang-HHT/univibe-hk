import { insertUser, getUserByUsername, getUserByEmail } from './utils/supabase.mjs';
import { hashPassword } from './utils/password.mjs';
import { createToken } from './utils/token.mjs';
import { setCors, rateLimit, getClientIP, sanitizeText } from './utils/security.mjs';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);

  // Rate limit: 5 registrations per IP per hour
  if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
    return res.status(429).json({ error: '註冊次數過多，請稍後再試' });
  }

  try {
    const { email, username, password, displayName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: '請填寫所有必填欄位' });
    }
    if (typeof email !== 'string' || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: '無效的輸入' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: '用戶名：3-20個字符，只能包含字母、數字和底線' });
    }
    // Stronger password policy
    if (password.length < 8) {
      return res.status(400).json({ error: '密碼至少8個字符' });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ error: '密碼需包含字母和數字' });
    }
    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: '電郵格式無效' });
    }

    const existingUsername = await getUserByUsername(username.toLowerCase());
    if (existingUsername) return res.status(409).json({ error: '此用戶名已被使用' });

    const existingEmail = await getUserByEmail(email.toLowerCase());
    if (existingEmail) return res.status(409).json({ error: '此電郵已被註冊' });

    const passwordHash = await hashPassword(password);
    const [user] = await insertUser({
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      password_hash: passwordHash,
      display_name: sanitizeText(displayName || username, 50),
    });

    const token = createToken(user.id, user.username);
    return res.status(201).json({
      success: true, token,
      user: { id: user.id, email: user.email, username: user.username, displayName: user.display_name }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: '註冊失敗，請稍後再試' });
  }
}
