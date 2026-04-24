import { randomBytes, scrypt as scryptCallback, timingSafeEqual, webcrypto } from 'crypto';
import { promisify } from 'util';

const { subtle } = webcrypto;

const LEGACY_ITERATIONS = 100000;
const LEGACY_KEY_LENGTH = 64;
const LEGACY_ALGORITHM = 'PBKDF2';
const LEGACY_HASH = 'SHA-512';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_BYTES = 16;
const scrypt = promisify(scryptCallback);

export async function hashPassword(password) {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 128 * SCRYPT_N * SCRYPT_R,
  });

  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${Buffer.from(derivedKey).toString('hex')}`;
}

async function verifyLegacyPassword(password, storedHash) {
  const [iterations, saltHex, originalHash] = storedHash.split(':');
  const parsedIterations = parseInt(iterations, 10);
  if (!Number.isFinite(parsedIterations) || !saltHex || !originalHash) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const encoder = new TextEncoder();
  const keyMaterial = await subtle.importKey('raw', encoder.encode(password), LEGACY_ALGORITHM, false, ['deriveBits']);
  const derivedBits = await subtle.deriveBits({
    name: LEGACY_ALGORITHM,
    salt,
    iterations: parsedIterations,
    hash: LEGACY_HASH,
  }, keyMaterial, LEGACY_KEY_LENGTH * 8);
  const hashHex = Buffer.from(derivedBits).toString('hex');
  const left = Buffer.from(hashHex, 'utf-8');
  const right = Buffer.from(originalHash, 'utf-8');
  return left.length === right.length && timingSafeEqual(left, right);
}

async function verifyScryptPassword(password, storedHash) {
  const [, costN, costR, costP, saltHex, originalHash] = storedHash.split('$');
  const salt = Buffer.from(saltHex, 'hex');
  const parsedN = parseInt(costN, 10);
  const parsedR = parseInt(costR, 10);
  const parsedP = parseInt(costP, 10);
  if (!Number.isFinite(parsedN) || !Number.isFinite(parsedR) || !Number.isFinite(parsedP) || !saltHex || !originalHash) {
    return { valid: false, needsRehash: false };
  }
  const derivedKey = await scrypt(password, salt, SCRYPT_KEY_LENGTH, {
    N: parsedN,
    r: parsedR,
    p: parsedP,
    maxmem: 128 * parsedN * parsedR,
  });
  const hashHex = Buffer.from(derivedKey).toString('hex');
  const left = Buffer.from(hashHex, 'utf-8');
  const right = Buffer.from(originalHash, 'utf-8');
  const valid = left.length === right.length && timingSafeEqual(left, right);
  const needsRehash = valid && (
    parsedN !== SCRYPT_N
    || parsedR !== SCRYPT_R
    || parsedP !== SCRYPT_P
  );

  return { valid, needsRehash };
}

export async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string' || storedHash.length === 0) {
    return { valid: false, needsRehash: false };
  }

  try {
    if (storedHash.startsWith('scrypt$')) {
      return await verifyScryptPassword(password, storedHash);
    }

    const valid = await verifyLegacyPassword(password, storedHash);
    return { valid, needsRehash: valid };
  } catch {
    return { valid: false, needsRehash: false };
  }
}
