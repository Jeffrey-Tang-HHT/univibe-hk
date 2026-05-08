import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping as THREE_TONE_MAPPING } from 'three';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
// v9: per-icon imports trim the lucide barrel out of the Plaza chunk.
// Each line resolves to a single icon module via the `lucide-react/icons`
// Vite alias declared in vite.config.ts. ~80KB chunk savings vs. the
// previous `import { ... } from 'lucide-react'` block.
import Shield from 'lucide-react/icons/shield';
import Home from 'lucide-react/icons/home';
import HeartHandshake from 'lucide-react/icons/heart-handshake';
import Wrench from 'lucide-react/icons/wrench';
import User from 'lucide-react/icons/user';
import Globe from 'lucide-react/icons/globe';
import Moon from 'lucide-react/icons/moon';
import Sun from 'lucide-react/icons/sun';
import Send from 'lucide-react/icons/send';
import Paintbrush from 'lucide-react/icons/paintbrush';
import Users from 'lucide-react/icons/users';
import MessageCircle from 'lucide-react/icons/message-circle';
import X from 'lucide-react/icons/x';
import Box from 'lucide-react/icons/box';
import BookOpen from 'lucide-react/icons/book-open';
import TrendingUp from 'lucide-react/icons/trending-up';
import Sparkles from 'lucide-react/icons/sparkles';
import Calculator from 'lucide-react/icons/calculator';
import Plus from 'lucide-react/icons/plus';
import Zap from 'lucide-react/icons/zap';
import Clock from 'lucide-react/icons/clock';
import Star from 'lucide-react/icons/star';
import ChevronRight from 'lucide-react/icons/chevron-right';
import Compass from 'lucide-react/icons/compass';
import Route from 'lucide-react/icons/route';
import Volume2 from 'lucide-react/icons/volume-2';
import VolumeX from 'lucide-react/icons/volume-x';
import Sunrise from 'lucide-react/icons/sunrise';
import FastForward from 'lucide-react/icons/fast-forward';
// v10
import Cloud from 'lucide-react/icons/cloud';
import CloudRain from 'lucide-react/icons/cloud-rain';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { SceneProvider, useScene } from '@/contexts/SceneContext';
import { toast } from 'sonner';
import PlayerController from '@/components/plaza/PlayerController';
import OtherPlayers from '@/components/plaza/OtherPlayers';
import MiniMap from '@/components/plaza/MiniMap';
import AvatarCustomizer from '@/components/plaza/AvatarCustomizer';
import VirtualJoystick from '@/components/plaza/VirtualJoystick';
import JourneyLog, { type JourneyEntry } from '@/components/plaza/JourneyLog';
import ZoneEntryToast from '@/components/plaza/ZoneEntryToast';
import FPSMeter from '@/components/plaza/FPSMeter';
import SceneRouter from '@/components/plaza/SceneRouter';
import SceneTransition from '@/components/plaza/SceneTransition';
import AmbientSound from '@/components/plaza/AmbientSound';
import ZoneParticles from '@/components/plaza/ZoneParticles';
import { NPC_COUNT } from '@/components/plaza/NPCs';
// v6 additions
import DayNightCycle from '@/components/plaza/DayNightCycle';
import DayNightSettings, {
  DEFAULT_DAY_NIGHT_SETTINGS,
  type DayNightSettings as DayNightSettingsType,
} from '@/components/plaza/DayNightSettings';
import EmoteBar from '@/components/plaza/EmoteBar';
import type { EmoteName } from '@/components/plaza/Avatar3D';
// v10 additions
import Weather from '@/components/plaza/Weather';
import { resolveWeather, weatherSunMultiplier, type WeatherState } from '@/components/plaza/weather';
import SpectatorWelcome from '@/components/plaza/SpectatorWelcome';
import { translateText } from '@/lib/translate';

// Whether NPCs count toward the displayed "online students" number in the
// top-right HUD pill. Set to `false` to show only real, authenticated users
// (honest mode). Kept as a constant so it's a one-line flip when the user
// base is large enough that the seeding crutch isn't needed.
const COUNT_NPCS_AS_PLAYERS = true;
import {
  updatePosition, getPlayers, sendBubble, getBubbles, saveAvatar, leavePlaza,
  DEFAULT_AVATAR,
  type PlazaPlayer, type PlazaBubble, type AvatarConfig,
} from '@/lib/plaza';

// Rough "is mobile" check used once at module load for shadow-map sizing.
// Matches typical iOS/Android browsers without being cute about tablets.
const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// ─── Top-level export wraps everything in <SceneProvider>. The original
// component is now `PlazaInner` so it can call `useScene()`. ───
export default function Plaza() {
  return (
    <SceneProvider initial="plaza">
      <PlazaInner />
    </SceneProvider>
  );
}

