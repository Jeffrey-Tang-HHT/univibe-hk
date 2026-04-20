import { useRef, useState } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Concept-art style leader-line zone labels.
 *
 * Each label is a small HTML pill projected from a 3D world position, with an
 * SVG leader-line pointing to the landmark it refers to. Labels auto-fade when
 * the camera gets close (so they don't clutter up the foreground when the
 * player is right next to a landmark).
 *
 * `Html` from @react-three/drei does the 3D→screen projection for us and
 * respects occlusion sort order. We use `zIndexRange` to stay below HUD chrome
 * but above the 3D scene.
 */

interface ZoneLabelConfig {
  key: string;
  position: [number, number, number]; // World anchor (where the line points to)
  offset: [number, number]; // Screen-space pixel offset for the pill
  color: string;
  label: { zh: string; en: string };
  icon: string; // SVG path data or emoji-free shape
}

const ZONE_LABELS: ZoneLabelConfig[] = [
  {
    key: 'study',
    position: [-18, 3.6, -15],
    offset: [-140, -20],
    color: '#45B7D1',
    label: { zh: '自習區', en: 'Study Zone' },
    icon: 'book',
  },
  {
    key: 'social',
    position: [18, 3.6, -15],
    offset: [140, -20],
    color: '#FF6B6B',
    label: { zh: '社交區', en: 'Social Zone' },
    icon: 'mic',
  },
  {
    key: 'dating',
    position: [-18, 3.6, 18],
    offset: [-150, 10],
    color: '#C4B5FD',
    label: { zh: '交友角', en: 'Dating Corner' },
    icon: 'heart',
  },
  {
    key: 'cafe',
    position: [18, 3.6, 18],
    offset: [150, 10],
    color: '#FFA07A',
    label: { zh: '咖啡廳', en: 'Café' },
    icon: 'coffee',
  },
];

function IconSvg({ kind, color }: { kind: string; color: string }) {
  const common = { width: 12, height: 12, fill: 'none', stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'book':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 19.5v-15a2.5 2.5 0 0 1 2.5-2.5H20v18H6.5a2.5 2.5 0 0 1 0-5H20" />
        </svg>
      );
    case 'mic':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="9" y="3" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 24 24" {...common} fill={color}>
          <path d="M12 21s-7-4.5-9.5-9A5 5 0 0 1 12 6a5 5 0 0 1 9.5 6C19 16.5 12 21 12 21z" />
        </svg>
      );
    case 'coffee':
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 8h14v7a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM17 9h2a3 3 0 0 1 0 6h-2M6 2v2M10 2v2M14 2v2" />
        </svg>
      );
    default:
      return null;
  }
}

function ZoneLabel({
  config,
  lang,
  currentZone,
}: {
  config: ZoneLabelConfig;
  lang: string;
  currentZone: string;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const isCurrent = currentZone === config.key;

  return (
    <group ref={groupRef} position={config.position}>
      <Html
        center
        zIndexRange={[25, 10]}
        distanceFactor={undefined}
        style={{
          pointerEvents: 'none',
          transition: 'opacity 0.3s',
          opacity: isCurrent ? 0.35 : 1, // Fade when player is in this zone
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 1,
            height: 1,
          }}
        >
          {/* Leader line + pill, offset in screen space */}
          <div
            style={{
              position: 'absolute',
              left: config.offset[0],
              top: config.offset[1],
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            {/* Pill comes first if offset is negative-x (left of anchor), */}
            {/* line comes first if offset is positive-x (right of anchor). */}
            {config.offset[0] < 0 ? (
              <>
                <ZonePill color={config.color} label={config.label[lang === 'zh' ? 'zh' : 'en']} icon={config.icon} hovered={hovered} />
                <LeaderLine color={config.color} direction="right" />
                <AnchorDot color={config.color} />
              </>
            ) : (
              <>
                <AnchorDot color={config.color} />
                <LeaderLine color={config.color} direction="left" />
                <ZonePill color={config.color} label={config.label[lang === 'zh' ? 'zh' : 'en']} icon={config.icon} hovered={hovered} />
              </>
            )}
          </div>
        </div>
      </Html>
    </group>
  );
}

function ZonePill({
  color,
  label,
  icon,
  hovered,
}: {
  color: string;
  label: string;
  icon: string;
  hovered: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px 5px 9px',
        borderRadius: 999,
        background: 'rgba(20, 22, 30, 0.88)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: `1px solid ${color}`,
        boxShadow: hovered
          ? `0 6px 18px -4px ${color}99, 0 2px 6px rgba(0,0,0,0.35)`
          : `0 4px 14px -4px ${color}66, 0 2px 6px rgba(0,0,0,0.3)`,
        whiteSpace: 'nowrap',
        fontFamily: "'Space Grotesk', sans-serif",
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'transform 0.18s, box-shadow 0.18s',
        cursor: 'default',
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: `${color}2E`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconSvg kind={icon} color={color} />
      </div>
      <span
        style={{
          color: 'white',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.01em',
          lineHeight: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function LeaderLine({ color, direction }: { color: string; direction: 'left' | 'right' }) {
  return (
    <svg
      width="48"
      height="14"
      viewBox="0 0 48 14"
      style={{ display: 'block', flexShrink: 0 }}
    >
      {direction === 'right' ? (
        <>
          <line x1="0" y1="7" x2="44" y2="7" stroke={color} strokeWidth="1.3" strokeDasharray="2.5 2" opacity="0.9" />
          <circle cx="46" cy="7" r="1.8" fill={color} />
        </>
      ) : (
        <>
          <circle cx="2" cy="7" r="1.8" fill={color} />
          <line x1="4" y1="7" x2="48" y2="7" stroke={color} strokeWidth="1.3" strokeDasharray="2.5 2" opacity="0.9" />
        </>
      )}
    </svg>
  );
}

function AnchorDot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        boxShadow: `0 0 10px ${color}, 0 0 0 2px rgba(255,255,255,0.9)`,
        flexShrink: 0,
      }}
    />
  );
}

export default function ZoneLabels({
  lang,
  currentZone,
}: {
  lang: string;
  currentZone: string;
}) {
  return (
    <>
      {ZONE_LABELS.map(config => (
        <ZoneLabel key={config.key} config={config} lang={lang} currentZone={currentZone} />
      ))}
    </>
  );
}
