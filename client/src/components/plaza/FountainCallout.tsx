import { Html } from '@react-three/drei';

/**
 * "Particle spout" callout pointing at the fountain, matching the concept art.
 * Uses the same visual language as ZoneLabels — anchor dot → dashed leader
 * line → pill — but with a neutral white/teal palette since the fountain
 * is in the central plaza (not a themed zone).
 */

interface FountainCalloutProps {
  lang: string;
  /** Hide while player is very close to the fountain (avoids clutter). */
  hidden?: boolean;
}

export default function FountainCallout({ lang, hidden = false }: FountainCalloutProps) {
  const color = '#4ECDC4';
  const isZh = lang === 'zh';

  return (
    // Anchor is just above the fountain's top bowl (~2.8 units up)
    <group position={[0, 2.8, 0]}>
      <Html
        center
        zIndexRange={[24, 10]}
        style={{
          pointerEvents: 'none',
          transition: 'opacity 0.3s',
          opacity: hidden ? 0 : 1,
        }}
      >
        <div style={{ position: 'relative', width: 1, height: 1 }}>
          <div
            style={{
              position: 'absolute',
              // Offset up-and-right so it doesn't overlap the water plume
              left: 80,
              top: -30,
              transform: 'translate(-0%, -50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {/* Anchor dot — sits at the world position */}
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 10px ${color}, 0 0 0 2px rgba(255,255,255,0.9)`,
                flexShrink: 0,
                marginLeft: -80,
                marginTop: 30,
                position: 'relative',
              }}
            />
            {/* Diagonal leader line — drawn in SVG */}
            <svg
              width="80"
              height="34"
              viewBox="0 0 80 34"
              style={{
                display: 'block',
                position: 'absolute',
                left: -75,
                top: 26,
                pointerEvents: 'none',
              }}
            >
              <line
                x1="2"
                y1="30"
                x2="76"
                y2="4"
                stroke={color}
                strokeWidth="1.3"
                strokeDasharray="2.5 2"
                opacity="0.9"
              />
            </svg>

            {/* Pill */}
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
                boxShadow: `0 4px 14px -4px ${color}66, 0 2px 6px rgba(0,0,0,0.3)`,
                whiteSpace: 'nowrap',
                fontFamily: "'Space Grotesk', sans-serif",
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
                {/* Water-drop icon */}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2.69s-5.5 6-5.5 10.5a5.5 5.5 0 0 0 11 0C17.5 8.69 12 2.69 12 2.69z" />
                </svg>
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
                {isZh ? '噴泉' : 'Particle spout'}
              </span>
            </div>
          </div>
        </div>
      </Html>
    </group>
  );
}
