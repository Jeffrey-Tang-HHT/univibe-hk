import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smile, ChevronUp } from 'lucide-react';
import type { EmoteName } from './Avatar3D';
import { getEmoteDuration } from './Avatar3D';

// ─────────────────────────────────────────────────────────────
// EmoteBar — radial-style picker for player emotes.
//
// Tapping the smile button toggles a horizontal strip of emote
// pills. Tapping a pill plays the emote on the player avatar:
// it writes `{ name, startMs }` into `emoteRef`, which
// PlayerController forwards into Avatar3D's `emote` / `emoteStartMs`.
//
// While an emote is playing, the bar shows a thin progress sweep on
// the active pill so it's clear *when* it ends. Tapping a different
// emote during playback restarts with the new emote (no cooldown
// between emotes, but the same emote can't be re-triggered until
// it ends — prevents jitter).
// ─────────────────────────────────────────────────────────────

interface EmoteBarProps {
  emoteRef: React.MutableRefObject<{ name: EmoteName; startMs: number } | null>;
  /** zh / en — labels follow the rest of the Plaza UI. */
  lang?: string;
  /** Optional vertical offset so callers can stack it above the
   *  joystick or chat bar without each one knowing the others' height. */
  className?: string;
}

interface EmoteEntry {
  name: EmoteName;
  emoji: string;
  labelZh: string;
  labelEn: string;
}

// The 7 emotes Avatar3D ships with. Reorder to taste — index 0 is
// the leftmost when the strip is open.
const EMOTES: EmoteEntry[] = [
  { name: 'wave',  emoji: '👋', labelZh: '揮手', labelEn: 'Wave'  },
  { name: 'cheer', emoji: '🙌', labelZh: '歡呼', labelEn: 'Cheer' },
  { name: 'dance', emoji: '💃', labelZh: '跳舞', labelEn: 'Dance' },
  { name: 'clap',  emoji: '👏', labelZh: '拍手', labelEn: 'Clap'  },
  { name: 'bow',   emoji: '🙇', labelZh: '鞠躬', labelEn: 'Bow'   },
  { name: 'point', emoji: '👉', labelZh: '指向', labelEn: 'Point' },
  { name: 'sit',   emoji: '🪑', labelZh: '坐下', labelEn: 'Sit'   },
];

export default function EmoteBar({ emoteRef, lang = 'zh', className = '' }: EmoteBarProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<{ name: EmoteName; startMs: number } | null>(null);
  const [now, setNow] = useState(Date.now());

  // Tick `now` while an emote is playing so the progress sweep updates.
  // Stops as soon as the emote ends.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const loop = () => {
      setNow(Date.now());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  // Clear the active state once the emote duration elapses so the UI
  // returns to "idle" — and also clears the shared ref so Avatar3D
  // stops applying the emote pose. (Avatar3D also self-expires, but
  // clearing the ref is cleaner for any networked player code.)
  useEffect(() => {
    if (!active) return;
    const remaining = getEmoteDuration(active.name) - (Date.now() - active.startMs);
    const t = setTimeout(() => {
      setActive(null);
      if (emoteRef.current && emoteRef.current.startMs === active.startMs) {
        emoteRef.current = null;
      }
    }, Math.max(0, remaining + 50));
    return () => clearTimeout(t);
  }, [active, emoteRef]);

  const trigger = useCallback((name: EmoteName) => {
    // If the same emote is mid-play, ignore re-trigger to avoid jitter.
    if (active && active.name === name) return;
    const startMs = Date.now();
    emoteRef.current = { name, startMs };
    setActive({ name, startMs });
  }, [active, emoteRef]);

  return (
    <div className={`flex items-end gap-2 ${className}`}>
      {/* Toggle button — always visible. Mirrors the joystick visual. */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        className={`
          relative w-14 h-14 rounded-full
          bg-gradient-to-br from-white/15 to-white/5
          backdrop-blur-md border border-white/20 shadow-lg
          flex items-center justify-center
          transition-colors
          ${open ? 'border-coral-400/60' : ''}
        `}
        style={{ touchAction: 'manipulation' }}
        aria-label={lang === 'zh' ? '表情動作' : 'Emotes'}
      >
        <Smile className="w-6 h-6 text-white" />
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-1 -right-1 bg-coral-500 rounded-full w-3.5 h-3.5 flex items-center justify-center"
          >
            <ChevronUp className="w-2.5 h-2.5 text-white" />
          </motion.span>
        )}
      </motion.button>

      {/* Emote strip */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: -10, width: 0 }}
            animate={{ opacity: 1, x: 0, width: 'auto' }}
            exit={{ opacity: 0, x: -10, width: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden flex items-center gap-1.5 pr-1"
          >
            {EMOTES.map((e) => {
              const isActive = active?.name === e.name;
              const progress = isActive
                ? Math.min(1, (now - active.startMs) / getEmoteDuration(e.name))
                : 0;
              return (
                <motion.button
                  key={e.name}
                  type="button"
                  onClick={() => trigger(e.name)}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  className={`
                    relative w-12 h-12 rounded-full
                    bg-black/45 backdrop-blur-md border shadow-md
                    flex flex-col items-center justify-center
                    text-base leading-none select-none
                    transition-colors
                    ${isActive ? 'border-coral-400/80 bg-coral-500/20' : 'border-white/15'}
                  `}
                  title={lang === 'zh' ? e.labelZh : e.labelEn}
                  style={{ touchAction: 'manipulation' }}
                >
                  <span className="text-xl">{e.emoji}</span>
                  {/* Progress sweep — a thin ring that fills as the
                      emote plays. Implemented as a conic gradient on a
                      ::before pseudo-element via inline SVG to avoid
                      Tailwind config changes. */}
                  {isActive && (
                    <svg
                      className="absolute inset-0 pointer-events-none"
                      viewBox="0 0 48 48"
                    >
                      <circle
                        cx="24" cy="24" r="22"
                        fill="none"
                        stroke="rgba(255,255,255,0.85)"
                        strokeWidth="2"
                        strokeDasharray={`${progress * 138.2} 138.2`}
                        strokeLinecap="round"
                        transform="rotate(-90 24 24)"
                      />
                    </svg>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
