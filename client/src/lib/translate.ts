import { getToken } from './auth';

/**
 * translate.ts — client helper for /api/translate.
 *
 * Why this lives in `lib/` rather than as a hook: bubbles can be rendered
 * in many places (Plaza chat panel, possibly OtherPlayers' bubble3d, future
 * Dating chat reuse), and a hook would force re-renders on every bubble
 * mount. This helper exposes a plain async fn + a tiny session cache so
 * UI components can call it from useEffect and store the result locally.
 *
 * Cache scope: in-memory for the page session. Bubbles are short-lived
 * (Plaza messages expire after ~30s upstream) so persisting translations
 * across reloads would mostly be cold-cache misses anyway.
 */

export type TargetLang = 'zh' | 'en';

interface TranslateResponse {
  translation: string;
  sourceLang: 'zh' | 'en' | 'mixed';
  cached?: boolean;
  skipped?: boolean;
}

const sessionCache = new Map<string, string>();

export async function translateText(text: string, targetLang: TargetLang): Promise<string> {
  // Defensive: empty / whitespace shortcuts return as-is. Saves an API
  // call and protects the rate-limit budget.
  if (!text || !text.trim()) return text;

  const key = `${targetLang}:${text}`;
  const cached = sessionCache.get(key);
  if (cached !== undefined) return cached;

  try {
    const token = getToken();
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ text, targetLang }),
    });
    if (!res.ok) {
      // Cache the failure as the original so we don't retry on every render.
      sessionCache.set(key, text);
      return text;
    }
    const data = (await res.json()) as TranslateResponse;
    const out = data.translation || text;
    sessionCache.set(key, out);
    return out;
  } catch {
    // Network failure → fall through to original text. Don't poison the
    // cache for transient errors though — let a future retry attempt it.
    return text;
  }
}
