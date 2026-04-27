import { useRef, useState, useCallback } from 'react';

/**
 * Virtual joystick for touch-screen movement.
 *
 * Writes the current stick direction into `dirRef` in the range [-1, 1] on each axis:
 *   dirRef.current.x  = -1 left  → +1 right
 *   dirRef.current.z  = -1 up    → +1 down   (matches PlayerController's world z convention)
 *
 * Uses Pointer Events + setPointerCapture so drags track correctly even if the finger/mouse
 * leaves the joystick area. Works with touch, mouse, and pen.
 *
 * Visual: concept-art HUD style — outer gradient ring, dark glass base, directional glyphs,
 * glossy knob with active-state colour shift.
 */
interface VirtualJoystickProps {
  dirRef: React.MutableRefObject<{ x: number; z: number }>;
  className?: string;
  /** Outer diameter in px. Default 120. */
  size?: number;
}

export default function VirtualJoystick({
  dirRef,
  className = '',
  size = 120,
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const knobSize = 50;
  const maxDist = size / 2 - knobSize / 2 - 4;

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const dx = clientX - centerRef.current.x;
      const dy = clientY - centerRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, maxDist);
      const angle = Math.atan2(dy, dx);
      const kx = Math.cos(angle) * clamped;
      const ky = Math.sin(angle) * clamped;
      setKnob({ x: kx, y: ky });
      dirRef.current.x = kx / maxDist;
      dirRef.current.z = ky / maxDist;
    },
    [dirRef, maxDist],
  );

  const release = useCallback(() => {
    pointerIdRef.current = null;
    setActive(false);
    setKnob({ x: 0, y: 0 });
    dirRef.current.x = 0;
    dirRef.current.z = 0;
  }, [dirRef]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!containerRef.current) return;
      if (pointerIdRef.current !== null) return;
      const rect = containerRef.current.getBoundingClientRect();
      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      pointerIdRef.current = e.pointerId;
      containerRef.current.setPointerCapture(e.pointerId);
      setActive(true);
      updateFromPoint(e.clientX, e.clientY);
    },
    [updateFromPoint],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      updateFromPoint(e.clientX, e.clientY);
    },
    [updateFromPoint],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (pointerIdRef.current !== e.pointerId) return;
      release();
    },
    [release],
  );

  // Direction highlight — which cardinal is closest to the knob angle
  const angle = Math.atan2(knob.y, knob.x);
  const mag = Math.sqrt(knob.x * knob.x + knob.y * knob.y) / maxDist;
  const isUp = active && mag > 0.25 && angle < -Math.PI / 4 && angle > (-3 * Math.PI) / 4;
  const isDown = active && mag > 0.25 && angle > Math.PI / 4 && angle < (3 * Math.PI) / 4;
  const isLeft = active && mag > 0.25 && (angle > (3 * Math.PI) / 4 || angle < (-3 * Math.PI) / 4);
  const isRight = active && mag > 0.25 && angle > -Math.PI / 4 && angle < Math.PI / 4;

  return (
    <div
      className={`relative select-none touch-none ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      {/* Outer gradient glow ring — layered behind, shows through on active */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background: active
            ? 'conic-gradient(from 0deg, #FF6B6B, #EC4899, #A78BFA, #4ECDC4, #FF6B6B)'
            : 'transparent',
          opacity: active ? 0.45 : 0,
          filter: 'blur(10px)',
          transition: 'opacity 0.2s',
        }}
      />

      {/* Main joystick body */}
      <div
        ref={containerRef}
        className="relative w-full h-full rounded-full shadow-2xl"
        style={{
          background: active
            ? 'radial-gradient(circle at 30% 30%, rgba(255,107,107,0.18), rgba(10,10,20,0.6) 70%)'
            : 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.12), rgba(10,10,20,0.55) 70%)',
          border: `1.5px solid ${active ? 'rgba(255,107,107,0.7)' : 'rgba(255,255,255,0.32)'}`,
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          transition: 'background 0.18s, border-color 0.18s',
          boxShadow: active
            ? '0 10px 30px rgba(255,107,107,0.25), inset 0 1px 0 rgba(255,255,255,0.15)'
            : '0 8px 24px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Inner guide ring */}
        <div className="absolute inset-3 rounded-full border border-white/15 pointer-events-none" />

        {/* Crosshair axes — faint */}
        <svg
          className="absolute inset-0 pointer-events-none"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line x1="50" y1="14" x2="50" y2="86" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" strokeDasharray="1.5 2" />
          <line x1="14" y1="50" x2="86" y2="50" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5" strokeDasharray="1.5 2" />
        </svg>

        {/* Directional indicators — triangle glyphs */}
        <div className="absolute inset-0 pointer-events-none">
          <DirTriangle
            position="top"
            active={isUp}
          />
          <DirTriangle
            position="bottom"
            active={isDown}
          />
          <DirTriangle
            position="left"
            active={isLeft}
          />
          <DirTriangle
            position="right"
            active={isRight}
          />
        </div>

        {/* Centre dot — knob home indicator */}
        <div
          className="absolute left-1/2 top-1/2 w-1 h-1 rounded-full pointer-events-none"
          style={{
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255,255,255,0.25)',
          }}
        />

        {/* Knob */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: knobSize,
            height: knobSize,
            left: `calc(50% - ${knobSize / 2}px)`,
            top: `calc(50% - ${knobSize / 2}px)`,
            transform: `translate(${knob.x}px, ${knob.y}px)`,
            background: active
              ? 'linear-gradient(135deg, #FF6B6B 0%, #EC4899 50%, #A78BFA 100%)'
              : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(240,240,250,0.78) 100%)',
            border: `1.5px solid ${active ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.55)'}`,
            boxShadow: active
              ? '0 8px 20px rgba(255,107,107,0.45), inset 0 2px 4px rgba(255,255,255,0.3), inset 0 -2px 4px rgba(0,0,0,0.15)'
              : '0 6px 16px rgba(0,0,0,0.35), inset 0 2px 4px rgba(255,255,255,0.8), inset 0 -2px 4px rgba(0,0,0,0.08)',
            transition: active ? 'background 0.15s, box-shadow 0.15s' : 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), background 0.18s, box-shadow 0.18s',
          }}
        >
          {/* Gloss highlight */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              inset: 3,
              background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 55%)',
              opacity: active ? 0.6 : 0.9,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function DirTriangle({
  position,
  active,
}: {
  position: 'top' | 'bottom' | 'left' | 'right';
  active: boolean;
}) {
  const base: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
    transition: 'all 0.15s',
  };
  const color = active ? '#FF6B6B' : 'rgba(255,255,255,0.35)';
  const glow = active ? 'drop-shadow(0 0 4px rgba(255,107,107,0.8))' : 'none';

  const configs: Record<string, React.CSSProperties> = {
    top: {
      ...base,
      top: 6,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderBottom: `7px solid ${color}`,
      filter: glow,
    },
    bottom: {
      ...base,
      bottom: 6,
      left: '50%',
      transform: 'translateX(-50%)',
      borderLeft: '5px solid transparent',
      borderRight: '5px solid transparent',
      borderTop: `7px solid ${color}`,
      filter: glow,
    },
    left: {
      ...base,
      left: 6,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '5px solid transparent',
      borderBottom: '5px solid transparent',
      borderRight: `7px solid ${color}`,
      filter: glow,
    },
    right: {
      ...base,
      right: 6,
      top: '50%',
      transform: 'translateY(-50%)',
      borderTop: '5px solid transparent',
      borderBottom: '5px solid transparent',
      borderLeft: `7px solid ${color}`,
      filter: glow,
    },
  };

  return <div style={configs[position]} aria-hidden />;
}
