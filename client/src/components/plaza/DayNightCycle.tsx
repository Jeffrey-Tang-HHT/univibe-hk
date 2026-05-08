import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// ─────────────────────────────────────────────────────────────
// DayNightCycle — animated sun, sky, ambient and fog.
//
// Replaces the static <ambientLight>, <directionalLight> x2,
// <hemisphereLight>, <fog> block AND the sky dome that lived in
// Environment3D. Drop this *inside* the <Canvas>; the rest of the
// scene is unchanged.
//
// Modes:
//   'real-hk'     — sun position follows the real Hong Kong clock
//                   (UTC+8). Realistic: night is dark, midday is bright.
//   'accelerated' — full 24h cycle in `cycleMinutes` minutes.
//                   Great for demos / first-impression visits.
//   'fixed'       — pin to a specific hour (0-24).
//
// All transitions are smooth — colours, intensities and sun position
// are linearly interpolated between the keyframe phases.
// ─────────────────────────────────────────────────────────────

export type DayNightMode = 'real-hk' | 'accelerated' | 'fixed';

interface DayNightCycleProps {
  mode?: DayNightMode;
  /** Used only when mode='accelerated'. Default 8 min = full day. */
  cycleMinutes?: number;
  /** Used only when mode='fixed'. Hour 0..24. */
  fixedHour?: number;
  /** Mobile shadow map fallback. */
  isMobile?: boolean;
  /**
   * Master toggle for the starfield. When false, stars never appear regardless
   * of the current keyframe's `starOpacity`. The starfield geometry is still
   * mounted (cheap — 600 points, 1 draw call) but its opacity is forced to 0
   * each frame so the user can flip the switch without remounting.
   */
  starsEnabled?: boolean;
}

// ── Phase keyframes ────────────────────────────────────────────
// 7 phases around the clock. Hour is 0-24 (HK local time).
// Colors use sRGB hex; converted to THREE.Color at runtime.
//
// sunAzimuth: 0 = east, π/2 = south, π = west.
// sunElevation: 0 = horizon, π/2 = zenith.
//
// Tuning notes:
// - Night ambient is intentionally NOT pitch black — students need to
//   see their avatar. Real-world dark, but visually playable.
// - Golden hour (06–07, 18–19) keeps the cinematic warm tones the
//   project has shipped with.
// - Midday is blue-shifted for "school day" feel.

interface Keyframe {
  hour: number;
  sunIntensity: number;
  sunColor: string;
  ambientIntensity: number;
  ambientColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  // Sky shader colours
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  // Sun position drivers
  sunAzimuth: number;     // radians
  sunElevation: number;   // radians, 0 at horizon, π/2 zenith
  // Toggle stars
  starOpacity: number;
}

