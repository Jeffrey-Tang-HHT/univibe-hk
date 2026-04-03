import { insertUser, getUserByUsername, getUserByEmail } from './utils/supabase.mjs';
import { hashPassword } from './utils/password.mjs';
import { createToken } from './utils/token.mjs';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, username, password, displayName } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: '請填寫所有必填欄位' });
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ error: '用戶名：3-20個字符，只能包含字母、數字和底線' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密碼至少6個字符' });
    }

    const existingUsername = await getUserByUsername(username.toLowerCase());
    if (existingUsername) return res.status(409).json({ error: '此用戶名已被使用' });

    const existingEmail = await getUserByEmail(email);
    if (existingEmail) return res.status(409).json({ error: '此電郵已被註冊' });

    const passwordHash = await hashPassword(password);
    const [user] = await insertUser({
      email,
      username: username.toLowerCase(),
      password_hash: passwordHash,
      display_name: displayName || username,
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
