import { createHmac } from 'crypto';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: '請提供電郵和驗證碼' });

    const validCodes = generateExpectedCodes(email);
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
