import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.VERIFY_SECRET;
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

if (!SECRET || SECRET.length < 32) {
  console.warn('⚠️  VERIFY_SECRET is missing or too short (<32 chars). Auth will be insecure.');
}

export function createToken(userId, username) {
  const payload = { sub: userId, usr: username, iat: Date.now(), exp: Date.now() + TOKEN_EXPIRY };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyToken(token) {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadB64, signature] = parts;

    const expectedSig = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');

    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature, 'utf-8');
    const expectedBuf = Buffer.from(expectedSig, 'utf-8');
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (Date.now() > payload.exp) return null;
    if (!payload.sub) return null;

    return { userId: payload.sub, username: payload.usr };
  } catch { return null; }
}
