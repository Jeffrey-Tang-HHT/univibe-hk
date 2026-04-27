// ─────────────────────────────────────────────────────────────
// SceneTransition — full-screen fade-to-black overlay that runs
// during a scene change. Reads `transitionState` and `targetScene`
// from SceneContext.
//
// Lives outside the Canvas — it's a regular DOM element.
//
// Timing matches SCENE_TRANSITION_TIMINGS so the visual fade and
// the underlying state swap line up precisely.
// ─────────────────────────────────────────────────────────────

import { AnimatePresence, motion } from 'framer-motion';
import { useScene, SCENE_TRANSITION_TIMINGS } from '@/contexts/SceneContext';
import { getSceneConfig } from '@/lib/scenes';

interface SceneTransitionProps {
  lang: string;
}

export default function SceneTransition({ lang }: SceneTransitionProps) {
  const { transitionState, targetScene } = useScene();
  const showing = transitionState !== 'idle';

  const cfg = getSceneConfig(targetScene);
  const label = lang === 'zh' ? cfg.nameZh : cfg.nameEn;
  const tag = lang === 'zh' ? cfg.taglineZh : cfg.taglineEn;

  // Total animation duration (ms → seconds for framer).
  const fadeOut = SCENE_TRANSITION_TIMINGS.fadeOut / 1000;
  const fadeIn = SCENE_TRANSITION_TIMINGS.fadeIn / 1000;

  return (
    <AnimatePresence>
      {showing && (
        <motion.div
          key="scene-fade"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: transitionState === 'fading-out' ? fadeOut : fadeIn }}
          className="pointer-events-none fixed inset-0 z-[80]"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(8,8,12,0.92) 0%, rgba(0,0,0,1) 70%)',
          }}
        >
          <div className="w-full h-full flex flex-col items-center justify-center text-white select-none">
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.45 }}
              className="text-center"
            >
              <div
                className="text-3xl font-bold tracking-wide mb-1"
                style={{
                  color: cfg.themeColor,
                  textShadow: `0 0 24px ${cfg.themeColor}66`,
                }}
              >
                {label}
              </div>
              <div className="text-sm text-white/70">{tag}</div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
