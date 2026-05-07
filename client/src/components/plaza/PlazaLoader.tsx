import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────
// PlazaLoader — full-screen loader shown while the Plaza chunk
// downloads + Three.js boots.
//
// Replaces the bare "Loading 3D Plaza…" text in App.tsx. Looks
// like the v5 plaza HUD (gradient banner, dotted spinner) so the
// transition into the actual plaza feels like the same product.
//
// Tips shown below the spinner rotate every 4s so the loader
// actually feels purposeful while the user waits 1-3s.
// ─────────────────────────────────────────────────────────────

const TIPS_ZH = [
  '使用 WASD 或方向鍵移動',
  '雙擊地面可自動走過去',
  '點擊表情按鈕和大家打招呼',
  '走進區域可以解鎖功能',
  '靠近其他同學可以聊天',
];

const TIPS_EN = [
  'Use WASD or arrow keys to move',
  'Double-tap the ground to auto-walk',
  'Tap the emote button to wave',
  'Walk into a zone to unlock features',
  'Get close to other students to chat',
];

interface PlazaLoaderProps {
  /** zh / en — defaults to whatever LanguageContext has, but we
   *  can't useContext here without bringing the provider into the
   *  Suspense fallback, so we accept an explicit prop. */
  lang?: 'zh' | 'en';
}

export default function PlazaLoader({ lang = 'zh' }: PlazaLoaderProps) {
  const tips = lang === 'zh' ? TIPS_ZH : TIPS_EN;
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTipIdx((i) => (i + 1) % tips.length), 4000);
    return () => clearInterval(t);
  }, [tips.length]);

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-[#1a2540]">
      {/* Animated gradient backdrop — matches the dawn keyframe of
          the day/night cycle so the transition into the live plaza
          feels seamless. */}
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse at 50% 90%, #5a6b95 0%, #3d4a78 35%, #1f2a50 70%, #0a1024 100%)',
        }}
      />

      {/* Subtle moving dots — fake "stars / particles" so the screen
          isn't dead while content loads. Pure CSS, no animation cost. */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Top + bottom gradient bands — same cinematic banner the
          actual Plaza uses. */}
      <div className="pointer-events-none absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black/45 to-transparent" />
      <div className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />

      {/* Centre stack */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white px-6">
        {/* Spinner — 3 staggered dots that scale up/down */}
        <div className="flex items-center gap-2 mb-6">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3 h-3 rounded-full bg-white"
              style={{
                animation: `pl-pulse 1.2s ${i * 0.18}s infinite ease-in-out`,
              }}
            />
          ))}
        </div>

        <h1 className="text-2xl md:text-3xl font-semibold tracking-wide mb-2">
          {lang === 'zh' ? '正在進入 3D 廣場' : 'Entering the 3D Plaza'}
        </h1>
        <p className="text-sm text-white/65 mb-10">
          {lang === 'zh'
            ? '正在載入場景與其他同學…'
            : 'Loading scene and other students…'}
        </p>

        {/* Rotating tip pill */}
        <div className="bg-white/8 backdrop-blur-md rounded-full px-4 py-2 border border-white/15 max-w-[90vw]">
          <p
            key={tipIdx}
            className="text-[12px] md:text-[13px] text-white/80 whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ animation: 'pl-fade 0.5s ease-out' }}
          >
            💡 {tips[tipIdx]}
          </p>
        </div>
      </div>

      {/* Inline keyframes — kept here so this file is fully self-
          contained and doesn't need a Tailwind config change. */}
      <style>{`
        @keyframes pl-pulse {
          0%, 100% { transform: scale(0.6); opacity: 0.45; }
          50%      { transform: scale(1.0); opacity: 1; }
        }
        @keyframes pl-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
