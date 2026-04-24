import { timingSafeEqual } from 'crypto';
import { verifyToken } from './token.mjs';

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const DEV_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]);

function appendVary(res, value) {
  const current = res.getHeader('Vary');
  if (!current) {
    res.setHeader('Vary', value);
    return;
  }

  const values = String(current).split(',').map(entry => entry.trim()).filter(Boolean);
  if (!values.includes(value)) {
    values.push(value);
    res.setHeader('Vary', values.join(', '));
  }
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGINS.length === 0 && process.env.NODE_ENV !== 'production' && DEV_ALLOWED_ORIGINS.has(origin);
}

export function setCors(req, res) {
  const origin = req.headers.origin || '';
  appendVary(res, 'Origin');
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }
}

export function checkBodySize(req, res, maxBytes = 1048576) {
  const len = parseInt(req.headers['content-length'] || '0', 10);
  if (len > maxBytes) {
    res.status(413).json({ error: 'Request too large' });
    return false;
  }
  return true;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isValidUUID(val) {
  return typeof val === 'string' && UUID_RE.test(val);
}

export function authenticate(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  return verifyToken(auth.split(' ')[1]);
}

export function requireAuth(req, res) {
  const user = authenticate(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return user;
}

const buckets = new Map();
const CLEANUP_INTERVAL = 5 * 60 * 1000;

const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.windowStart > entry.windowMs * 2) buckets.delete(key);
  }
}, CLEANUP_INTERVAL);
cleanupTimer.unref?.();

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

export function sanitizeText(str, maxLength = 5000) {
  if (typeof str !== 'string') return '';
  return str
    .slice(0, maxLength)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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

export function safeCompareText(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const leftBuffer = Buffer.from(left, 'utf-8');
  const rightBuffer = Buffer.from(right, 'utf-8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isAllowedStorageUrl(value, bucket) {
  if (typeof value !== 'string' || !bucket) return false;
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) return false;

  try {
    const candidate = new URL(value);
    const supabase = new URL(supabaseUrl);
    return candidate.origin === supabase.origin && candidate.pathname.startsWith(`/storage/v1/object/public/${bucket}/`);
  } catch {
    return false;
  }
}

export function getStorageObjectPath(value, bucket) {
  if (!isAllowedStorageUrl(value, bucket)) return null;
  const pathname = new URL(value).pathname;
  const prefix = `/storage/v1/object/public/${bucket}/`;
  return decodeURIComponent(pathname.slice(prefix.length));
}
