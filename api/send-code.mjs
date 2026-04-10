import { createHmac } from 'crypto';
import { getUserByEmail } from './utils/supabase.mjs';
import { setCors, rateLimit, getClientIP } from './utils/security.mjs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const VERIFY_SECRET = process.env.VERIFY_SECRET;
// Only allow test email bypass in development
const TEST_EMAIL = process.env.NODE_ENV !== 'production' ? process.env.TEST_EMAIL : null;

function generateCode(email) {
  const windowTime = Math.floor(Date.now() / (60 * 1000));
  const hmac = createHmac('sha256', VERIFY_SECRET)
    .update(`${email}:${windowTime}`)
    .digest('hex');
  return hmac.substring(0, 6).replace(/[a-f]/g, c =>
    String(c.charCodeAt(0) - 87)
  ).substring(0, 6).padStart(6, '0');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);

  // Rate limit: 3 codes per email per 10 min, 10 per IP per hour
  if (!rateLimit(`sendcode:ip:${ip}`, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ error: '請求太頻繁，請稍後再試' });
  }

  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: '請提供電郵地址' });

    const emailLower = email.toLowerCase().trim();

    if (!emailLower.endsWith('.edu.hk') && emailLower !== TEST_EMAIL) {
      return res.status(400).json({ error: '請使用 .edu.hk 學校電郵' });
    }

    // Per-email rate limit
    if (!rateLimit(`sendcode:email:${emailLower}`, 3, 10 * 60 * 1000)) {
      return res.status(429).json({ error: '驗證碼發送太頻繁，請10分鐘後再試' });
    }

    const existingUser = await getUserByEmail(emailLower);
    if (existingUser) {
      return res.status(409).json({ error: '此電郵已被註冊，請直接登入' });
    }

    const code = generateCode(emailLower);

    if (!RESEND_API_KEY) {
      return res.status(500).json({ error: 'Email service not configured' });
    }

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'UniGo HK <noreply@yourdomain.com>',
        to: [emailLower],
        subject: `UniGo HK 驗證碼`,  // Don't put code in subject line
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 30px; background: #1a1625; color: white; border-radius: 16px;">
            <h1 style="text-align: center; color: #f43f5e;">UniGo HK</h1>
            <p style="text-align: center; color: #aaa; font-size: 14px;">香港大學生社交平台</p>
            <div style="background: #251e35; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
              <p style="color: #aaa; margin-bottom: 12px;">你的驗證碼:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f43f5e;">${code}</div>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px;">此驗證碼10分鐘內有效。如非本人操作，請忽略此郵件。</p>
          </div>`
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend error:', errText);
      return res.status(500).json({ error: '發送失敗，請稍後再試' });
    }

    return res.status(200).json({ success: true, message: '驗證碼已發送' });
  } catch (err) {
    console.error('Send code error:', err);
    return res.status(500).json({ error: '發送失敗' });
  }
}
