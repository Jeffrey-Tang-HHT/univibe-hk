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
 * PlayerController reads the ref every frame alongside keyboard input, so this
 * coexists cleanly with WASD and supports analog speed.
 */
interface VirtualJoystickProps {
  dirRef: React.MutableRefObject<{ x: number; z: number }>;
  className?: string;
  /** Outer diameter in px. Default 112. */
  size?: number;
}

export default function VirtualJoystick({
  dirRef,
  className = '',
  size = 112,
}: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const centerRef = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const maxDist = size / 2 - 20;

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
      // Only track the first pointer that engages
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

  return (
    <div
      ref={containerRef}
      className={`relative select-none touch-none shadow-2xl rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: active
          ? 'radial-gradient(circle, rgba(255,107,107,0.22), rgba(0,0,0,0.32))'
          : 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(0,0,0,0.28))',
        border: `2px solid ${active ? 'rgba(255,107,107,0.75)' : 'rgba(255,255,255,0.42)'}`,
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Inner guide ring */}
      <div className="absolute inset-2 rounded-full border border-white/15 pointer-events-none" />

      {/* Directional hints */}
      <div className="absolute inset-0 pointer-events-none">
        <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-white/35 text-[10px] font-bold">↑</span>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white/35 text-[10px] font-bold">↓</span>
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white/35 text-[10px] font-bold">←</span>
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/35 text-[10px] font-bold">→</span>
      </div>

      {/* Knob */}
      <div
        className="absolute rounded-full pointer-events-none shadow-xl"
        style={{
          width: 46,
          height: 46,
          left: `calc(50% - 23px)`,
          top: `calc(50% - 23px)`,
          transform: `translate(${knob.x}px, ${knob.y}px)`,
          background: active
            ? 'linear-gradient(135deg, #FF6B6B, #EC4899)'
            : 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.7))',
          border: '1.5px solid rgba(255,255,255,0.55)',
          transition: active ? 'none' : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      />
    </div>
  );
}
