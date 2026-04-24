import { createHmac, timingSafeEqual } from 'crypto';
import { getRequiredEnv } from './env.mjs';

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

function getTokenSecret() {
  return getRequiredEnv('VERIFY_SECRET', { minLength: 32 });
}

export function createToken(userId, username) {
  const now = Date.now();
  const payload = {
    sub: userId,
    usr: username,
    ver: 1,
    iat: now,
    exp: now + TOKEN_EXPIRY_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', getTokenSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;

    const expectedSig = createHmac('sha256', getTokenSecret()).update(payloadB64).digest('base64url');
    const signatureBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSig, 'utf-8');
    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (!payload || typeof payload !== 'object') return null;
    if (typeof payload.sub !== 'string' || payload.sub.length === 0) return null;
    if (typeof payload.usr !== 'string') return null;
    if (!Number.isFinite(payload.iat) || !Number.isFinite(payload.exp)) return null;
    if (payload.exp <= payload.iat) return null;

    const now = Date.now();
    if (payload.iat > now + MAX_CLOCK_SKEW_MS) return null;
    if (now > payload.exp) return null;

    return { userId: payload.sub, username: payload.usr };
  } catch {
    return null;
  }
}
