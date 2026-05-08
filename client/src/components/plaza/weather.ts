/**
 * weather.ts — deterministic daily weather selection.
 *
 * Goal: every player who visits on the same calendar day (HK time) sees the
 * same weather. This makes weather a shared "world event" rather than a
 * per-player random — useful both for vibes ("rainy day at uni") and for
 * future referenceability ("remember when it rained on midterms day").
 *
 * Why a hash off the date string instead of per-player random:
 *  - Players in the same plaza commenting on the weather should agree.
 *  - We don't need server-side weather state; the client computes it from
 *    the local HK date and gets the same answer as everyone else.
 *  - If we ever DO want server-driven weather (e.g. tied to real HK
 *    weather), this is the one function to swap.
 *
 * Distribution: ~60% clear, ~25% cloudy, ~15% light rain. Hong Kong is
 * sunny most of the year; rain is the visually rare event so it should
 * also feel rare in-game.
 */

export type WeatherMode = 'clear' | 'cloudy' | 'rain';

export interface WeatherState {
  mode: WeatherMode;
  /** 0..1. Cloudy = density of extra clouds. Rain = density of droplets. Always 0 for clear. */
  intensity: number;
}

/**
 * Tiny string-hash. Not cryptographic; just needs even distribution
 * across short date keys like "2026-05-08". 32-bit FNV-1a variant.
 */
function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Today's date as YYYY-MM-DD in Hong Kong local time (UTC+8). */
export function hkDateKey(now: Date = new Date()): string {
  // Get UTC components, then add 8h offset, then format. Avoids relying on
  // the user's local timezone (which would make HK weather inconsistent
  // for users not physically in HK).
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60_000);
  const hk = new Date(utcMs + 8 * 60 * 60_000);
  const y = hk.getFullYear();
  const m = String(hk.getMonth() + 1).padStart(2, '0');
  const d = String(hk.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Resolve today's weather from the date seed. Deterministic — same date
 * always returns the same WeatherState.
 *
 * Override hooks (in priority order):
 *  - `localStorage.plaza:weatherOverride` — JSON of WeatherState. Used by
 *    devs to force a specific weather for screenshots / debugging without
 *    having to wait for the right day to roll around.
 *  - Otherwise, hash the HK date and bucket.
 */
export function resolveWeather(now: Date = new Date()): WeatherState {
  // Dev/QA override
  if (typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem('plaza:weatherOverride');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.mode === 'string') {
          return {
            mode: parsed.mode as WeatherMode,
            intensity: typeof parsed.intensity === 'number' ? parsed.intensity : 0.5,
          };
        }
      }
    } catch { /* corrupt JSON — fall through */ }
  }

  const seed = hashString(hkDateKey(now));
  // Bucket: 0..0.60 clear, 0.60..0.85 cloudy, 0.85..1.00 rain.
  const u = (seed % 100_000) / 100_000;
  if (u < 0.60) return { mode: 'clear', intensity: 0 };
  if (u < 0.85) {
    // Cloudy intensity 0.4..0.9 — even on cloudy days we want some
    // variance so consecutive cloudy days don't look identical.
    const i = 0.4 + ((seed >> 8) % 100) / 200; // 0.4 .. 0.9
    return { mode: 'cloudy', intensity: i };
  }
  // Rain. Intensity 0.5..1.0.
  const i = 0.5 + ((seed >> 16) % 100) / 200;
  return { mode: 'rain', intensity: Math.min(1, i) };
}

/**
 * Sun-intensity multiplier based on weather. Applied on top of the
 * day/night keyframe sunIntensity in DayNightCycle.
 */
export function weatherSunMultiplier(w: WeatherState): number {
  if (w.mode === 'clear') return 1.0;
  if (w.mode === 'cloudy') return 1.0 - 0.3 * w.intensity; // up to ×0.7
  return 1.0 - 0.55 * w.intensity; // rain darker still
}
