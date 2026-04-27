import { useEffect, useRef, useState } from 'react';

/**
 * Lightweight FPS / frame-time HUD.
 *
 * Renders nothing by default — toggled on with Shift+F, or via an initial
 * `defaultVisible` prop. Uses a rolling 60-sample average so the number
 * doesn't jitter. Frame time is the single worst offender for perceived
 * smoothness, so we show both:
 *
 *   FPS  —  averaged over the last ~1s
 *   MS   —  worst frame time in the last 60 frames (aka "1% low" proxy)
 *
 * No Three.js dependency: we tap requestAnimationFrame directly so the
 * meter keeps working even if the Canvas unmounts.
 */
interface FPSMeterProps {
  defaultVisible?: boolean;
  /** Optional keyboard shortcut toggle. Default: shift+F. Pass null to disable. */
  toggleKey?: { key: string; shift?: boolean; ctrl?: boolean; alt?: boolean } | null;
}

const SAMPLE_SIZE = 60;

export default function FPSMeter({
  defaultVisible = false,
  toggleKey = { key: 'f', shift: true },
}: FPSMeterProps) {
  const [visible, setVisible] = useState(defaultVisible);
  const [stats, setStats] = useState({ fps: 0, worstMs: 0 });
  const samples = useRef<number[]>([]);
  const lastT = useRef<number>(performance.now());

  // Keyboard toggle
  useEffect(() => {
    if (!toggleKey) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== toggleKey.key.toLowerCase()) return;
      if (!!toggleKey.shift !== e.shiftKey) return;
      if (!!toggleKey.ctrl !== (e.ctrlKey || e.metaKey)) return;
      if (!!toggleKey.alt !== e.altKey) return;
      // Don't steal focus from input fields
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      setVisible(v => !v);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleKey]);

  // Frame-time sampler. Runs regardless of visibility so toggling on is
  // instantly populated, but the cost is trivial (two numbers / frame).
  useEffect(() => {
    let rafId = 0;
    let lastSetAt = 0;
    const tick = (now: number) => {
      const dt = now - lastT.current;
      lastT.current = now;
      const buf = samples.current;
      buf.push(dt);
      if (buf.length > SAMPLE_SIZE) buf.shift();

      // Only push state ~4× per second — setState on every frame would be
      // wasteful and cause React reconciliation to show up in the meter itself.
      if (now - lastSetAt > 250) {
        lastSetAt = now;
        const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
        const worst = buf.reduce((a, b) => (b > a ? b : a), 0);
        setStats({ fps: avg > 0 ? 1000 / avg : 0, worstMs: worst });
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  if (!visible) return null;

  // Colour coding: green > 55fps, amber > 30, red otherwise.
  const fpsColor =
    stats.fps >= 55 ? '#4ADE80' : stats.fps >= 30 ? '#FACC15' : '#F87171';
  const worstColor =
    stats.worstMs < 20 ? '#4ADE80' : stats.worstMs < 40 ? '#FACC15' : '#F87171';

  return (
    <div
      className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-[60] select-none"
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      }}
    >
      <div className="bg-black/70 backdrop-blur-md border border-white/15 rounded-full px-3 py-1 shadow-lg flex items-center gap-3 text-[11px] font-semibold">
        <span style={{ color: fpsColor }}>
          {stats.fps.toFixed(0)}
          <span className="text-white/60 text-[9px] ml-0.5">fps</span>
        </span>
        <span className="text-white/30">|</span>
        <span style={{ color: worstColor }}>
          {stats.worstMs.toFixed(1)}
          <span className="text-white/60 text-[9px] ml-0.5">ms peak</span>
        </span>
        <button
          className="ml-1 text-white/50 hover:text-white text-[10px] leading-none"
          onClick={() => setVisible(false)}
          aria-label="Hide FPS meter"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
