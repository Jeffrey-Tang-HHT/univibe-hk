import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping as THREE_TONE_MAPPING } from 'three';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Home, HeartHandshake, Wrench, User, Globe, Moon, Sun,
  Send, Paintbrush, Users, MessageCircle, X, Box,
  BookOpen, TrendingUp, Sparkles, Calculator, Plus, Zap, Clock, Star, ChevronRight,
  Compass, Route,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { toast } from 'sonner';
import Environment3D from '@/components/plaza/Environment3D';
import PlayerController from '@/components/plaza/PlayerController';
import OtherPlayers from '@/components/plaza/OtherPlayers';
import MiniMap from '@/components/plaza/MiniMap';
import AvatarCustomizer from '@/components/plaza/AvatarCustomizer';
import VirtualJoystick from '@/components/plaza/VirtualJoystick';
import JourneyLog, { type JourneyEntry } from '@/components/plaza/JourneyLog';
import ZoneEntryToast from '@/components/plaza/ZoneEntryToast';
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

export default function Plaza() {
  const { user, isLoggedIn } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
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

  // Poll for other players and bubbles
  useEffect(() => {
    if (!isLoggedIn) return;

    const poll = async () => {
      try {
        const [playersData, bubblesData] = await Promise.all([
          getPlayers(),
          getBubbles(),
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
      leavePlaza().catch(() => {});
    };
  }, [isLoggedIn]);

  const handlePositionUpdate = useCallback((x: number, y: number, z: number, rotation: number, zone: string, isMoving: boolean) => {
    posRef.current = { x, y, z, rotation, zone, isMoving };
    setMyPosition({ x, z });
    setCurrentZone(zone);
    updatePosition({ x, y, z, rotation, zone, is_moving: isMoving }).catch(() => {});
  }, []);

  const handleSendBubble = async () => {
    if (!chatInput.trim()) return;
    try {
      await sendBubble(chatInput.trim(), posRef.current.x, posRef.current.y, posRef.current.z);
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
          // Golden-hour sky clear colour (warm peachy blue)
          gl.setClearColor('#E8C9A0');
          // Enable tone mapping for cinematic look
          gl.toneMapping = THREE_TONE_MAPPING;
          gl.toneMappingExposure = 1.05;
        }}
      >
        {/* Golden-hour ambient — warm peachy fill */}
        <ambientLight intensity={0.55} color="#FFE4C4" />

        {/* Low-angle warm sun — casts long shadows.
            Shadow map is 2048² on desktop, 1024² on mobile — cheap way to regain
            ~10 FPS on mid-range Android without hurting desktop quality. */}
        <directionalLight
          position={[22, 14, 8]}
          intensity={1.45}
          color="#FFB27A"
          castShadow
          shadow-mapSize-width={IS_MOBILE ? 1024 : 2048}
          shadow-mapSize-height={IS_MOBILE ? 1024 : 2048}
          shadow-camera-far={100}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
          shadow-bias={-0.0005}
        />

        {/* Cool sky fill from opposite side (rim light) */}
        <directionalLight
          position={[-18, 10, -6]}
          intensity={0.35}
          color="#B8D4E8"
        />

        {/* Hemisphere — pink/lavender sky top, warm earth bottom */}
        <hemisphereLight args={['#F4C4A8', '#8B7355', 0.65]} />

        {/* Rim fog — warm haze blends horizon */}
        <fog attach="fog" args={['#F2D0B0', 40, 110]} />

        <Suspense fallback={null}>
          <Environment3D lang={lang} currentZone={currentZone} />
          <PlayerController
            config={avatarConfig}
            onPositionUpdate={handlePositionUpdate}
            touchDirRef={touchDirRef}
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
          waypoints={journey.map(e => ({ zone: e.zone, sequenceNumber: e.sequenceNumber }))}
        />
        <div className="flex items-center gap-1.5">
          <div className="bg-black/40 backdrop-blur-xl rounded-xl px-2.5 py-1.5 border border-white/15 shadow-lg flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-white/80" />
            <span className="text-xs text-white font-semibold">{players.length}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 bg-black/40 backdrop-blur-xl border border-white/15 shadow-lg text-white/80 hover:text-white hover:bg-black/60"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            <Globe className="w-3.5 h-3.5" />
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
      <div
        className={`absolute left-4 z-40 top-[5.75rem] md:top-auto md:bottom-20 ${
          showZonePanel || showJourneyLog ? 'hidden md:block' : 'block'
        }`}
      >
        <motion.button
          onClick={() => setShowJourneyLog(true)}
          animate={zoneChangeFlash ? { scale: [1, 1.06, 1] } : { scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-[22px] p-[2px] shadow-2xl group"
          style={{
            background: `linear-gradient(135deg, ${activeZoneColor} 0%, #A78BFA 50%, #EC4899 100%)`,
            boxShadow: `0 10px 30px -8px ${activeZoneColor}66, 0 4px 12px rgba(0,0,0,0.25)`,
          }}
          aria-label={lang === 'zh' ? '開啟角色移動日誌' : 'Open character movement log'}
        >
          <div
            className="relative rounded-[20px] px-4 py-2.5 flex items-center gap-3 overflow-hidden"
            style={{
              background:
                'linear-gradient(180deg, rgba(30,30,40,0.92) 0%, rgba(20,20,30,0.95) 100%)',
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

            {/* Label */}
            <div className="flex flex-col items-start min-w-0 relative">
              <span
                className="text-[9px] uppercase tracking-[0.15em] font-bold leading-none"
                style={{ color: activeZoneColor }}
              >
                {lang === 'zh' ? 'HUD 詳細視角' : 'HUD Detailed Perspectives'}
              </span>
              <span className="text-sm font-bold text-white leading-tight truncate max-w-[160px] mt-1">
                {lang === 'zh' ? '角色移動日誌' : 'Character Movement Log'}
              </span>
              <span className="text-[10px] text-white/60 leading-tight truncate max-w-[160px] mt-0.5">
                {lang === 'zh' ? '目前:' : 'Now:'}{' '}
                <span style={{ color: activeZoneColor }} className="font-semibold">
                  {ZONE_LABELS[currentZone]?.[lang === 'zh' ? 'zh' : 'en'] || currentZone}
                </span>
              </span>
            </div>

            <ChevronRight className="w-4 h-4 text-white/70 transition-transform shrink-0 relative group-hover:translate-x-0.5" />
          </div>
        </motion.button>
      </div>

      {/* ─── Virtual Joystick ─── */}
      <div className="absolute bottom-24 right-4 z-50">
        <VirtualJoystick dirRef={touchDirRef} />
      </div>

      {/* ─── Movement instructions (desktop, auto-hides) ─── */}
      <AnimatePresence>
        {showControlsHint && !showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block"
          >
            <div className="bg-black/50 backdrop-blur-md rounded-full px-3.5 py-1.5 border border-white/15 shadow-lg flex items-center gap-2">
              <Compass className="w-3 h-3 text-white/80" />
              <p className="text-[11px] text-white/90 font-medium whitespace-nowrap">
                {lang === 'zh' ? '使用 WASD 或方向鍵移動' : 'Use WASD or Arrow Keys to move'}
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
          onClick={() => setShowCustomizer(!showCustomizer)}
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
            <div className="max-h-48 overflow-y-auto mb-3 space-y-2">
              {bubbles.slice(0, 10).map(b => (
                <div key={b.id} className="flex items-start gap-2">
                  <span className="text-xs font-medium text-neon-coral shrink-0">{b.display_name}</span>
                  <span className="text-xs text-foreground">{b.content}</span>
                </div>
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
