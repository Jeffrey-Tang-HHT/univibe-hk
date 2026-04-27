import { webcrypto, timingSafeEqual } from 'crypto';
const { subtle } = webcrypto;

const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const ALGORITHM = 'PBKDF2';
const HASH = 'SHA-512';

export async function hashPassword(password) {
  const salt = new Uint8Array(16);
  webcrypto.getRandomValues(salt);
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey('raw', encoder.encode(password), ALGORITHM, false, ['deriveBits']);
  const derivedBits = await subtle.deriveBits({ name: ALGORITHM, salt, iterations: ITERATIONS, hash: HASH }, keyMaterial, KEY_LENGTH * 8);
  const saltHex = Buffer.from(salt).toString('hex');
  const hashHex = Buffer.from(derivedBits).toString('hex');
  return `${ITERATIONS}:${saltHex}:${hashHex}`;
}

export async function verifyPassword(password, storedHash) {
  const [iterations, saltHex, originalHash] = storedHash.split(':');
  const salt = Buffer.from(saltHex, 'hex');
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey('raw', encoder.encode(password), ALGORITHM, false, ['deriveBits']);
  const derivedBits = await subtle.deriveBits({ name: ALGORITHM, salt, iterations: parseInt(iterations), hash: HASH }, keyMaterial, KEY_LENGTH * 8);
  const hashHex = Buffer.from(derivedBits).toString('hex');
  // Timing-safe comparison to prevent timing attacks
  const a = Buffer.from(hashHex, 'utf-8');
  const b = Buffer.from(originalHash, 'utf-8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
