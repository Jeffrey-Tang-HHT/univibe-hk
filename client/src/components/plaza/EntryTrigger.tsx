// ─────────────────────────────────────────────────────────────
// EntryTrigger — invisible cylinder that detects when the player
// walks within range, shows a confirmation prompt, and on confirm
// dispatches a scene change.
//
// Used both ways: plaza-side triggers point to interiors; the exit
// pad inside an interior points back to 'plaza'. Same component,
// same prompt UI, different target.
//
// Drop 1: prompt is keyboard 'E' or click/tap on the prompt itself.
// Drop 2 / polish pass: gamepad input, hold-to-confirm, etc.
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { SceneId } from '@/lib/plaza';
import { getSceneConfig } from '@/lib/scenes';
import { useScene } from '@/contexts/SceneContext';

interface EntryTriggerProps {
  sceneId: SceneId;
  lang: string;
  position: [number, number, number];
  radius: number;
  playerPosRef: React.MutableRefObject<{ x: number; z: number }>;
  // Override the default spawn for the destination scene. Used by the
  // interior exit pad to send the player back to the right plaza spot.
  targetSpawn?: [number, number, number];
  // Override the prompt label (for the exit pad: "Back to plaza").
  labelOverride?: string;
}

export default function EntryTrigger({
  sceneId,
  lang,
  position,
  radius,
  playerPosRef,
  targetSpawn,
  labelOverride,
}: EntryTriggerProps) {
  const { transitionState, requestSceneChange, currentScene } = useScene();
  const [inRange, setInRange] = useState(false);
  const inRangeRef = useRef(false);

  const cfg = getSceneConfig(sceneId);

  // Per-frame proximity check. We compare squared distances to avoid sqrt.
  useFrame(() => {
    // Don't process triggers during a fade — would cause flicker / re-entry.
    if (transitionState !== 'idle') {
      if (inRangeRef.current) {
        inRangeRef.current = false;
        setInRange(false);
      }
      return;
    }

    const dx = playerPosRef.current.x - position[0];
    const dz = playerPosRef.current.z - position[2];
    const distSq = dx * dx + dz * dz;
    const inside = distSq <= radius * radius;

    if (inside !== inRangeRef.current) {
      inRangeRef.current = inside;
      setInRange(inside);
    }
  });

  const confirm = () => {
    if (transitionState !== 'idle') return;
    if (sceneId === currentScene) return;
    requestSceneChange(sceneId, targetSpawn ? { spawn: targetSpawn } : undefined);
  };

  // Keyboard handling: 'E' confirms when in range.
  useEffect(() => {
    if (!inRange) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        confirm();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inRange, transitionState, currentScene, sceneId]);

  const promptLabel =
    labelOverride
      ?? (lang === 'zh'
        ? `進入 ${cfg.nameZh}`
        : `Enter ${cfg.nameEn}`);

  const tagline = lang === 'zh' ? cfg.taglineZh : cfg.taglineEn;

  return (
    <group position={position}>
      {/* Visual hint on the ground — soft pulsing ring so the player
          can see entry points before walking onto them. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[radius * 0.85, radius, 36]} />
        <meshBasicMaterial color={cfg.themeColor} transparent opacity={inRange ? 0.55 : 0.28} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.018, 0]}>
        <circleGeometry args={[radius * 0.85, 36]} />
        <meshBasicMaterial color={cfg.themeColor} transparent opacity={inRange ? 0.18 : 0.08} />
      </mesh>

      {/* Prompt UI — only when in range. */}
      {inRange && (
        <Html position={[0, 1.8, 0]} center distanceFactor={10} zIndexRange={[40, 0]}>
          <button
            type="button"
            onClick={confirm}
            className="select-none whitespace-nowrap pointer-events-auto"
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(15,15,20,0.78)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: `1px solid ${cfg.themeColor}88`,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: 0.2,
              boxShadow: `0 6px 22px ${cfg.themeColor}44`,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontSize: 10,
                    background: cfg.themeColor,
                    color: '#0a0a0a',
                    padding: '1px 6px',
                    borderRadius: 4,
                    fontWeight: 800,
                  }}
                >
                  E
                </span>
                {promptLabel}
              </span>
              <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 400 }}>{tagline}</span>
            </span>
          </button>
        </Html>
      )}
    </group>
  );
}
