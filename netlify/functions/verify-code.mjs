// Verify email code
// POST /api/verify-code
// Body: { email, code }

import { createHmac } from 'crypto';

const VERIFY_SECRET = process.env.VERIFY_SECRET;
if (!VERIFY_SECRET) throw new Error('VERIFY_SECRET env var not set');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function generateExpectedCode(email, windowMinutes = 10) {
  // Try current and recent time windows
  const now = Date.now();
  const codes = [];
  
  for (let i = 0; i <= windowMinutes; i++) {
    const windowTime = Math.floor((now - i * 60 * 1000) / (60 * 1000));
    const hmac = createHmac('sha256', VERIFY_SECRET)
      .update(`${email}:${windowTime}`)
      .digest('hex');
    const code = hmac.substring(0, 6).replace(/[a-f]/g, c => 
      String(c.charCodeAt(0) - 87)
    ).substring(0, 6).padStart(6, '0');
    codes.push(code);
  }
  
  return codes;
}

export default async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('', { headers: corsHeaders });
  }

  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return Response.json(
        { error: '請提供電郵和驗證碼 / Missing email or code' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Generate all valid codes for the time window
    const validCodes = generateExpectedCode(email);
    
    if (validCodes.includes(code)) {
      return Response.json(
        { success: true, message: '驗證成功 / Verification successful' },
        { headers: corsHeaders }
      );
    } else {
      return Response.json(
        { error: '驗證碼錯誤或已過期 / Invalid or expired code' },
        { status: 400, headers: corsHeaders }
      );
    }

  } catch (err) {
    console.error('Verify error:', err);
    return Response.json(
      { error: '驗證失敗 / Verification failed' },
      { status: 500, headers: corsHeaders }
    );
  }
};

export const config = { path: '/api/verify-code' };
