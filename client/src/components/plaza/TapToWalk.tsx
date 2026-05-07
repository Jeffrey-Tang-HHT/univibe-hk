import { useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';

// ─────────────────────────────────────────────────────────────
// TapToWalk — invisible ground catcher for click/double-tap
// auto-walk.
//
// Lives in the scene tree (placed in PlazaScene). Renders a flat
// transparent plane the size of the world, slightly above y=0 so
// it's the first thing the raycaster hits. On click (desktop) or
// double-tap (touch), it converts the hit point to (x, z) and
// hands it to onSetWaypoint — which writes the waypoint in
// Plaza.tsx exactly the same way the MiniMap does.
//
// Why double-tap on touch instead of single tap?
// A single tap on touch would fire every time the user tries to
// interact with anything else in the HUD; the double-tap hurdle
// makes it a deliberate gesture.
//
// Desktop: single-click works (mouse intent is unambiguous).
// Touch:   we count two taps within `DOUBLE_TAP_MS` on the ground.
// ─────────────────────────────────────────────────────────────

interface TapToWalkProps {
  onSetWaypoint: (x: number, z: number) => void;
  /** Match world bounds clamp in PlayerController (±45). */
  size?: number;
}

const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_DIST = 24; // px — 2nd tap must land within this radius

export default function TapToWalk({ onSetWaypoint, size = 100 }: TapToWalkProps) {
  // Track the last touch tap so we can recognise a double-tap.
  const lastTapRef = useRef<{ t: number; x: number; y: number } | null>(null);

  const handlePointer = (e: ThreeEvent<PointerEvent>) => {
    // Only handle primary button / single touch.
    const native = e.nativeEvent;
    const isTouch = native.pointerType === 'touch';

    if (isTouch) {
      const now = Date.now();
      const last = lastTapRef.current;
      const dx = last ? native.clientX - last.x : Infinity;
      const dy = last ? native.clientY - last.y : Infinity;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (last && now - last.t <= DOUBLE_TAP_MS && dist <= DOUBLE_TAP_DIST) {
        // Double tap → fire.
        lastTapRef.current = null;
        e.stopPropagation();
        const { x, z } = e.point;
        onSetWaypoint(x, z);
        return;
      }
      // First tap of a potential double — record and bail.
      lastTapRef.current = { t: now, x: native.clientX, y: native.clientY };
      return;
    }

    // Mouse click → fire immediately.
    e.stopPropagation();
    const { x, z } = e.point;
    onSetWaypoint(x, z);
  };

  return (
    <mesh
      // Sits 2cm above ground — close enough that shadows/lighting
      // still look natural, far enough that buildings/colliders win
      // raycast hits when the click is on top of them.
      position={[0, 0.02, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerDown={handlePointer}
    >
      <planeGeometry args={[size, size]} />
      {/* Fully transparent, but `transparent` + opacity 0 means the
          mesh still receives pointer events. depthWrite=false stops
          it from interfering with shadow / depth ordering. */}
      <meshBasicMaterial
        transparent
        opacity={0}
        depthWrite={false}
      />
    </mesh>
  );
}
