import { verifyToken } from './token.mjs';
import { timingSafeEqual } from 'crypto';

// ─── CORS: restrict to your actual domain ───
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

export function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:");
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

// ─── Request body size check ───
export function checkBodySize(req, res, maxBytes = 1048576) {
  const len = parseInt(req.headers['content-length'] || '0', 10);
  if (len > maxBytes) {
    res.status(413).json({ error: 'Request too large' });
    return false;
  }
  return true;
}

// ─── UUID validation ───
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(val) {
  return typeof val === 'string' && UUID_RE.test(val);
}

// ─── Authenticate request → returns { userId, username } or null ───
export function authenticate(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.split(' ')[1]);
}

// ─── Require auth (returns 401 if not authenticated) ───
export function requireAuth(req, res) {
  const user = authenticate(req);
  if (!user) {
    res.status(401).json({ error: '未授權，請重新登入' });
    return null;
  }
  return user;
}

// ─── In-memory rate limiter ───
const buckets = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart > entry.windowMs * 2) buckets.delete(key);
  }
}, CLEANUP_INTERVAL);

/**
 * @param {string} key - unique key (e.g. IP + route)
 * @param {number} maxRequests - max requests per window
 * @param {number} windowMs - window in ms
 * @returns {boolean} true if allowed, false if rate-limited
 */
export function rateLimit(key, maxRequests, windowMs) {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now - entry.windowStart > windowMs) {
    entry = { count: 1, windowStart: now, windowMs };
    buckets.set(key, entry);
    return true;
  }
  entry.count++;
  return entry.count <= maxRequests;
}

export function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || 'unknown';
}

// ─── Sanitize text input (strip dangerous HTML) ───
export function sanitizeText(str, maxLength = 5000) {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLength)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ─── Sanitize content (strip all dangerous HTML patterns) ───
export function sanitizeContent(str, maxLength = 10000) {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLength)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/\bon\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript\s*:/gi, 'blocked:');
}

// ─── Validate image magic bytes ───
const IMAGE_SIGNATURES = {
  'image/jpeg': [Buffer.from([0xFF, 0xD8, 0xFF])],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/webp': [Buffer.from('RIFF'), Buffer.from('WEBP')],
  'image/gif': [Buffer.from('GIF87a'), Buffer.from('GIF89a')],
};

export function validateImageBytes(buffer, declaredMime) {
  const sigs = IMAGE_SIGNATURES[declaredMime];
  if (!sigs) return false;
  if (declaredMime === 'image/webp') {
    return buffer.length >= 12 && buffer.slice(0, 4).equals(sigs[0]) && buffer.slice(8, 12).equals(sigs[1]);
  }
  return sigs.some(sig => buffer.length >= sig.length && buffer.slice(0, sig.length).equals(sig));
}
