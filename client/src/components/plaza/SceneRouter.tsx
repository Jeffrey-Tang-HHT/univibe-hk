// ─────────────────────────────────────────────────────────────
// SceneRouter — picks the right scene component based on
// `currentScene` from SceneContext.
//
// Drop 1: 'plaza' renders the existing outdoor environment via
// PlazaScene; every other scene renders InteriorScene with the
// matching sceneId.
//
// Drop 2: each interior gets its own dedicated component. The
// switch below grows from one default branch to four explicit
// branches — that's the whole change.
// ─────────────────────────────────────────────────────────────

import { useScene } from '@/contexts/SceneContext';
import PlazaScene from './scenes/PlazaScene';
import InteriorScene from './scenes/InteriorScene';

interface SceneRouterProps {
  lang: string;
  currentZone: string;
  playerPosRef: React.MutableRefObject<{ x: number; z: number }>;
}

export default function SceneRouter({ lang, currentZone, playerPosRef }: SceneRouterProps) {
  const { currentScene } = useScene();

  if (currentScene === 'plaza') {
    return (
      <PlazaScene
        lang={lang}
        currentZone={currentZone}
        playerPosRef={playerPosRef}
      />
    );
  }

  // Generic placeholder for all four interiors in Drop 1.
  return (
    <InteriorScene
      sceneId={currentScene}
      lang={lang}
      playerPosRef={playerPosRef}
    />
  );
}
