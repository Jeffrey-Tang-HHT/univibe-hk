import { createHmac } from 'crypto';
import { setCors, rateLimit, getClientIP } from '../lib/security.mjs';

const VERIFY_SECRET = process.env.VERIFY_SECRET;

function generateExpectedCodes(email, windowMinutes = 10) {
  const now = Date.now();
  const codes = [];
  for (let i = 0; i <= windowMinutes; i++) {
    const windowTime = Math.floor((now - i * 60 * 1000) / (60 * 1000));
    const hmac = createHmac('sha256', VERIFY_SECRET)
      .update(`${email}:${windowTime}`)
      .digest('hex');
    codes.push(hmac.substring(0, 6).replace(/[a-f]/g, c =>
      String(c.charCodeAt(0) - 87)
    ).substring(0, 6).padStart(6, '0'));
  }
  return codes;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);

  // Rate limit: 5 attempts per email per 10 min (prevents brute-force of 6-digit code)
  if (!rateLimit(`verify:ip:${ip}`, 15, 10 * 60 * 1000)) {
    return res.status(429).json({ error: '驗證嘗試太頻繁，請稍後再試' });
  }

  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: '請提供電郵和驗證碼' });
    if (typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: '無效的輸入' });
    }

    const emailLower = email.toLowerCase().trim();

    // Per-email rate limit
    if (!rateLimit(`verify:email:${emailLower}`, 5, 10 * 60 * 1000)) {
      return res.status(429).json({ error: '驗證嘗試太頻繁，請10分鐘後再試' });
    }

    // Only accept 6-digit codes
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: '驗證碼格式無效' });
    }

    const validCodes = generateExpectedCodes(emailLower);
    if (validCodes.includes(code)) {
      return res.status(200).json({ success: true, message: '驗證成功' });
    } else {
      return res.status(400).json({ error: '驗證碼錯誤或已過期' });
    }
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: '驗證失敗' });
  }
}
