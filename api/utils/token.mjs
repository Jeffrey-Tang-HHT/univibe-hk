import { createHmac } from 'crypto';

const SECRET = process.env.VERIFY_SECRET;
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createToken(userId, username) {
  const payload = { sub: userId, usr: username, iat: Date.now(), exp: Date.now() + TOKEN_EXPIRY };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
  return `${payloadB64}.${signature}`;
}

export function verifyToken(token) {
  try {
    const [payloadB64, signature] = token.split('.');
    const expectedSig = createHmac('sha256', SECRET).update(payloadB64).digest('base64url');
    if (signature !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    if (Date.now() > payload.exp) return null;
    return { userId: payload.sub, username: payload.usr };
  } catch { return null; }
}
