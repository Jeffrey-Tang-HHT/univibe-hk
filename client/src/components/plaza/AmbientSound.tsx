// ─────────────────────────────────────────────────────────────
// AmbientSound — plays the active scene's ambient track in a loop.
//
// Uses an HTMLAudioElement (cheap, broadly compatible) instead of
// the WebAudio graph. We crossfade between scenes by overlapping
// two elements: fade out the old, fade in the new.
//
// Browser autoplay rules require a user gesture before audio can
// start. The first scene change happens because the user clicked
// or tapped the entry trigger, which counts. If we can't start
// audio (no gesture yet, file missing, decoder error), we fail
// silently — sound is decoration, never blocking.
//
// Drop 1 ships with the system but no audio files. Drop in CC0
// loops at:
//   client/public/audio/library.mp3
//   client/public/audio/cafe.mp3
//   client/public/audio/social.mp3
//   client/public/audio/dating.mp3
// Recommended sources: Pixabay Music, freepd.com, tabletopaudio.
// If a file is missing, that scene just stays silent.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react';
import { useScene } from '@/contexts/SceneContext';
import { getSceneConfig } from '@/lib/scenes';

const FADE_MS = 450;
const TARGET_VOLUME = 0.35;

export default function AmbientSound() {
  const { currentScene, muted } = useScene();
  const elARef = useRef<HTMLAudioElement | null>(null);
  const elBRef = useRef<HTMLAudioElement | null>(null);
  const activeRef = useRef<'A' | 'B' | null>(null);
  const fadeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lazy-create the elements on mount. Two elements so we can crossfade.
  useEffect(() => {
    elARef.current = new Audio();
    elARef.current.loop = true;
    elARef.current.volume = 0;
    elARef.current.preload = 'auto';

    elBRef.current = new Audio();
    elBRef.current.loop = true;
    elBRef.current.volume = 0;
    elBRef.current.preload = 'auto';

    return () => {
      try {
        elARef.current?.pause();
        elBRef.current?.pause();
      } catch {}
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      elARef.current = null;
      elBRef.current = null;
    };
  }, []);

  // React to scene changes (and mute changes) by crossfading.
  useEffect(() => {
    const cfg = getSceneConfig(currentScene);
    const url = cfg.ambientSound;
    const elA = elARef.current;
    const elB = elBRef.current;
    if (!elA || !elB) return;

    // No track for this scene → fade everything to silence.
    if (!url) {
      crossfadeTo(null);
      return;
    }

    // Pick the inactive element as the new one; load + fade in.
    const newOne = activeRef.current === 'A' ? elB : elA;
    const oldOne = activeRef.current === 'A' ? elA : activeRef.current === 'B' ? elB : null;
    const newKey: 'A' | 'B' = newOne === elA ? 'A' : 'B';

    try {
      // Only set src if it's actually different — avoids restart-on-rerender.
      if (newOne.src.endsWith(url) === false) {
        newOne.src = url;
        newOne.currentTime = 0;
      }
      newOne.volume = 0;
      // Play promise can reject (autoplay). Swallow.
      const p = newOne.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {}

    crossfadeTo(newKey);

    function crossfadeTo(newKeyArg: 'A' | 'B' | null) {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      const startTime = performance.now();
      const targetNew = newKeyArg && !muted ? TARGET_VOLUME : 0;

      fadeIntervalRef.current = setInterval(() => {
        const t = Math.min(1, (performance.now() - startTime) / FADE_MS);
        // Quadratic ease for a smoother fade than linear.
        const eased = t * (2 - t);

        if (newKeyArg) {
          const newEl = newKeyArg === 'A' ? elA : elB;
          if (newEl) newEl.volume = clamp01(eased * targetNew);
        }
        if (oldOne) {
          oldOne.volume = clamp01(oldOne.volume * (1 - eased * 0.6));
        }

        if (t >= 1) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          fadeIntervalRef.current = null;
          if (oldOne) {
            try { oldOne.pause(); } catch {}
            oldOne.volume = 0;
          }
          activeRef.current = newKeyArg;
        }
      }, 16);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene, muted]);

  // Mute toggle: snap-fade the active element.
  useEffect(() => {
    const elA = elARef.current;
    const elB = elBRef.current;
    if (!elA || !elB) return;
    const active = activeRef.current === 'A' ? elA : activeRef.current === 'B' ? elB : null;
    if (!active) return;
    active.volume = muted ? 0 : TARGET_VOLUME;
  }, [muted]);

  return null;
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
