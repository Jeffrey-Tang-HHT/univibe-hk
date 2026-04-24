import { hashPassword, verifyPassword } from '../lib/password.mjs';
import { setCors, rateLimit, getClientIP } from '../lib/security.mjs';
import { getUserByUsername, updateLastLogin, updateUser } from '../lib/supabase.mjs';
import { createToken } from '../lib/token.mjs';

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);

  if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid request payload.' });
    }

    if (!rateLimit(`login:user:${username.toLowerCase()}`, 5, 15 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many attempts for this account. Please try again later.' });
    }

    const user = await getUserByUsername(username.toLowerCase());
    if (!user) return res.status(401).json({ error: 'Invalid username or password.' });

    const { valid, needsRehash } = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password.' });

    await updateLastLogin(user.id).catch(() => {});
    if (needsRehash) {
      hashPassword(password)
        .then(passwordHash => updateUser(user.id, { password_hash: passwordHash }))
        .catch(() => {});
    }

    const token = createToken(user.id, user.username);
    const { password_hash, ...profile } = user;
    if (typeof profile.photos === 'string') {
      try {
        profile.photos = JSON.parse(profile.photos);
      } catch {
        profile.photos = [];
      }
    }
    if (!Array.isArray(profile.photos)) profile.photos = [];

    return res.status(200).json({
      success: true,
      token,
      user: profile
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Login failed.' });
  }
}
