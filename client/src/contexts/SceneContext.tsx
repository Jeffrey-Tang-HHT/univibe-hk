// ─────────────────────────────────────────────────────────────
// SceneContext — global "which scene is the player in right now".
//
// Read by: Plaza.tsx (render router), PlayerController (spawn/exit
// handling), API call sites (filter by scene), HUD (display scene
// name / mute toggle), ambient sound + particle systems.
//
// Written by: SceneTransition (during a scene change) and the entry
// triggers / exit doors.
//
// Transition lifecycle:
//   1. EntryTrigger or exit-door dispatches `requestSceneChange(id)`.
//   2. We set `transitionState = 'fading-out'` and remember the target.
//   3. After the fade-out (~600ms), we set `currentScene` to the target,
//      teleport the player to the scene's spawn point, then flip to
//      `transitionState = 'fading-in'`.
//   4. After the fade-in (~600ms), `transitionState` returns to 'idle'.
// ─────────────────────────────────────────────────────────────

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { SceneId } from '@/lib/plaza';
import { getSceneConfig, normalizeSceneId } from '@/lib/scenes';

export type TransitionState = 'idle' | 'fading-out' | 'fading-in';

interface SceneContextValue {
  currentScene: SceneId;
  // While a fade is in progress, this is the scene we're heading to.
  // Equal to `currentScene` when idle.
  targetScene: SceneId;
  transitionState: TransitionState;
  // Imperative spawn-point ref. Read once by PlayerController on each
  // scene change (it watches `currentScene`) so it can teleport without
  // needing to re-render its props.
  spawnPointRef: React.MutableRefObject<[number, number, number]>;
  // Trigger a scene change. Idempotent during a transition (silently
  // ignored if a fade is already in progress).
  requestSceneChange: (id: SceneId, opts?: { spawn?: [number, number, number] }) => void;
  // Mute toggle for ambient sound. Persists in module scope only —
  // intentionally not in localStorage (would need a write each time).
  muted: boolean;
  setMuted: (m: boolean) => void;
}

const SceneContext = createContext<SceneContextValue | null>(null);

// Tunables — keep in lockstep with SceneTransition.tsx.
const FADE_OUT_MS = 600;
const HOLD_MS = 200;
const FADE_IN_MS = 600;

interface SceneProviderProps {
  children: ReactNode;
  initial?: SceneId;
}

export function SceneProvider({ children, initial = 'plaza' }: SceneProviderProps) {
  const [currentScene, setCurrentScene] = useState<SceneId>(normalizeSceneId(initial));
  const [targetScene, setTargetScene] = useState<SceneId>(normalizeSceneId(initial));
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const [muted, setMuted] = useState(false);

  // Spawn point for the *next* scene. PlayerController reads this when
  // currentScene changes and teleports.
  const spawnPointRef = useRef<[number, number, number]>(getSceneConfig(currentScene).spawn);

  const inFlightRef = useRef(false);

  const requestSceneChange = useCallback<SceneContextValue['requestSceneChange']>((id, opts) => {
    if (inFlightRef.current) return;
    if (id === currentScene) return;

    inFlightRef.current = true;
    const targetCfg = getSceneConfig(id);
    setTargetScene(id);
    setTransitionState('fading-out');

    // Fade out → swap → hold → fade in.
    setTimeout(() => {
      // Pick spawn: explicit override first, otherwise the scene's default.
      spawnPointRef.current = opts?.spawn ?? targetCfg.spawn;
      setCurrentScene(id);
      setTransitionState('fading-in');

      setTimeout(() => {
        setTransitionState('idle');
        inFlightRef.current = false;
      }, FADE_IN_MS + HOLD_MS);
    }, FADE_OUT_MS + HOLD_MS);
  }, [currentScene]);

  const value = useMemo<SceneContextValue>(() => ({
    currentScene,
    targetScene,
    transitionState,
    spawnPointRef,
    requestSceneChange,
    muted,
    setMuted,
  }), [currentScene, targetScene, transitionState, requestSceneChange, muted]);

  return (
    <SceneContext.Provider value={value}>
      {children}
    </SceneContext.Provider>
  );
}

export function useScene() {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error('useScene must be used within a SceneProvider');
  return ctx;
}

// Re-export timings so SceneTransition can match them exactly.
export const SCENE_TRANSITION_TIMINGS = {
  fadeOut: FADE_OUT_MS,
  hold: HOLD_MS,
  fadeIn: FADE_IN_MS,
} as const;
