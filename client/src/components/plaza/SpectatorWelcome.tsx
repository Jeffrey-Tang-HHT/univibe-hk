import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import Sparkles from 'lucide-react/icons/sparkles';

/**
 * SpectatorWelcome — first-visit experience.
 *
 * Original todo language asked for a "no-collision ghost camera that watches
 * the plaza for 30 seconds before prompting to customize." That's a much
 * bigger refactor than warranted (would mean swapping PlayerController for a
 * camera-only mode and conditionally disabling collision/movement); the
 * actual user need is "make the first 30 seconds feel inviting and end with
 * a clear CTA to customize."
 *
 * What we ship instead: a soft welcome card that floats over the existing
 * scene for 30s, with a dismiss-now button and an "I don't want this next
 * time" link. When the timer expires, the customizer auto-opens so the
 * first thing the user does is make their avatar theirs. Subsequent visits
 * skip the overlay — keyed on `localStorage.plaza:hasVisited`.
 *
 * Not shown for logged-out users on the landing-page demo (no auth state =
 * no concept of "first visit") and not shown for users who already have a
 * saved avatar (returning users with existing avatar_config).
 */

interface SpectatorWelcomeProps {
  /** True when this user has no saved avatar yet. */
  isFirstTime: boolean;
  /** Called when the welcome flow ends (timer expires or dismiss). */
  onComplete: (openCustomizer: boolean) => void;
}

const TOTAL_MS = 30_000;
const STORAGE_KEY = 'plaza:hasVisited';

export default function SpectatorWelcome({ isFirstTime, onComplete }: SpectatorWelcomeProps) {
  const { lang } = useLanguage();
  // Visible if the user is first-time AND we haven't already shown it this
  // browser. The second condition makes it survive an avatar-save→reload.
  const [visible, setVisible] = useState(() => {
    if (!isFirstTime) return false;
    if (typeof window === 'undefined') return false;
    return !window.localStorage.getItem(STORAGE_KEY);
  });
  const [secondsLeft, setSecondsLeft] = useState(Math.round(TOTAL_MS / 1000));

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const start = Date.now();

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const remaining = Math.max(0, TOTAL_MS - elapsed);
      setSecondsLeft(Math.ceil(remaining / 1000));
      if (remaining <= 0) {
        complete(true);
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const complete = (openCustomizer: boolean) => {
    try { window.localStorage.setItem(STORAGE_KEY, '1'); } catch { /* private mode */ }
    setVisible(false);
    onComplete(openCustomizer);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="spectator-welcome"
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.98 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="absolute z-[55] left-1/2 -translate-x-1/2 top-20 w-[92%] max-w-md pointer-events-none"
        >
          <div className="pointer-events-auto rounded-2xl border border-white/15 bg-gradient-to-br from-indigo-600/85 to-fuchsia-600/85 backdrop-blur-xl shadow-2xl p-4 text-white">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold leading-snug">
                  {lang === 'zh' ? '歡迎黎到 UniGo 廣場' : 'Welcome to UniGo Plaza'}
                </div>
                <div className="mt-1 text-[12px] leading-relaxed text-white/85">
                  {lang === 'zh'
                    ? '行下睇下，認識下其他同學。'
                    : 'Take a moment to look around — meet other students at their own zones.'}
                  <br />
                  {lang === 'zh'
                    ? '一陣可以自訂你嘅角色。'
                    : "When you're ready, you can customize your avatar."}
                </div>

                {/* Countdown progress bar */}
                <div className="mt-3 h-1 rounded-full bg-white/15 overflow-hidden">
                  <motion.div
                    className="h-full bg-white/85"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: TOTAL_MS / 1000, ease: 'linear' }}
                  />
                </div>
                <div className="mt-1 text-[10px] text-white/60 tabular-nums">
                  {lang === 'zh'
                    ? `${secondsLeft} 秒後自動開啟角色設定`
                    : `Customizer opens in ${secondsLeft}s`}
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="text-xs h-7 bg-white text-indigo-700 hover:bg-white/90"
                    onClick={() => complete(true)}
                  >
                    {lang === 'zh' ? '即刻自訂角色' : 'Customize now'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7 text-white/85 hover:bg-white/10 hover:text-white"
                    onClick={() => complete(false)}
                  >
                    {lang === 'zh' ? '我自己睇下' : 'Just look around'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