function PlazaInner() {
  const { user, isLoggedIn } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { currentScene, muted, setMuted, spawnPointRef } = useScene();
  const [, setLocation] = useLocation();

  const [players, setPlayers] = useState<PlazaPlayer[]>([]);
  const [bubbles, setBubbles] = useState<PlazaBubble[]>([]);
  const [myPosition, setMyPosition] = useState({ x: 0, z: 5 });
  const [chatInput, setChatInput] = useState('');
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(() => {
    const saved = (user as any)?.avatar_config;
    return saved && Object.keys(saved).length > 0 ? { ...DEFAULT_AVATAR, ...saved } : DEFAULT_AVATAR;
  });
  const [currentZone, setCurrentZone] = useState('center');
  const [selectedPlayer, setSelectedPlayer] = useState<PlazaPlayer | null>(null);
  const [showWelcome, setShowWelcome] = useState(true);
  const [zoneChangeFlash, setZoneChangeFlash] = useState(false);
  const [showZonePanel, setShowZonePanel] = useState(false);
  // Journey log — session-only (clears on refresh)
  const [journey, setJourney] = useState<JourneyEntry[]>([]);
  const [showJourneyLog, setShowJourneyLog] = useState(false);
  const [toastZone, setToastZone] = useState<string | null>(null);
  const [toastSeq, setToastSeq] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const posRef = useRef({ x: 0, y: 0, z: 5, rotation: 0, zone: 'center', isMoving: false });
  const prevZoneRef = useRef('center');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const touchDirRef = useRef({ x: 0, z: 0 });

  // ── v3 additions ──
  // Shared ref for the live player position. Written by PlayerController every
  // frame, read by ZoneMarker (and any future proximity-reactive scene node).
  const playerPosRef = useRef({ x: 0, z: 5 });

  // Waypoint: click-to-travel destination. useRef so PlayerController can
  // mutate it on arrival without forcing a re-render of the whole Plaza tree.
  // The mirror state `waypointTarget` is used only to drive the MiniMap pin.
  const waypointRef = useRef<{ x: number; z: number } | null>(null);
  const [waypointTarget, setWaypointTarget] = useState<{ x: number; z: number } | null>(null);

  // Player rotation (radians) — mirrored from posRef so the MiniMap facing
  // arrow gets a live value without subscribing to a ref.
  const [myRotation, setMyRotation] = useState(0);

  // Movement-log HUD pill: expanded on zone change, auto-collapses after 3s.
  const [logPillExpanded, setLogPillExpanded] = useState(true);
  const pillCollapseTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Scene-switching teleport ──
  // PlayerController consumes this ref imperatively: when it's non-null it
  // warps the avatar to the given world position and clears the ref. We
  // write to it whenever `currentScene` changes so the player respawns at
  // the destination scene's spawn point.
  const teleportRef = useRef<[number, number, number] | null>(null);

  // ── v6: Emote ref ──
  // Written by EmoteBar when the user picks an emote. Read by
  // PlayerController every frame and forwarded into Avatar3D.
  const emoteRef = useRef<{ name: EmoteName; startMs: number } | null>(null);

  // ── v6: Camera zoom ref + pinch handling ──
  // 1.0 = default 3rd-person distance. Mobile pinch on the canvas
  // updates this; PlayerController multiplies the camera offset by it.
  const cameraZoomRef = useRef<number>(1);

  // ── v6: Day/night mode ──
  // Persisted across reloads via localStorage so the user's preferred
  // demo mode sticks. Default 'real-hk' = realistic clock-driven sun.
  //
  // v9: upgraded from a single mode string to a full settings object —
  // `cycleMinutes`, `fixedHour`, `starsEnabled` are now user-tunable via
  // the new <DayNightSettings> dialog. Backward-compat: the old
  // `plaza:dayNightMode` localStorage key (v6/v7/v8) is read once and
  // migrated into the new `plaza:dayNightSettings` key, so existing
  // users don't lose their preference on the upgrade.
  const [dayNightSettings, setDayNightSettings] = useState<DayNightSettingsType>(() => {
    if (typeof window === 'undefined') return DEFAULT_DAY_NIGHT_SETTINGS;
    try {
      const v9 = localStorage.getItem('plaza:dayNightSettings');
      if (v9) {
        const parsed = JSON.parse(v9);
        // Defensive shape check — anyone hand-editing localStorage shouldn't
        // be able to crash the app.
        if (parsed && typeof parsed === 'object') {
          return { ...DEFAULT_DAY_NIGHT_SETTINGS, ...parsed };
        }
      }
      // v6 → v9 migration
      const v6 = localStorage.getItem('plaza:dayNightMode');
      if (v6 === 'real-hk' || v6 === 'accelerated' || v6 === 'fixed') {
        return { ...DEFAULT_DAY_NIGHT_SETTINGS, mode: v6 };
      }
    } catch {
      // Corrupt JSON — fall through to default.
    }
    return DEFAULT_DAY_NIGHT_SETTINGS;
  });
  useEffect(() => {
    try {
      localStorage.setItem('plaza:dayNightSettings', JSON.stringify(dayNightSettings));
    } catch {
      /* localStorage may be disabled (private mode) — non-fatal */
    }
  }, [dayNightSettings]);

  const [showDayNightSettings, setShowDayNightSettings] = useState(false);

  // ── v10: Weather ──
  // Deterministic per-day weather, resolved on mount. Re-checked at the top
  // of every hour so a midnight visitor doesn't stay on yesterday's weather
  // forever. The resolver function reads localStorage for dev overrides
  // (`plaza:weatherOverride`) so QA can force a state without waiting for
  // the daily seed to roll.
  const [weather, setWeather] = useState<WeatherState>(() => resolveWeather());
  useEffect(() => {
    // Cheap hourly tick. Aligned to the next wall-clock hour so the change
    // visibly happens on the hour.
    const now = Date.now();
    const msToNextHour = 3_600_000 - (now % 3_600_000);
    const timeout = setTimeout(() => {
      setWeather(resolveWeather());
      const interval = setInterval(() => setWeather(resolveWeather()), 3_600_000);
      // Stash the interval id on the closure for cleanup.
      (timeout as any)._interval = interval;
    }, msToNextHour);
    return () => {
      clearTimeout(timeout);
      const interval = (timeout as any)._interval;
      if (interval) clearInterval(interval);
    };
  }, []);
  const weatherFogTint = weather.mode === 'rain' ? '#5C6470' : weather.mode === 'cloudy' ? '#8E96A2' : null;

  // ── v10: Auto-translate chat ──
  // Persisted preference: whether to auto-translate other players' chat
  // bubbles into the current UI language. Off by default so users opt in
  // (translation costs API calls). Survives reloads.
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('plaza:autoTranslate') === '1';
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('plaza:autoTranslate', autoTranslate ? '1' : '0');
    } catch { /* private mode */ }
  }, [autoTranslate]);

  useEffect(() => {
    // SceneContext exposes the canonical spawn for the *current* scene
    // (already adjusted for any per-trigger override). Just forward it.
    teleportRef.current = [
      spawnPointRef.current[0],
      spawnPointRef.current[1],
      spawnPointRef.current[2],
    ];
  }, [currentScene, spawnPointRef]);

  // Hide welcome overlay after 3.5s
  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  // Hide controls hint after 6s
  const [showControlsHint, setShowControlsHint] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowControlsHint(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Flash the zone pill + auto-open the action panel + log journey entry when entering a new zone
  useEffect(() => {
    if (prevZoneRef.current && prevZoneRef.current !== currentZone) {
      setZoneChangeFlash(true);
      setShowZonePanel(currentZone !== 'center');

      // Expand the movement-log pill on every zone change, then auto-collapse
      // after 3s so it doesn't sit at full width in the user's way.
      setLogPillExpanded(true);
      if (pillCollapseTimerRef.current) clearTimeout(pillCollapseTimerRef.current);
      pillCollapseTimerRef.current = setTimeout(() => setLogPillExpanded(false), 3000);

      // Log journey entry (session-only) and show toast
      setJourney((prev) => {
        const sequenceNumber = prev.length + 1;
        const newEntry: JourneyEntry = {
          id: `${Date.now()}-${currentZone}`,
          zone: currentZone,
          timestamp: Date.now(),
          sequenceNumber,
        };
        // Trigger toast (deferred so state-in-effect chain is clean)
        setTimeout(() => {
          setToastSeq(sequenceNumber);
          setToastZone(currentZone);
          if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
          toastTimerRef.current = setTimeout(() => setToastZone(null), 3500);
        }, 0);
        return [...prev, newEntry];
      });

      const t = setTimeout(() => setZoneChangeFlash(false), 1200);
      prevZoneRef.current = currentZone;
      return () => clearTimeout(t);
    }
    prevZoneRef.current = currentZone;
  }, [currentZone]);

  // Collapse pill after 3s on first mount too (so it doesn't sit at full width forever)
  useEffect(() => {
    pillCollapseTimerRef.current = setTimeout(() => setLogPillExpanded(false), 3000);
    return () => {
      if (pillCollapseTimerRef.current) clearTimeout(pillCollapseTimerRef.current);
    };
  }, []);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoggedIn) setLocation('/login');
  }, [isLoggedIn, setLocation]);

  // ── v6: Pinch-to-zoom (touch) + wheel zoom (desktop) ──
  // Updates cameraZoomRef.current. PlayerController consumes it every
  // frame to scale the third-person camera distance. We listen on the
  // window so taps anywhere outside the HUD zoom the camera; HUD
  // pieces with stopPropagation will still block when needed.
  useEffect(() => {
    let activePointers: Map<number, { x: number; y: number }> = new Map();
    let lastPinchDist = 0;
    const ZOOM_MIN = 0.55;
    const ZOOM_MAX = 2.4;

    const distOf = () => {
      const pts = Array.from(activePointers.values());
      if (pts.length < 2) return 0;
      const dx = pts[0].x - pts[1].x;
      const dy = pts[0].y - pts[1].y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 2) lastPinchDist = distOf();
    };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      if (!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 2) {
        const newDist = distOf();
        if (lastPinchDist > 0) {
          const ratio = lastPinchDist / newDist; // pinch in (smaller) → zoom out
          const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cameraZoomRef.current * ratio));
          cameraZoomRef.current = next;
        }
        lastPinchDist = newDist;
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) lastPinchDist = 0;
    };
    const onWheel = (e: WheelEvent) => {
      // Skip if event is over the chat input or other text controls
      const tgt = e.target as HTMLElement | null;
      if (tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA')) return;
      const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cameraZoomRef.current * factor));
      cameraZoomRef.current = next;
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Poll for other players and bubbles. Scene-scoped: players/bubbles in
  // other scenes don't appear in this client. We re-bind the interval when
  // `currentScene` changes so an entered interior immediately re-polls.
  useEffect(() => {
    if (!isLoggedIn) return;

    const poll = async () => {
      try {
        const [playersData, bubblesData] = await Promise.all([
          getPlayers(currentScene),
          getBubbles(currentScene),
        ]);
        setPlayers(playersData.players);
        setBubbles(bubblesData.bubbles);
      } catch (e) {
        // Silent fail on polling
      }
    };

    poll();
    pollRef.current = setInterval(poll, 2000);

    return () => {
      clearInterval(pollRef.current);
    };
  }, [isLoggedIn, currentScene]);

  // Best-effort cleanup on unmount only.
  useEffect(() => {
    return () => {
      leavePlaza().catch(() => {});
    };
  }, []);

  const handlePositionUpdate = useCallback((x: number, y: number, z: number, rotation: number, zone: string, isMoving: boolean) => {
    posRef.current = { x, y, z, rotation, zone, isMoving };
    setMyPosition({ x, z });
    setMyRotation(rotation);
    setCurrentZone(zone);
    updatePosition({
      x, y, z, rotation, zone, is_moving: isMoving, scene: currentScene,
      emote: emoteRef.current?.name ?? null,
      emote_start_ms: emoteRef.current?.startMs ?? 0,
    }).catch(() => {});
  }, [currentScene]);

  // Click-to-travel: MiniMap hands us a world-space target. We store it in
  // both the ref (so PlayerController can read/mutate it without renders)
  // and state (so the MiniMap pin updates reactively).
  const handleSetWaypoint = useCallback((worldX: number, worldZ: number) => {
    waypointRef.current = { x: worldX, z: worldZ };
    setWaypointTarget({ x: worldX, z: worldZ });
  }, []);

  // Controller signals arrival (or cancel) by calling this. Clears the
  // visible pin on the minimap.
  const handleWaypointReached = useCallback(() => {
    waypointRef.current = null;
    setWaypointTarget(null);
  }, []);

  const handleClearWaypoint = useCallback(() => {
    waypointRef.current = null;
    setWaypointTarget(null);
  }, []);

  const handleSendBubble = async () => {
    if (!chatInput.trim()) return;
    try {
      await sendBubble(chatInput.trim(), posRef.current.x, posRef.current.y, posRef.current.z, currentScene);
      setChatInput('');
      toast.success(lang === 'zh' ? '已發送' : 'Sent!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    }
  };

  const handleSaveAvatar = async () => {
    try {
      await saveAvatar(avatarConfig);
      setShowCustomizer(false);
      toast.success(lang === 'zh' ? '角色已儲存！' : 'Avatar saved!');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save');
    }
  };

  const ZONE_LABELS: Record<string, { zh: string; en: string }> = {
    center: { zh: '中央廣場', en: 'Central Plaza' },
    study: { zh: '自習區', en: 'Study Zone' },
    social: { zh: '社交區', en: 'Social Zone' },
    dating: { zh: '交友角', en: 'Dating Corner' },
    cafe: { zh: '咖啡廳', en: 'Café' },
  };

  const ZONE_COLORS: Record<string, string> = {
    center: '#4ECDC4',
    study: '#45B7D1',
    social: '#FF6B6B',
    dating: '#C4B5FD',
    cafe: '#FFA07A',
  };

  const ZONE_TAGLINES: Record<string, { zh: string; en: string }> = {
    center: { zh: '校園的心臟', en: 'The heart of campus' },
    study: { zh: '專注學習之處', en: 'A place to focus' },
    social: { zh: '認識新朋友', en: 'Meet new people' },
    dating: { zh: '浪漫的角落', en: 'A romantic corner' },
    cafe: { zh: '喝杯咖啡歇息', en: 'Grab a coffee' },
  };

  const activeZoneColor = ZONE_COLORS[currentZone] || '#4ECDC4';

  const ZONE_ACTIONS: Record<
    string,
    Array<{
      icon: typeof Clock;
      label: { zh: string; en: string };
      href?: string;
      comingSoon?: boolean;
    }>
  > = {
    study: [
      { icon: Clock, label: { zh: '專注計時器', en: 'Focus Timer' }, comingSoon: true },
      { icon: Users, label: { zh: '尋找學習夥伴', en: 'Find Study Buddy' }, href: '/feed' },
      { icon: BookOpen, label: { zh: '筆記交流', en: 'Notes Exchange' }, href: '/feed' },
    ],
    social: [
      { icon: Home, label: { zh: '動態消息', en: 'Feed' }, href: '/feed' },
      { icon: Plus, label: { zh: '發佈新貼', en: 'New Post' }, href: '/feed' },
      { icon: TrendingUp, label: { zh: '熱門話題', en: 'Trending' }, href: '/feed' },
    ],
    dating: [
      { icon: HeartHandshake, label: { zh: '進入交友', en: 'Enter Dating' }, href: '/dating' },
      { icon: Sparkles, label: { zh: '我的匹配', en: 'My Matches' }, href: '/dating' },
      { icon: Zap, label: { zh: 'Vibe 檢查', en: 'Vibe Check' }, href: '/dating' },
    ],
    cafe: [
      { icon: Wrench, label: { zh: '校園工具', en: 'Campus Tools' }, href: '/tools' },
      { icon: Calculator, label: { zh: 'GPA 計算', en: 'GPA Calculator' }, href: '/tools' },
      { icon: Star, label: { zh: '課程評價', en: 'Course Reviews' }, href: '/tools' },
    ],
  };

  const handleZoneAction = (action: { href?: string; comingSoon?: boolean }) => {
    if (action.href) {
      setLocation(action.href);
    } else if (action.comingSoon) {
      toast(lang === 'zh' ? '即將推出 ✨' : 'Coming soon ✨');
    }
  };

  if (!isLoggedIn) return null;

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      {/* ─── 3D Canvas ─── */}
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        camera={{ position: [0, 14, 19], fov: 55 }}
        className="absolute inset-0"
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          // Initial clear colour — dawn-ish so the very first frame
          // doesn't flash a wrong colour before DayNightCycle takes over.
          gl.setClearColor('#3D4A78');
          // Enable tone mapping for cinematic look
          gl.toneMapping = THREE_TONE_MAPPING;
          gl.toneMappingExposure = 1.05;
        }}
      >
        {/* v6: lighting + sky + fog are now driven by DayNightCycle.
            Replaces the static <ambientLight>/<directionalLight> x2/
            <hemisphereLight>/<fog> block + the sky dome that lived in
            Environment3D.
            v9: cycleMinutes / fixedHour / starsEnabled are all driven
            by user-facing settings via the <DayNightSettings> dialog.
            v10: sunMultiplier + fogTint react to today's weather. */}
        <DayNightCycle
          mode={dayNightSettings.mode}
          cycleMinutes={dayNightSettings.cycleMinutes}
          fixedHour={dayNightSettings.fixedHour}
          starsEnabled={dayNightSettings.starsEnabled}
          sunMultiplier={weatherSunMultiplier(weather)}
          fogTint={weatherFogTint}
          isMobile={IS_MOBILE}
        />

        {/* v10: rain particles + extra clouds. Self-noops when weather is clear. */}
        <Weather weather={weather} />

        <Suspense fallback={null}>
          <SceneRouter
            lang={lang}
            currentZone={currentZone}
            playerPosRef={playerPosRef}
            onSetWaypoint={handleSetWaypoint}
          />
          <ZoneParticles />
          <PlayerController
            config={avatarConfig}
            onPositionUpdate={handlePositionUpdate}
            touchDirRef={touchDirRef}
            waypointRef={waypointRef}
            onWaypointReached={handleWaypointReached}
            playerPosRef={playerPosRef}
            teleportRef={teleportRef}
            emoteRef={emoteRef}
            cameraZoomRef={cameraZoomRef}
          />
          <OtherPlayers
            players={players}
            bubbles={bubbles}
            onPlayerClick={setSelectedPlayer}
          />
        </Suspense>
      </Canvas>

      {/* ─── Top cinematic gradient banner (concept-art style) ─── */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 h-24 z-20 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />

      {/* ─── Zone transition color wash ───
          Subtle full-screen tint in the new zone's colour when crossing a
          boundary. Reuses `zoneChangeFlash` (already set in the zone-change
          effect) so it stays in sync with the HUD pill's pulse. */}
      <AnimatePresence>
        {zoneChangeFlash && (
          <motion.div
            key={`wash-${currentZone}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.22 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute inset-0 z-[25]"
            style={{
              background: `radial-gradient(ellipse at center, ${activeZoneColor} 0%, ${activeZoneColor}00 65%)`,
              mixBlendMode: 'screen',
            }}
          />
        )}
      </AnimatePresence>

      {/* ─── Dev-toggle FPS meter (Shift+F) ─── */}
      <FPSMeter />

      {/* ─── Scene transition fade overlay (interiors system) ─── */}
      <SceneTransition lang={lang} />

      {/* ─── Ambient sound (mounts an invisible audio crossfade) ─── */}
      <AmbientSound />

      {/* v10: First-time-visitor welcome card. Auto-opens AvatarCustomizer
          after 30s. Shows only when the authenticated user has no saved
          avatar AND the localStorage hasVisited flag is missing. The
          original welcome heading still shows for the first 3.5s; this
          slides in over the top once that fades. */}
      <SpectatorWelcome
        isFirstTime={!((user as any)?.avatar_config && Object.keys((user as any).avatar_config).length > 0)}
        onComplete={(open) => {
          if (open) setShowCustomizer(true);
        }}
      />

      {/* ─── Welcome overlay (fades after 3.5s) ─── */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.98 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-[28%] left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="text-center">
              <motion.h1
                initial={{ letterSpacing: '-0.02em' }}
                animate={{ letterSpacing: '0em' }}
                transition={{ duration: 0.9, delay: 0.1 }}
                className="font-display text-5xl sm:text-6xl font-bold text-white tracking-tight"
                style={{ textShadow: '0 4px 20px rgba(0,0,0,0.35)' }}
              >
                UniGo <span className="text-neon-coral">Plaza</span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-base sm:text-lg text-white/90 mt-3 font-medium"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.4)' }}
              >
                {lang === 'zh' ? '探索你的校園宇宙' : 'Explore your campus universe'}
              </motion.p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.7, delay: 0.5 }}
                className="mt-5 h-[2px] bg-gradient-to-r from-transparent via-neon-coral to-transparent w-48 mx-auto origin-left"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Top-Left: Title Banner (cinematic, concept-art inspired) ─── */}
      <div className="absolute top-4 left-4 z-40">
        <a
          href="/feed"
          className="group flex items-center gap-3 bg-black/40 backdrop-blur-xl rounded-2xl px-4 py-2.5 border border-white/15 shadow-2xl hover:bg-black/50 transition-all"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-neon-coral to-pink-500 flex items-center justify-center shadow-lg shrink-0">
            <Shield className="w-4.5 h-4.5 text-white" />
            <div className="absolute inset-0 rounded-xl ring-1 ring-white/30" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-base font-bold text-white leading-tight tracking-tight">
              UniGo <span className="text-neon-coral">Plaza</span>
            </h1>
            <p className="text-[10px] text-white/75 leading-tight mt-0.5 font-medium">
              {lang === 'zh'
                ? '結合數位元宇宙與校園自然環境'
                : 'Combining digital metaverse and natural campus'}
            </p>
          </div>
        </a>
      </div>

      {/* ─── Top-Right: MiniMap + controls ─── */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
        <MiniMap
          players={players}
          myPosition={myPosition}
          myRotation={myRotation}
          waypoints={journey.map(e => ({ zone: e.zone, sequenceNumber: e.sequenceNumber }))}
          waypointTarget={waypointTarget}
          onSetWaypoint={handleSetWaypoint}
          onClearWaypoint={handleClearWaypoint}
        />
        <div className="flex items-center gap-1.5">
          <div className="bg-black/40 backdrop-blur-xl rounded-xl px-2.5 py-1.5 border border-white/15 shadow-lg flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-white/80" />
            <span className="text-xs text-white font-semibold">
              {COUNT_NPCS_AS_PLAYERS ? players.length + NPC_COUNT : players.length}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 bg-black/40 backdrop-blur-xl border border-white/15 shadow-lg text-white/80 hover:text-white hover:bg-black/60"
            onClick={() => setMuted(!muted)}
            aria-label={muted ? (lang === 'zh' ? '取消靜音' : 'Unmute') : (lang === 'zh' ? '靜音' : 'Mute')}
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 bg-black/40 backdrop-blur-xl border border-white/15 shadow-lg text-white/80 hover:text-white hover:bg-black/60"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            <Globe className="w-3.5 h-3.5" />
          </Button>
          {/* v10: Weather pill — non-interactive indicator for today's HK
              weather. Hidden on clear days to avoid HUD clutter. Clicking
              cycles a help-style toast since we don't expose user weather
              control (the seed is shared across all players). */}
          {weather.mode !== 'clear' && (
            <button
              type="button"
              className="h-8 px-2 rounded-md bg-black/40 backdrop-blur-xl border border-white/15 shadow-lg text-white/80 hover:text-white hover:bg-black/60 text-xs font-medium flex items-center gap-1.5"
              title={
                weather.mode === 'rain'
                  ? (lang === 'zh' ? '今日香港落雨' : 'Rainy in HK today')
                  : (lang === 'zh' ? '今日香港多雲' : 'Cloudy in HK today')
              }
              onClick={() => toast(
                weather.mode === 'rain'
                  ? (lang === 'zh' ? '今日香港落雨 ☔️' : 'Rainy in HK today ☔️')
                  : (lang === 'zh' ? '今日香港多雲 ☁️' : 'Cloudy in HK today ☁️'),
              )}
            >
              {weather.mode === 'rain'
                ? <CloudRain className="w-3.5 h-3.5" />
                : <Cloud className="w-3.5 h-3.5" />}
            </button>
          )}
          {/* v9: Day/night settings opener — replaces v6's three-state cycler.
              Icon reflects current mode; tap opens the full settings panel. */}
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 bg-black/40 backdrop-blur-xl border border-white/15 shadow-lg text-white/80 hover:text-white hover:bg-black/60"
            onClick={() => {
              setShowDayNightSettings((s) => !s);
              // Same slot as AvatarCustomizer — close that one if it's open.
              if (!showDayNightSettings) setShowCustomizer(false);
            }}
            title={
              dayNightSettings.mode === 'real-hk'
                ? (lang === 'zh' ? '日夜設定 — 即時香港時間' : 'Day/Night settings — Live HK time')
                : dayNightSettings.mode === 'accelerated'
                  ? (lang === 'zh' ? `日夜設定 — 加速 (${dayNightSettings.cycleMinutes} 分鐘)` : `Day/Night settings — Accelerated (${dayNightSettings.cycleMinutes} min)`)
                  : (lang === 'zh' ? '日夜設定 — 固定時間' : 'Day/Night settings — Fixed hour')
            }
            aria-label={lang === 'zh' ? '日夜設定' : 'Day/Night settings'}
          >
            {dayNightSettings.mode === 'real-hk' && <Clock className="w-3.5 h-3.5" />}
            {dayNightSettings.mode === 'accelerated' && <FastForward className="w-3.5 h-3.5" />}
            {dayNightSettings.mode === 'fixed' && <Sunrise className="w-3.5 h-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 bg-black/40 backdrop-blur-xl border border-white/15 shadow-lg text-white/80 hover:text-white hover:bg-black/60"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* ─── HUD Pill: Character Movement Log (concept-art style) ─── */}
      {/* Collapses to icon-only after 3s. Expands on zone change or on tap. */}
      <div
        className={`absolute left-4 z-40 top-[5.75rem] md:top-auto md:bottom-20 ${
          showZonePanel || showJourneyLog ? 'hidden md:block' : 'block'
        }`}
      >
        <motion.button
          onClick={() => {
            if (logPillExpanded) {
              setShowJourneyLog(true);
            } else {
              // First tap expands — then a second tap opens the log.
              setLogPillExpanded(true);
              if (pillCollapseTimerRef.current) clearTimeout(pillCollapseTimerRef.current);
              pillCollapseTimerRef.current = setTimeout(() => setLogPillExpanded(false), 3000);
            }
          }}
          animate={zoneChangeFlash ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-[22px] p-[2px] shadow-2xl group"
          style={{
            background: `linear-gradient(135deg, ${activeZoneColor} 0%, #A78BFA 50%, #EC4899 100%)`,
            boxShadow: `0 10px 30px -8px ${activeZoneColor}66, 0 4px 12px rgba(0,0,0,0.25)`,
          }}
          aria-label={lang === 'zh' ? '開啟角色移動日誌' : 'Open character movement log'}
        >
          <motion.div
            layout
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative rounded-[20px] flex items-center gap-3 overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, rgba(30,30,40,0.92) 0%, rgba(20,20,30,0.95) 100%)',
              padding: logPillExpanded ? '10px 16px' : '6px',
            }}
          >
            {/* Glossy highlight */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-1/2 rounded-t-[20px] opacity-60"
              style={{
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 100%)',
              }}
            />

            {/* Person silhouette icon (concept-art style) */}
            <div className="relative shrink-0">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shadow-inner ring-2 ring-white/10"
                style={{
                  background: `linear-gradient(135deg, ${activeZoneColor}, #EC4899)`,
                }}
              >
                <User className="w-5 h-5 text-white" strokeWidth={2.2} />
              </div>
              {/* Sequence count badge */}
              {journey.length > 0 && (
                <div
                  className="absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-neon-coral text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-slate-900"
                >
                  {journey.length > 99 ? '99+' : journey.length}
                </div>
              )}
            </div>

            {/* Label — hidden when collapsed. AnimatePresence does the fade. */}
            <AnimatePresence initial={false}>
              {logPillExpanded && (
                <motion.div
                  key="pill-label"
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.22 }}
                  className="flex flex-col items-start min-w-0 relative overflow-hidden"
                >
                  <span
                    className="text-[9px] uppercase tracking-[0.15em] font-bold leading-none whitespace-nowrap"
                    style={{ color: activeZoneColor }}
                  >
                    {lang === 'zh' ? 'HUD 詳細視角' : 'HUD Detailed Perspectives'}
                  </span>
                  <span className="text-sm font-bold text-white leading-tight truncate max-w-[160px] mt-1 whitespace-nowrap">
                    {lang === 'zh' ? '角色移動日誌' : 'Character Movement Log'}
                  </span>
                  <span className="text-[10px] text-white/60 leading-tight truncate max-w-[160px] mt-0.5 whitespace-nowrap">
                    {lang === 'zh' ? '目前:' : 'Now:'}{' '}
                    <span style={{ color: activeZoneColor }} className="font-semibold">
                      {ZONE_LABELS[currentZone]?.[lang === 'zh' ? 'zh' : 'en'] || currentZone}
                    </span>
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {logPillExpanded && (
              <ChevronRight className="w-4 h-4 text-white/70 transition-transform shrink-0 relative group-hover:translate-x-0.5" />
            )}
          </motion.div>
        </motion.button>
      </div>

      {/* ─── Virtual Joystick + Emote Bar (v6) ─── */}
      <div className="absolute bottom-24 right-4 z-50 flex flex-col items-end gap-3">
        <EmoteBar emoteRef={emoteRef} lang={lang} />
        <VirtualJoystick
          dirRef={touchDirRef}
          onLongPress={() => {
            // Long-press = wave. Skip if another emote is already playing
            // so we don't yank the user out of, e.g., a sit. Same logic as
            // EmoteBar.trigger so behaviour is consistent across sources.
            const cur = emoteRef.current;
            if (cur && cur.name === 'wave') return;
            emoteRef.current = { name: 'wave', startMs: Date.now() };
          }}
        />
      </div>

      {/* ─── Movement instructions (auto-hides) ─── */}
      <AnimatePresence>
        {showControlsHint && !showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          >
            <div className="bg-black/50 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/15 shadow-lg flex items-center gap-2">
              <Compass className="w-3 h-3 text-white/80" />
              <p className="text-[11px] text-white/90 font-medium whitespace-nowrap">
                {/* Show keyboard hint on desktop, touch hint on mobile */}
                <span className="hidden md:inline">
                  {lang === 'zh' ? 'WASD 移動 · 點擊地面前往 · 滾輪縮放' : 'WASD to move · Click ground to walk · Scroll to zoom'}
                </span>
                <span className="md:hidden">
                  {lang === 'zh' ? '搖桿移動 · 雙擊地面前往 · 兩指縮放' : 'Joystick to move · Double-tap to walk · Pinch to zoom'}
                </span>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Zone Action Panel ─── */}
      <AnimatePresence>
        {showZonePanel && currentZone !== 'center' && ZONE_ACTIONS[currentZone] && (
          <motion.div
            initial={{ opacity: 0, x: -80, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-4 top-[5.75rem] z-40 w-64 max-w-[calc(100vw-2rem)]"
          >
            <div
              className="rounded-2xl overflow-hidden shadow-2xl p-[1.5px]"
              style={{
                background: `linear-gradient(135deg, ${activeZoneColor}, #EC4899)`,
              }}
            >
              <div className="bg-card/95 backdrop-blur-xl rounded-[14px] overflow-hidden">
                {/* Header */}
                <div
                  className="px-4 py-3 border-b flex items-start justify-between gap-2"
                  style={{
                    borderColor: `${activeZoneColor}22`,
                    background: `linear-gradient(135deg, ${activeZoneColor}1f, ${activeZoneColor}08)`,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                        style={{ backgroundColor: activeZoneColor }}
                      />
                      <h3 className="text-sm font-bold text-foreground leading-tight truncate">
                        {ZONE_LABELS[currentZone]?.[lang === 'zh' ? 'zh' : 'en']}
                      </h3>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                      {ZONE_TAGLINES[currentZone]?.[lang === 'zh' ? 'zh' : 'en']}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowZonePanel(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors -mt-0.5 p-1 rounded-lg hover:bg-muted/50 shrink-0"
                    aria-label="Close panel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Actions */}
                <div className="p-1.5 space-y-0.5">
                  {ZONE_ACTIONS[currentZone].map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
                        onClick={() => handleZoneAction(action)}
                        className="group w-full flex items-center gap-3 px-2.5 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${activeZoneColor}1f` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: activeZoneColor }} />
                        </div>
                        <span className="text-sm text-foreground font-medium flex-1 leading-tight">
                          {action.label[lang === 'zh' ? 'zh' : 'en']}
                        </span>
                        {action.comingSoon && (
                          <span className="text-[9px] text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider">
                            {lang === 'zh' ? '即將' : 'Soon'}
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Right-side Action Buttons (vertical cluster) ─── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <button
          onClick={() => {
            setShowCustomizer(!showCustomizer);
            // Top-right has only one slot — don't let both dialogs stack.
            if (!showCustomizer) setShowDayNightSettings(false);
          }}
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg border transition-all group ${
            showCustomizer
              ? 'bg-neon-coral text-white border-neon-coral scale-105'
              : 'bg-black/40 backdrop-blur-xl text-white/80 border-white/15 hover:text-white hover:bg-black/60'
          }`}
          title={lang === 'zh' ? '自訂角色' : 'Customize Avatar'}
        >
          <Paintbrush className="w-4 h-4" />
          {showCustomizer && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-white shadow-sm" />
          )}
        </button>
        <button
          onClick={() => setShowChat(!showChat)}
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg border transition-all ${
            showChat
              ? 'bg-neon-coral text-white border-neon-coral scale-105'
              : 'bg-black/40 backdrop-blur-xl text-white/80 border-white/15 hover:text-white hover:bg-black/60'
          }`}
          title={lang === 'zh' ? '聊天' : 'Chat'}
        >
          <MessageCircle className="w-4 h-4" />
          {bubbles.length > 0 && !showChat && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-neon-coral text-white text-[9px] font-bold flex items-center justify-center px-1 ring-2 ring-background">
              {bubbles.length > 9 ? '9+' : bubbles.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── Avatar Customizer Panel ─── */}
      {showCustomizer && (
        <AvatarCustomizer
          config={avatarConfig}
          onChange={setAvatarConfig}
          onSave={handleSaveAvatar}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {/* v9: Day/night settings dialog. Sits in the same top-right slot as
          AvatarCustomizer; both can't be open at once because they'd overlap. */}
      {showDayNightSettings && !showCustomizer && (
        <DayNightSettings
          settings={dayNightSettings}
          onChange={setDayNightSettings}
          onClose={() => setShowDayNightSettings(false)}
        />
      )}

      {/* ─── Chat Input ─── */}
      {showChat && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.25 }}
          className="absolute bottom-24 lg:bottom-20 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md"
        >
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-3">
            {/* v10: Auto-translate toggle. Persisted to localStorage so the
                preference survives reloads. When on, every chat bubble is
                run through /api/translate (the helper short-circuits if
                source matches target so it's cheap). */}
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                {lang === 'zh' ? '聊天' : 'Chat'}
              </span>
              <button
                type="button"
                onClick={() => setAutoTranslate((v) => !v)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  autoTranslate
                    ? 'bg-neon-coral/15 border-neon-coral/40 text-neon-coral'
                    : 'bg-muted/40 border-border text-muted-foreground hover:text-foreground'
                }`}
                aria-pressed={autoTranslate}
                title={
                  lang === 'zh'
                    ? (autoTranslate ? '關閉自動翻譯' : '開啟自動翻譯')
                    : (autoTranslate ? 'Auto-translate: on' : 'Auto-translate: off')
                }
              >
                {lang === 'zh' ? '自動翻譯' : 'Translate'} {autoTranslate ? '✓' : ''}
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto mb-3 space-y-2">
              {bubbles.slice(0, 10).map(b => (
                <ChatBubbleLine
                  key={b.id}
                  displayName={b.display_name}
                  content={b.content}
                  autoTranslate={autoTranslate}
                  targetLang={lang as 'zh' | 'en'}
                />
              ))}
              {bubbles.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  {lang === 'zh' ? '暫時沒有訊息... 說些什麼吧！' : 'No messages yet... Say something!'}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSendBubble()}
                placeholder={lang === 'zh' ? '說些什麼...' : 'Say something...'}
                maxLength={200}
                className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground border border-border/50 focus:outline-none focus:border-neon-coral/50"
              />
              <Button
                size="sm"
                className="bg-neon-coral hover:bg-neon-coral/90 text-white px-3"
                onClick={handleSendBubble}
                disabled={!chatInput.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Selected Player Info ─── */}
      {selectedPlayer && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-4 w-64"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-foreground">{selectedPlayer.display_name}</h3>
            <button onClick={() => setSelectedPlayer(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          {selectedPlayer.school && (
            <p className="text-xs text-muted-foreground mb-1">{selectedPlayer.school}</p>
          )}
          {selectedPlayer.mbti && (
            <span className="inline-block text-[10px] bg-neon-coral/10 text-neon-coral px-2 py-0.5 rounded-full font-medium">
              {selectedPlayer.mbti}
            </span>
          )}
          <p className="text-[10px] text-muted-foreground mt-2">
            {lang === 'zh' ? '位置' : 'Zone'}: {ZONE_LABELS[selectedPlayer.zone]?.[lang === 'zh' ? 'zh' : 'en'] || selectedPlayer.zone}
          </p>
        </motion.div>
      )}

      {/* ─── Zone Entry Toast (auto-popup on zone change) ─── */}
      <ZoneEntryToast zone={toastZone} sequenceNumber={toastSeq} lang={lang} />

      {/* ─── Journey Log Modal Panel ─── */}
      <JourneyLog
        entries={journey}
        lang={lang}
        isOpen={showJourneyLog}
        onClose={() => setShowJourneyLog(false)}
        onClear={() => {
          setJourney([]);
          setShowJourneyLog(false);
          toast(lang === 'zh' ? '日誌已清除' : 'Log cleared');
        }}
      />

      {/* ─── Path chip — concept-art "Path: Start → Destination (status)" ─── */}
      <AnimatePresence>
        {journey.length > 0 && !showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4 }}
            className="absolute bottom-20 lg:bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden sm:block"
          >
            <div
              className="rounded-full p-[1.5px] shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${activeZoneColor}, #A78BFA, #EC4899)`,
              }}
            >
              <div
                className="rounded-full px-4 py-1.5 flex items-center gap-2"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(20,22,30,0.92) 0%, rgba(15,17,25,0.96) 100%)',
                }}
              >
                <Route className="w-3 h-3 text-white/70 shrink-0" />
                <div className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                  <span className="text-white/60 font-semibold uppercase tracking-wider text-[9px]">
                    {lang === 'zh' ? '路徑' : 'Path'}:
                  </span>
                  <span className="text-white font-medium">
                    {(() => {
                      const first = journey[0];
                      const last = journey[journey.length - 1];
                      const firstLabel =
                        ZONE_LABELS[first.zone]?.[lang === 'zh' ? 'zh' : 'en'] || first.zone;
                      const lastLabel =
                        ZONE_LABELS[last.zone]?.[lang === 'zh' ? 'zh' : 'en'] || last.zone;
                      if (journey.length === 1) return firstLabel;
                      return `${firstLabel} → ${lastLabel}`;
                    })()}
                  </span>
                  <span
                    className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
                    style={{
                      backgroundColor: `${activeZoneColor}25`,
                      color: activeZoneColor,
                    }}
                  >
                    {currentZone === 'center' && journey.length > 1
                      ? lang === 'zh'
                        ? '進行中'
                        : 'Active'
                      : lang === 'zh'
                      ? '已完成'
                      : 'Complete'}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bottom Navigation (glass + active-glow) ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-foreground transition-colors">
            <Home className="w-5 h-5" /><span className="text-[10px]">{t('feed.nav.feed')}</span>
          </a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-foreground transition-colors">
            <HeartHandshake className="w-5 h-5" /><span className="text-[10px]">{t('feed.nav.dating')}</span>
          </a>
          <a href="/plaza" className="relative flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral">
            <div className="relative">
              <Box className="w-5 h-5" />
              <span className="absolute inset-0 rounded-full bg-neon-coral/20 blur-md -z-10" />
            </div>
            <span className="text-[10px] font-semibold">{lang === 'zh' ? '廣場' : 'Plaza'}</span>
            <span className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-neon-coral" />
          </a>
          <a href="/tools" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-foreground transition-colors">
            <Wrench className="w-5 h-5" /><span className="text-[10px]">{t('feed.nav.tools')}</span>
          </a>
          <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground hover:text-foreground transition-colors">
            <User className="w-5 h-5" /><span className="text-[10px]">{t('feed.nav.profile')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── v10: ChatBubbleLine ───
// Small subcomponent so each bubble owns its own translation state and
// fires the API call independently. We could use a parent-level Map keyed
// on bubble.id, but per-bubble useEffect is simpler and the translation
// helper has its own session cache so we don't double-fetch.
//
// Behaviour:
//   - autoTranslate off → render `content` as-is.
//   - autoTranslate on → kick off translateText() once, swap to the
//     translated string when it resolves. Show a tiny ↻ marker while
//     pending so the user knows something's loading.
function ChatBubbleLine({
  displayName,
  content,
  autoTranslate,
  targetLang,
}: {
  displayName: string;
  content: string;
  autoTranslate: boolean;
  targetLang: 'zh' | 'en';
}) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!autoTranslate) {
      setTranslated(null);
      setPending(false);
      return;
    }
    let cancelled = false;
    setPending(true);
    translateText(content, targetLang).then((t) => {
      if (cancelled) return;
      // If translation equals original (skipped path), show original — no
      // visual shimmer for content already in the user's language.
      setTranslated(t === content ? null : t);
      setPending(false);
    });
    return () => { cancelled = true; };
  }, [content, autoTranslate, targetLang]);

  const display = translated ?? content;
  return (
    <div className="flex items-start gap-2">
      <span className="text-xs font-medium text-neon-coral shrink-0">{displayName}</span>
      <span className="text-xs text-foreground">
        {display}
        {pending && translated == null && (
          <span className="ml-1 text-[10px] text-muted-foreground/70">↻</span>
        )}
        {translated != null && (
          <span
            className="ml-1 text-[9px] text-muted-foreground/70 align-middle"
            title={`Original: ${content}`}
          >
            (✦)
          </span>
        )}
      </span>
    </div>
  );
}
