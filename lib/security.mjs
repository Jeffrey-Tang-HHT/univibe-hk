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

// ─── Sanitize but preserve for display (less aggressive, for content that stays server-side) ───
export function sanitizeContent(str, maxLength = 10000) {
  if (typeof str !== 'string') return '';
  return str.slice(0, maxLength).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}
