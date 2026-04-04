import { createHmac } from 'crypto';
import { getUserByEmail } from './utils/supabase.mjs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const VERIFY_SECRET = process.env.VERIFY_SECRET;
const TEST_EMAIL = 'hokhimtang@gmail.com';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: '請提供電郵地址' });

    if (!email.endsWith('.edu.hk') && email !== TEST_EMAIL) {
      return res.status(400).json({ error: '請使用 .edu.hk 學校電郵' });
    }

    // FIX: Check if email is already registered — prevent duplicate accounts
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: '此電郵已被註冊，請直接登入' });
    }

    const code = generateCode(email);

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
        from: 'UniVibe HK <onboarding@resend.dev>',
        to: [email],
        subject: `UniVibe HK 驗證碼: ${code}`,
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 30px; background: #1a1625; color: white; border-radius: 16px;">
            <h1 style="text-align: center; color: #f43f5e;">UniVibe HK</h1>
            <p style="text-align: center; color: #aaa; font-size: 14px;">香港大學生社交平台</p>
            <div style="background: #251e35; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
              <p style="color: #aaa; margin-bottom: 12px;">你的驗證碼:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f43f5e;">${code}</div>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px;">此驗證碼10分鐘內有效</p>
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
