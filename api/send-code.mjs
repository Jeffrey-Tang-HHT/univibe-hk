import { createHmac } from 'crypto';
import { getRequiredEnv } from '../lib/env.mjs';
import { getClientIP, rateLimit, setCors } from '../lib/security.mjs';
import { getUserByEmail } from '../lib/supabase.mjs';

const TEST_EMAIL = process.env.NODE_ENV !== 'production' ? process.env.TEST_EMAIL : null;

function getVerifySecret() {
  return getRequiredEnv('VERIFY_SECRET', { minLength: 32 });
}

function generateCode(email) {
  const windowTime = Math.floor(Date.now() / (60 * 1000));
  const hmac = createHmac('sha256', getVerifySecret())
    .update(`${email}:${windowTime}`)
    .digest('hex');
  return hmac.substring(0, 6).replace(/[a-f]/g, char =>
    String(char.charCodeAt(0) - 87)
  ).substring(0, 6).padStart(6, '0');
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);

  if (!rateLimit(`sendcode:ip:${ip}`, 10, 60 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many requests from this IP. Please try again later.' });
  }

  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') return res.status(400).json({ error: 'Email is required.' });

    const emailLower = email.toLowerCase().trim();
    if (!emailLower.endsWith('.edu.hk') && emailLower !== TEST_EMAIL) {
      return res.status(400).json({ error: 'Only .edu.hk email addresses are allowed.' });
    }

    if (!rateLimit(`sendcode:email:${emailLower}`, 3, 10 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many codes were sent to this email. Please wait 10 minutes.' });
    }

    const existingUser = await getUserByEmail(emailLower);
    if (existingUser) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }

    const resendApiKey = getRequiredEnv('RESEND_API_KEY', { minLength: 10 });
    const code = generateCode(emailLower);

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'UniGo HK <noreply@yourdomain.com>',
        to: [emailLower],
        subject: 'UniGo HK verification code',
        html: `
          <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 30px; background: #1a1625; color: white; border-radius: 16px;">
            <h1 style="text-align: center; color: #f43f5e;">UniGo HK</h1>
            <p style="text-align: center; color: #aaa; font-size: 14px;">Use the verification code below to finish signing in.</p>
            <div style="background: #251e35; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
              <p style="color: #aaa; margin-bottom: 12px;">Verification code</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f43f5e;">${code}</div>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px;">This code expires automatically after 10 minutes.</p>
          </div>`
      })
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('Resend error:', errText);
      return res.status(500).json({ error: 'Failed to send verification email.' });
    }

    return res.status(200).json({ success: true, message: 'Verification code sent successfully.' });
  } catch (err) {
    console.error('Send code error:', err);
    return res.status(500).json({ error: 'Failed to send code.' });
  }
}