const KEYFRAMES: Keyframe[] = [
  { // 00:00 deep night — moonlit, NOT pitch-black.
    // Stylized cartoon plazas need lifted ambient at night or
    // toon materials go to silhouette. Sun position is kept above
    // the horizon and reframed as the moon, so we get cool blue
    // shadows that look intentional.
    hour: 0,
    sunIntensity: 0.55, sunColor: '#A8BCDC',     // cool moonlight, was 0.05/#3A4A78
    ambientIntensity: 0.55, ambientColor: '#5C6E94',  // lifted from 0.25/#3D4670
    hemiSky: '#3A4A72', hemiGround: '#1F2540', hemiIntensity: 0.7,  // lifted from 0.35
    fogColor: '#2D3A5C', fogNear: 38, fogFar: 115,   // pushed back from 25/90
    skyTop: '#0E1530', skyMid: '#222D52', skyBottom: '#3A4878',
    sunAzimuth: -Math.PI / 2, sunElevation: 0.65,    // moon high overhead, was -0.5
    starOpacity: 1,
  },
  { // 05:00 pre-dawn — moon descending in west, faint warmth on horizon.
    hour: 5,
    sunIntensity: 0.6, sunColor: '#9CB4D6',          // bumped from 0.15
    ambientIntensity: 0.55, ambientColor: '#7A86A8', // bumped from 0.35/#5C6A88
    hemiSky: '#5266A0', hemiGround: '#34384F', hemiIntensity: 0.65,
    fogColor: '#5266A0', fogNear: 38, fogFar: 115,
    skyTop: '#1F2A50', skyMid: '#3D4A78', skyBottom: '#5A6B95',
    sunAzimuth: -0.4, sunElevation: 0.35,            // moon low in west, was -0.05
    starOpacity: 0.4,
  },
  { // 06:30 sunrise / golden hour — unchanged, this looked right.
    hour: 6.5,
    sunIntensity: 1.25, sunColor: '#FFB078',
    ambientIntensity: 0.55, ambientColor: '#FFE0C0',
    hemiSky: '#FFCDA8', hemiGround: '#9A7858', hemiIntensity: 0.7,
    fogColor: '#F4C8A0', fogNear: 35, fogFar: 105,
    skyTop: '#7A8AB8', skyMid: '#F4C088', skyBottom: '#FFD8A8',
    sunAzimuth: 0.1, sunElevation: 0.18,
    starOpacity: 0,
  },
  { // 09:00 morning
    hour: 9,
    sunIntensity: 1.4, sunColor: '#FFEDD8',
    ambientIntensity: 0.62, ambientColor: '#FFF5E8',
    hemiSky: '#C8DDF0', hemiGround: '#A89878', hemiIntensity: 0.7,
    fogColor: '#D8E5F0', fogNear: 50, fogFar: 130,
    skyTop: '#5C92C8', skyMid: '#A8CDE8', skyBottom: '#D8E8F4',
    sunAzimuth: 0.6, sunElevation: 0.7,
    starOpacity: 0,
  },
  { // 13:00 midday
    hour: 13,
    sunIntensity: 1.55, sunColor: '#FFFFFF',
    ambientIntensity: 0.65, ambientColor: '#FFFFFF',
    hemiSky: '#90B8E8', hemiGround: '#888878', hemiIntensity: 0.75,
    fogColor: '#C8DCEC', fogNear: 55, fogFar: 140,
    skyTop: '#3F7AC8', skyMid: '#7AAEDC', skyBottom: '#C8DCEC',
    sunAzimuth: Math.PI / 2, sunElevation: 1.05,
    starOpacity: 0,
  },
  { // 17:30 late afternoon
    hour: 17.5,
    sunIntensity: 1.4, sunColor: '#FFD2A0',
    ambientIntensity: 0.6, ambientColor: '#FFE8D0',
    hemiSky: '#F4D0B0', hemiGround: '#A07858', hemiIntensity: 0.7,
    fogColor: '#F2D0A8', fogNear: 45, fogFar: 115,
    skyTop: '#6A82B8', skyMid: '#E8B888', skyBottom: '#F4D098',
    sunAzimuth: Math.PI - 0.5, sunElevation: 0.45,
    starOpacity: 0,
  },
  { // 19:00 sunset / dusk — unchanged.
    hour: 19,
    sunIntensity: 0.9, sunColor: '#FF9468',
    ambientIntensity: 0.5, ambientColor: '#E0A890',
    hemiSky: '#F08858', hemiGround: '#604030', hemiIntensity: 0.6,
    fogColor: '#D08868', fogNear: 30, fogFar: 95,
    skyTop: '#3A4878', skyMid: '#C06850', skyBottom: '#F09060',
    sunAzimuth: Math.PI - 0.05, sunElevation: 0.05,
    starOpacity: 0.15,
  },
  { // 21:00 night settled — moon rising in east, takes over from sun.
    hour: 21,
    sunIntensity: 0.55, sunColor: '#A8BCDC',         // bumped from 0.1
    ambientIntensity: 0.55, ambientColor: '#5C6E94', // bumped from 0.3
    hemiSky: '#3D4D78', hemiGround: '#252E48', hemiIntensity: 0.65,  // bumped from 0.4
    fogColor: '#2F3D5E', fogNear: 36, fogFar: 110,   // pushed back from 25/90
    skyTop: '#0E1530', skyMid: '#222D52', skyBottom: '#384670',
    sunAzimuth: Math.PI + 0.5, sunElevation: 0.4,    // moon rising, was -0.3
    starOpacity: 0.85,
  },
  { // 24:00 = wraps back to 00:00 (same values as hour 0). Keep azimuth
    // continuous (-π/2 + 2π) so the interpolation between 21 and 24
    // doesn't reverse direction.
    hour: 24,
    sunIntensity: 0.55, sunColor: '#A8BCDC',
    ambientIntensity: 0.55, ambientColor: '#5C6E94',
    hemiSky: '#3A4A72', hemiGround: '#1F2540', hemiIntensity: 0.7,
    fogColor: '#2D3A5C', fogNear: 38, fogFar: 115,
    skyTop: '#0E1530', skyMid: '#222D52', skyBottom: '#3A4878',
    sunAzimuth: -Math.PI / 2 + 2 * Math.PI, sunElevation: 0.65,
    starOpacity: 1,
  },
];

