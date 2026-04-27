// ─────────────────────────────────────────────────────────────
// PlazaScene — thin wrapper around the existing outdoor plaza.
//
// Exists so the SceneRouter has a consistent component type for
// every scene. Drop 1: just renders Environment3D unchanged.
// Drop 2 / Blender pass: this is where you'd swap the hand-coded
// environment for a `useGLTF`-loaded model.
// ─────────────────────────────────────────────────────────────

import Environment3D from '../Environment3D';
import EntryTrigger from '../EntryTrigger';
import { INTERIOR_SCENES, SCENES } from '@/lib/scenes';

interface PlazaSceneProps {
  lang: string;
  currentZone: string;
  playerPosRef: React.MutableRefObject<{ x: number; z: number }>;
}

export default function PlazaScene({ lang, currentZone, playerPosRef }: PlazaSceneProps) {
  return (
    <group>
      <Environment3D
        lang={lang}
        currentZone={currentZone}
        playerPosRef={playerPosRef}
      />

      {/* Entry triggers — one per interior scene. Each is an invisible
          cylinder near the corresponding zone landmark. Walking into it
          shows the "Enter [scene]" prompt; confirming triggers a fade. */}
      {INTERIOR_SCENES.map((id) => {
        const cfg = SCENES[id];
        if (!cfg.entryFromPlaza) return null;
        return (
          <EntryTrigger
            key={id}
            sceneId={id}
            lang={lang}
            position={[cfg.entryFromPlaza.x, 0, cfg.entryFromPlaza.z]}
            radius={cfg.entryFromPlaza.radius}
            playerPosRef={playerPosRef}
          />
        );
      })}
    </group>
  );
}
