// Send verification code via email
// POST /api/send-code
// Body: { email }

import { createHmac } from 'crypto';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const VERIFY_SECRET = process.env.VERIFY_SECRET;
if (!VERIFY_SECRET) throw new Error('VERIFY_SECRET env var not set');

const TEST_EMAIL = 'hokhimtang@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function generateCode(email) {
  const windowTime = Math.floor(Date.now() / (60 * 1000));
  const hmac = createHmac('sha256', VERIFY_SECRET)
    .update(`${email}:${windowTime}`)
    .digest('hex');
  const code = hmac.substring(0, 6).replace(/[a-f]/g, c => 
    String(c.charCodeAt(0) - 87)
  ).substring(0, 6).padStart(6, '0');
  return code;
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return Response.json(
        { error: '請提供電郵地址 / Please provide an email' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email: must be .edu.hk or test email
    if (!email.endsWith('.edu.hk') && email !== TEST_EMAIL) {
      return Response.json(
        { error: '請使用 .edu.hk 學校電郵 / Please use a .edu.hk email' },
        { status: 400, headers: corsHeaders }
      );
    }

    const code = generateCode(email);

    if (!RESEND_API_KEY) {
      return Response.json(
        { error: 'Email service not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Send email via Resend
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
            <h1 style="text-align: center; color: #f43f5e; margin-bottom: 8px;">UniVibe HK</h1>
            <p style="text-align: center; color: #aaa; font-size: 14px;">香港大學生社交平台</p>
            <div style="background: #251e35; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
              <p style="color: #aaa; margin-bottom: 12px;">你的驗證碼 Your verification code:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #f43f5e;">${code}</div>
            </div>
            <p style="text-align: center; color: #666; font-size: 12px;">此驗證碼10分鐘內有效<br>This code expires in 10 minutes</p>
          </div>
        `
      })
    });

    if (!emailRes.ok) {
      const errData = await emailRes.text();
      console.error('Resend error:', errData);
      return Response.json(
        { error: '發送失敗，請稍後再試 / Failed to send email' },
        { status: 500, headers: corsHeaders }
      );
    }

    return Response.json(
      { success: true, message: '驗證碼已發送 / Code sent' },
      { headers: corsHeaders }
    );

  } catch (err) {
    console.error('Send code error:', err);
    return Response.json(
      { error: '發送失敗 / Send failed' },
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = { path: '/api/send-code' };