// ── Helpers ────────────────────────────────────────────────────
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function lerpColor(a: THREE.Color, b: THREE.Color, t: number, out: THREE.Color) {
  out.setRGB(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

// Cache parsed colours so we don't allocate every frame.
const COLOR_CACHE = new Map<string, THREE.Color>();
function getColor(hex: string): THREE.Color {
  let c = COLOR_CACHE.get(hex);
  if (!c) {
    c = new THREE.Color(hex);
    COLOR_CACHE.set(hex, c);
  }
  return c;
}

/** Find the two keyframes the given hour falls between, plus the 0..1 mix factor. */
function frameLerp(hour: number) {
  // Clamp 0..24 just in case
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (h >= a.hour && h <= b.hour) {
      const t = (h - a.hour) / (b.hour - a.hour);
      return { a, b, t };
    }
  }
  // fallback (shouldn't happen because last keyframe is hour=24)
  return { a: KEYFRAMES[0], b: KEYFRAMES[1], t: 0 };
}

// Distance from the player — sun is placed on a 30m radius shell so
// shadows have something to cast from while still feeling "far away".
const SUN_DIST = 30;

export default function DayNightCycle({
  mode = 'real-hk',
  cycleMinutes = 8,
  fixedHour = 13,
  isMobile = false,
  starsEnabled = true,
}: DayNightCycleProps) {
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const sunRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const fogRef = useRef<THREE.Fog>(null);
  const skyMatRef = useRef<THREE.ShaderMaterial>(null);
  const starsMatRef = useRef<THREE.PointsMaterial>(null);

  // Reusable scratch colours — reused every frame so GC stays quiet.
  const tmp = useMemo(() => ({
    sunCol: new THREE.Color(),
    ambCol: new THREE.Color(),
    hemiSky: new THREE.Color(),
    hemiGround: new THREE.Color(),
    fogCol: new THREE.Color(),
    skyTop: new THREE.Color(),
    skyMid: new THREE.Color(),
    skyBot: new THREE.Color(),
  }), []);

  // Time-zero anchor for accelerated mode
  const acceleratedStartRef = useRef<number>(0);
  useEffect(() => {
    acceleratedStartRef.current = Date.now();
  }, []);

  // Generate a procedural starfield once. Spheres around the camera at
  // r=78 (just inside the sky dome at r=80).
  const starGeometry = useMemo(() => {
    const N = 600;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // Bias stars to upper hemisphere so the ground doesn't look
      // littered with them.
      const u = Math.random();
      const v = Math.random() * 0.55 + 0.45; // upper hemi only
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const r = 78;
      positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)); // always above horizon
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);

  useFrame(() => {
    // ── Resolve current hour (0..24) ──
    let hour = 13;
    if (mode === 'real-hk') {
      // HK = UTC+8. Use UTC then offset; avoids the user's local TZ.
      const now = new Date();
      const utcMin = now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60;
      hour = ((utcMin / 60) + 8) % 24;
    } else if (mode === 'accelerated') {
      const elapsed = (Date.now() - acceleratedStartRef.current) / 1000; // seconds
      const cycleSec = Math.max(60, cycleMinutes * 60);
      hour = ((elapsed / cycleSec) * 24) % 24;
    } else {
      hour = ((fixedHour % 24) + 24) % 24;
    }

    const { a, b, t } = frameLerp(hour);

    // Interpolate scalars
    const sunInt = lerp(a.sunIntensity, b.sunIntensity, t);
    const ambInt = lerp(a.ambientIntensity, b.ambientIntensity, t);
    const hemiInt = lerp(a.hemiIntensity, b.hemiIntensity, t);
    const fogN = lerp(a.fogNear, b.fogNear, t);
    const fogF = lerp(a.fogFar, b.fogFar, t);
    const az = lerp(a.sunAzimuth, b.sunAzimuth, t);
    const el = lerp(a.sunElevation, b.sunElevation, t);
    const starA = lerp(a.starOpacity, b.starOpacity, t);

    // Interpolate colours into reused scratches
    lerpColor(getColor(a.sunColor),    getColor(b.sunColor),    t, tmp.sunCol);
    lerpColor(getColor(a.ambientColor),getColor(b.ambientColor),t, tmp.ambCol);
    lerpColor(getColor(a.hemiSky),     getColor(b.hemiSky),     t, tmp.hemiSky);
    lerpColor(getColor(a.hemiGround),  getColor(b.hemiGround),  t, tmp.hemiGround);
    lerpColor(getColor(a.fogColor),    getColor(b.fogColor),    t, tmp.fogCol);
    lerpColor(getColor(a.skyTop),      getColor(b.skyTop),      t, tmp.skyTop);
    lerpColor(getColor(a.skyMid),      getColor(b.skyMid),      t, tmp.skyMid);
    lerpColor(getColor(a.skyBottom),   getColor(b.skyBottom),   t, tmp.skyBot);

    // Apply
    if (ambientRef.current) {
      ambientRef.current.intensity = ambInt;
      ambientRef.current.color.copy(tmp.ambCol);
    }
    if (sunRef.current) {
      sunRef.current.intensity = sunInt;
      sunRef.current.color.copy(tmp.sunCol);
      sunRef.current.position.set(
        Math.cos(az) * Math.cos(el) * SUN_DIST,
        Math.sin(el) * SUN_DIST,
        Math.sin(az) * Math.cos(el) * SUN_DIST,
      );
      // Sun below horizon → no shadows (saves work and avoids weird
      // upside-down shadow bias artefacts at night).
      sunRef.current.castShadow = el > 0.0;
    }
    if (hemiRef.current) {
      hemiRef.current.color.copy(tmp.hemiSky);
      hemiRef.current.groundColor.copy(tmp.hemiGround);
      hemiRef.current.intensity = hemiInt;
    }
    if (fogRef.current) {
      fogRef.current.color.copy(tmp.fogCol);
      fogRef.current.near = fogN;
      fogRef.current.far = fogF;
    }
    if (skyMatRef.current) {
      const u = skyMatRef.current.uniforms;
      u.topColor.value.copy(tmp.skyTop);
      u.midColor.value.copy(tmp.skyMid);
      u.bottomColor.value.copy(tmp.skyBot);
    }
    if (starsMatRef.current) {
      // Master toggle short-circuits the keyframed opacity. Cheaper than
      // conditionally mounting/unmounting the points node every time the
      // user flips the switch.
      starsMatRef.current.opacity = starsEnabled ? starA : 0;
    }
  });

  // Initial values come from a midday-ish keyframe so the first
  // rendered frame doesn't flash to a wrong colour before the
  // useFrame above runs.
  const k0 = KEYFRAMES[4]; // midday

  return (
    <>
      <ambientLight ref={ambientRef} intensity={k0.ambientIntensity} color={k0.ambientColor} />

      <directionalLight
        ref={sunRef}
        position={[20, 20, 8]}
        intensity={k0.sunIntensity}
        color={k0.sunColor}
        castShadow
        shadow-mapSize-width={isMobile ? 1024 : 2048}
        shadow-mapSize-height={isMobile ? 1024 : 2048}
        shadow-camera-far={120}
        shadow-camera-left={-50}
        shadow-camera-right={50}
        shadow-camera-top={50}
        shadow-camera-bottom={-50}
        shadow-bias={-0.0005}
      />

      <hemisphereLight
        ref={hemiRef}
        args={[k0.hemiSky, k0.hemiGround, k0.hemiIntensity]}
      />

      <fog ref={fogRef} attach="fog" args={[k0.fogColor, k0.fogNear, k0.fogFar]} />

      {/* Sky dome — same shader as the original (Environment3D) but
          its uniforms are now driven by the cycle. */}
      <mesh>
        <sphereGeometry args={[80, 32, 32]} />
        <shaderMaterial
          ref={skyMatRef}
          side={THREE.BackSide}
          fog={false}
          uniforms={{
            topColor: { value: new THREE.Color(k0.skyTop) },
            midColor: { value: new THREE.Color(k0.skyMid) },
            bottomColor: { value: new THREE.Color(k0.skyBottom) },
            offset: { value: 0 },
            exponent: { value: 0.7 },
          }}
          vertexShader={`
            varying vec3 vWorldPosition;
            void main() {
              vec4 worldPosition = modelMatrix * vec4(position, 1.0);
              vWorldPosition = worldPosition.xyz;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 topColor;
            uniform vec3 midColor;
            uniform vec3 bottomColor;
            uniform float offset;
            uniform float exponent;
            varying vec3 vWorldPosition;
            void main() {
              float h = normalize(vWorldPosition + offset).y;
              vec3 col;
              if (h < 0.15) {
                col = mix(bottomColor, midColor, smoothstep(0.0, 0.15, h));
              } else {
                col = mix(midColor, topColor, pow(smoothstep(0.15, 1.0, h), exponent));
              }
              gl_FragColor = vec4(col, 1.0);
            }
          `}
        />
      </mesh>

      {/* Stars — only visible at night via animated opacity. */}
      <points geometry={starGeometry}>
        <pointsMaterial
          ref={starsMatRef}
          size={0.45}
          color="#FFFFFF"
          transparent
          opacity={k0.starOpacity}
          fog={false}
          depthWrite={false}
          sizeAttenuation
        />
      </points>
    </>
  );
}
