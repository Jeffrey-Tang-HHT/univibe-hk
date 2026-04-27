// ─────────────────────────────────────────────────────────────
// InteriorScene — generic interior renderer.
//
// Drop 1: shows a placeholder room with theme-tinted floor, four
// walls, decorative pillars, a centre pedestal/orb, the scene name
// on the back wall, and an exit pad near the front. Each scene
// shares this geometry; only the label, theme colour, bounds, and
// spawn change. That's enough to verify the transition flow E2E.
//
// Drop 2: this file is replaced (or branched per-scene) with real
// geometry — Library has bookshelves, Café has tables, etc.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import type { SceneId } from '@/lib/plaza';
import { getSceneConfig } from '@/lib/scenes';
import EntryTrigger from '../EntryTrigger';

interface InteriorSceneProps {
  sceneId: SceneId;
  lang: string;
  playerPosRef: React.MutableRefObject<{ x: number; z: number }>;
}

export default function InteriorScene({ sceneId, lang, playerPosRef }: InteriorSceneProps) {
  const cfg = getSceneConfig(sceneId);
  const { hx, hz } = cfg.bounds;

  // Pre-mix the floor accent colour once.
  const accentColor = useMemo(() => cfg.themeColor + '55', [cfg.themeColor]);

  return (
    <group>
      {/* Floor */}
      <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[hx * 2, hz * 2]} />
        <meshStandardMaterial color={cfg.themeColor} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Floor accent ring — soft halo around the centre pedestal */}
      <mesh receiveShadow position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[hx * 0.45, hx * 0.52, 64]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.55} />
      </mesh>

      {/* Four walls */}
      <mesh receiveShadow castShadow position={[0, 2.5, -hz]}>
        <boxGeometry args={[hx * 2, 5, 0.2]} />
        <meshStandardMaterial color="#2D2D2D" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[0, 2.5, hz]}>
        <boxGeometry args={[hx * 2, 5, 0.2]} />
        <meshStandardMaterial color="#2D2D2D" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[-hx, 2.5, 0]}>
        <boxGeometry args={[0.2, 5, hz * 2]} />
        <meshStandardMaterial color="#2D2D2D" roughness={0.9} />
      </mesh>
      <mesh receiveShadow castShadow position={[hx, 2.5, 0]}>
        <boxGeometry args={[0.2, 5, hz * 2]} />
        <meshStandardMaterial color="#2D2D2D" roughness={0.9} />
      </mesh>

      {/* Big scene label on the back wall — placeholder so you can tell
          interiors apart at a glance during Drop 1 testing. */}
      <Text
        position={[0, 3.3, -hz + 0.12]}
        fontSize={0.9}
        color={cfg.themeColor}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {lang === 'zh' ? cfg.nameZh : cfg.nameEn}
      </Text>
      <Text
        position={[0, 2.3, -hz + 0.12]}
        fontSize={0.32}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
        maxWidth={hx * 1.6}
      >
        {lang === 'zh' ? cfg.taglineZh : cfg.taglineEn}
      </Text>
      <Text
        position={[0, 1.7, -hz + 0.12]}
        fontSize={0.22}
        color="#888888"
        anchorX="center"
        anchorY="middle"
      >
        {lang === 'zh' ? '（Drop 1 預覽 — 內部尚未完工）' : '(Drop 1 placeholder — interior not yet built)'}
      </Text>

      {/* Decorative pillars at each corner — gives the room a sense of scale. */}
      {[
        [-hx + 1.5, -hz + 1.5],
        [ hx - 1.5, -hz + 1.5],
        [-hx + 1.5,  hz - 1.5],
        [ hx - 1.5,  hz - 1.5],
      ].map(([x, z], i) => (
        <mesh key={i} castShadow position={[x, 1.6, z]}>
          <cylinderGeometry args={[0.25, 0.3, 3.2, 12]} />
          <meshStandardMaterial color="#1F1F1F" roughness={0.7} />
        </mesh>
      ))}

      {/* Centre pedestal + glowing orb — focal point + per-scene mood light. */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.6, 0.7, 0.6, 24]} />
        <meshStandardMaterial color="#3a3a3a" roughness={0.4} />
      </mesh>
      <mesh castShadow position={[0, 0.85, 0]}>
        <sphereGeometry args={[0.35, 24, 16]} />
        <meshStandardMaterial
          color={cfg.themeColor}
          emissive={cfg.themeColor}
          emissiveIntensity={0.7}
          roughness={0.2}
        />
      </mesh>
      <pointLight
        position={[0, 1.6, 0]}
        intensity={0.8}
        distance={hx * 1.8}
        color={cfg.themeColor}
        castShadow={false}
      />

      {/* A general fill light so corners aren't pitch black. */}
      <ambientLight intensity={0.3} color="#FFFFFF" />

      {/* Exit pad — walking onto it triggers a return to the plaza. */}
      <ExitPad sceneId={sceneId} lang={lang} playerPosRef={playerPosRef} />
    </group>
  );
}

// ─── Exit pad ───
// Visually a glowing tile near the front of the room; mechanically an
// EntryTrigger that targets 'plaza' with a custom spawn (this scene's
// exitToPlaza coordinates).
function ExitPad({
  sceneId,
  lang,
  playerPosRef,
}: {
  sceneId: SceneId;
  lang: string;
  playerPosRef: React.MutableRefObject<{ x: number; z: number }>;
}) {
  const cfg = getSceneConfig(sceneId);
  const exitZ = cfg.bounds.hz - 1.4;

  const targetSpawn: [number, number, number] = cfg.exitToPlaza
    ? [cfg.exitToPlaza.x, 0, cfg.exitToPlaza.z]
    : [0, 0, 5];

  return (
    <group>
      {/* Visual indicator — outer ring + inner translucent disc */}
      <mesh position={[0, 0.02, exitZ]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <ringGeometry args={[0.7, 1.0, 24]} />
        <meshBasicMaterial color="#FFFFFF" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.025, exitZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.7, 24]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.4}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* The trigger itself — reuses the same component as plaza-side entries. */}
      <EntryTrigger
        sceneId="plaza"
        lang={lang}
        position={[0, 0, exitZ]}
        radius={1.0}
        playerPosRef={playerPosRef}
        targetSpawn={targetSpawn}
        labelOverride={lang === 'zh' ? '回到廣場' : 'Back to plaza'}
      />
    </group>
  );
}
