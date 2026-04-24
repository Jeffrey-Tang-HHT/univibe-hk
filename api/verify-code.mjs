import { createHmac } from 'crypto';
import { getRequiredEnv } from '../lib/env.mjs';
import { getClientIP, rateLimit, safeCompareText, setCors } from '../lib/security.mjs';

function getVerifySecret() {
  return getRequiredEnv('VERIFY_SECRET', { minLength: 32 });
}

function generateExpectedCodes(email, windowMinutes = 10) {
  const now = Date.now();
  const codes = [];
  for (let i = 0; i <= windowMinutes; i++) {
    const windowTime = Math.floor((now - i * 60 * 1000) / (60 * 1000));
    const hmac = createHmac('sha256', getVerifySecret())
      .update(`${email}:${windowTime}`)
      .digest('hex');
    codes.push(hmac.substring(0, 6).replace(/[a-f]/g, char =>
      String(char.charCodeAt(0) - 87)
    ).substring(0, 6).padStart(6, '0'));
  }
  return codes;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = getClientIP(req);

  if (!rateLimit(`verify:ip:${ip}`, 15, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'Too many verification attempts. Please try again later.' });
  }

  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required.' });
    if (typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'Invalid request payload.' });
    }

    const emailLower = email.toLowerCase().trim();

    if (!rateLimit(`verify:email:${emailLower}`, 5, 10 * 60 * 1000)) {
      return res.status(429).json({ error: 'Too many attempts for this email. Please try again later.' });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ error: 'Verification code must be 6 digits.' });
    }

    const validCodes = generateExpectedCodes(emailLower);
    if (validCodes.some(candidate => safeCompareText(candidate, code))) {
      return res.status(200).json({ success: true, message: 'Verification succeeded.' });
    }

    return res.status(400).json({ error: 'Invalid verification code.' });
  } catch (err) {
    console.error('Verify error:', err);
    return res.status(500).json({ error: 'Verification failed.' });
  }
}
