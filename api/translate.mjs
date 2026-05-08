// ─────────────────────────────────────────────────────────────
// api/translate.mjs — Auto-translate chat messages between zh/en
//
// POST /api/translate
// Body: { text: string, targetLang: 'zh' | 'en' }
// Response: { translation: string, sourceLang: 'zh' | 'en' | 'mixed' }
//
// Used by the plaza chat UI when the user has translation enabled.
// We DON'T translate every message proactively — it's opt-in per user
// (toggle in the chat panel) so we don't burn API budget translating
// messages nobody reads.
//
// Rate limit: 60 requests / user / hour. Higher than npc-chat (which is
// 10/h) because chat is the primary use-case and short translations are
// cheap. Each call is bounded to MAX_TEXT chars.
//
// Caching: in-memory LRU keyed on (text, targetLang) so the same message
// translated for multiple readers only hits Claude once. The cache is
// per-Vercel-instance (resets on cold start) — good enough for hot
// chat sessions, accepts duplicate work across instances.
// ─────────────────────────────────────────────────────────────

import { setCors, requireAuth, rateLimit, sanitizeText, checkBodySize } from '../lib/security.mjs';

const MAX_TEXT = 600; // Plaza chat bubbles are short; this caps abuse.
const CACHE_MAX = 256;

// Trivial LRU. Map iteration order is insertion order in JS; we use that
// to evict the oldest entry when we hit the cap.
const cache = new Map();
function cacheGet(key) {
  if (!cache.has(key)) return null;
  const v = cache.get(key);
  // Re-insert to mark as recently used.
  cache.delete(key);
  cache.set(key, v);
  return v;
}
function cacheSet(key, value) {
  if (cache.has(key)) cache.delete(key);
  cache.set(key, value);
  if (cache.size > CACHE_MAX) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}

/**
 * Heuristic source-language detection: count CJK characters.
 *
 * - More than 30% CJK glyphs → 'zh'
 * - Less than 5% CJK → 'en'
 * - Anything in between → 'mixed' (we still send to Claude; the model
 *   handles code-switching better than we can heuristically).
 *
 * Why not the browser's `Intl.Locale` or full LangID? They're heavyweight
 * and don't add much for the 2-language zh/en use-case here.
 */
function detectLang(text) {
  if (!text) return 'en';
  let cjk = 0;
  for (const ch of text) {
    const code = ch.codePointAt(0);
    if (
      // CJK Unified Ideographs (incl. Ext-A) and Hiragana/Katakana ranges
      (code >= 0x3400 && code <= 0x9FFF) ||
      (code >= 0x3040 && code <= 0x30FF)
    ) cjk++;
  }
  const ratio = cjk / Math.max(1, text.length);
  if (ratio > 0.30) return 'zh';
  if (ratio < 0.05) return 'en';
  return 'mixed';
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!checkBodySize(req, res, 8 * 1024)) return;

  const user = requireAuth(req, res);
  if (!user) return;

  // 60 requests / user / hour
  if (!rateLimit(`translate:${user.userId}`, 60, 3600_000)) {
    return res.status(429).json({ error: 'Too many translation requests. Try again later.' });
  }

  const { text, targetLang } = req.body || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Text required' });
  }
  if (targetLang !== 'zh' && targetLang !== 'en') {
    return res.status(400).json({ error: 'targetLang must be "zh" or "en"' });
  }

  const safeText = sanitizeText(text.trim(), MAX_TEXT);
  const sourceLang = detectLang(safeText);

  // Skip translation if the source is already in the target language —
  // saves an API call for the common case where the user has translate-on
  // but most messages are already in their preferred language.
  if (sourceLang === targetLang) {
    return res.status(200).json({ translation: safeText, sourceLang, cached: false, skipped: true });
  }

  const cacheKey = `${targetLang}:${safeText}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.status(200).json({ translation: cached, sourceLang, cached: true });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: 'Translation service not configured' });
  }

  // Hong Kong context matters: translating *to* zh should produce
  // Cantonese-flavoured Traditional Chinese (繁體), not Mandarin /
  // Simplified. Translating *to* en should keep the casual student
  // register; we explicitly tell Claude not to over-formalize.
  const systemPrompt = targetLang === 'zh'
    ? `You are a translator for a Hong Kong university student app. Translate the user's message into Traditional Chinese (繁體中文) with a natural, casual Cantonese-flavoured register suitable for student chat. Preserve emoji, slang, and tone. Output ONLY the translation — no quotes, no labels, no explanation. Keep it concise.`
    : `You are a translator for a Hong Kong university student app. Translate the user's message into casual conversational English suitable for student chat. Preserve emoji, slang, and tone. If the original mixes English and Chinese, smooth it into natural English. Output ONLY the translation — no quotes, no labels, no explanation. Keep it concise.`;

  try {
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // Same fast model as npc-chat
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: safeText }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('Claude translate error:', claudeRes.status, errText);
      return res.status(502).json({ error: 'Translation service error' });
    }

    const data = await claudeRes.json();
    const translation = data?.content?.[0]?.text?.trim() || safeText;

    cacheSet(cacheKey, translation);

    return res.status(200).json({ translation, sourceLang, cached: false });
  } catch (err) {
    console.error('Translate error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
