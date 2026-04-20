import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Home, HeartHandshake, Wrench, User, Globe, Moon, Sun,
  LogOut, Send, Paintbrush, MapPin, Users, MessageCircle, X, Box,
  BookOpen, TrendingUp, Sparkles, Calculator, Plus, Zap, Clock, Star, ChevronRight,
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
import {
  updatePosition, getPlayers, sendBubble, getBubbles, saveAvatar, leavePlaza,
  DEFAULT_AVATAR,
  type PlazaPlayer, type PlazaBubble, type AvatarConfig,
} from '@/lib/plaza';

export default function Plaza() {
  const { user, isLoggedIn, logout } = useAuth();
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
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const posRef = useRef({ x: 0, y: 0, z: 5, rotation: 0, zone: 'center', isMoving: false });
  const prevZoneRef = useRef('center');
  // Touch-joystick direction shared with PlayerController (analog, -1…1 on each axis)
  const touchDirRef = useRef({ x: 0, z: 0 });

  // Hide welcome overlay after 3.5s
  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 3500);
    return () => clearTimeout(timer);
  }, []);

  // Hide WASD instruction after 6s
  const [showControlsHint, setShowControlsHint] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowControlsHint(false), 6000);
    return () => clearTimeout(timer);
  }, []);

  // Flash the zone pill + auto-open the action panel when entering a new zone
  useEffect(() => {
    if (prevZoneRef.current && prevZoneRef.current !== currentZone) {
      setZoneChangeFlash(true);
      // Auto-open action panel on zone entry (close on returning to center)
      setShowZonePanel(currentZone !== 'center');
      const t = setTimeout(() => setZoneChangeFlash(false), 1200);
      prevZoneRef.current = currentZone;
      return () => clearTimeout(t);
    }
    prevZoneRef.current = currentZone;
  }, [currentZone]);

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

  // Position update handler
  const handlePositionUpdate = useCallback((x: number, y: number, z: number, rotation: number, zone: string, isMoving: boolean) => {
    posRef.current = { x, y, z, rotation, zone, isMoving };
    setMyPosition({ x, z });
    setCurrentZone(zone);

    // Throttled API update
    updatePosition({ x, y, z, rotation, zone, is_moving: isMoving }).catch(() => {});
  }, []);

  // Send chat bubble
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

  // Save avatar
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

  // Zone-specific actions: navigate to existing app pages or toast placeholders
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
          gl.setClearColor('#87CEEB');
        }}
      >
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[15, 25, 10]}
          intensity={1.15}
          color="#FFF4E0"
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={100}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <hemisphereLight args={['#B5D9EC', '#7CB342', 0.5]} />

        <Suspense fallback={null}>
          <Environment3D lang={lang} />
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

      {/* ─── Top-Left: Title Card ─── */}
      <div className="absolute top-4 left-4 z-40">
        <a
          href="/feed"
          className="flex items-center gap-3 bg-card/90 backdrop-blur-xl rounded-2xl px-3.5 py-2.5 border border-border/50 shadow-xl hover:bg-card transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neon-coral to-pink-500 flex items-center justify-center shadow-md shrink-0">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-sm font-bold text-foreground leading-tight tracking-tight">
              UniGo <span className="text-neon-coral">Plaza</span>
            </h1>
            <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
              {lang === 'zh' ? '你的校園宇宙' : 'Your campus universe'}
            </p>
          </div>
        </a>
      </div>

      {/* ─── Top-Right: MiniMap + controls cluster ─── */}
      <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-2">
        <MiniMap players={players} myPosition={myPosition} />
        <div className="flex items-center gap-1.5">
          <div className="bg-card/90 backdrop-blur-xl rounded-xl px-2 py-1.5 border border-border/50 shadow-lg flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-foreground font-medium">{players.length}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 bg-card/90 backdrop-blur-xl border border-border/50 shadow-lg text-muted-foreground"
            onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          >
            <Globe className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 bg-card/90 backdrop-blur-xl border border-border/50 shadow-lg text-muted-foreground"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* ─── Zone HUD Pill with avatar (bottom-left on desktop, top-left on mobile) ─── */}
      <div
        className={`absolute left-4 z-40 top-[5.25rem] md:top-auto md:bottom-20 ${
          showZonePanel ? 'hidden md:block' : 'block'
        }`}
      >
        <motion.button
          onClick={() => currentZone !== 'center' && setShowZonePanel((p) => !p)}
          disabled={currentZone === 'center'}
          animate={zoneChangeFlash ? { scale: [1, 1.04, 1] } : { scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-2xl p-[1.5px] shadow-2xl disabled:cursor-default"
          style={{
            background: `linear-gradient(135deg, ${activeZoneColor}, #EC4899, #A78BFA)`,
          }}
          aria-label={currentZone !== 'center' ? 'Toggle zone actions' : undefined}
        >
          <div className="bg-card/95 backdrop-blur-xl rounded-[14px] px-3.5 py-2 flex items-center gap-3">
            {/* Avatar circle */}
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-inner"
              style={{
                background: `linear-gradient(135deg, ${activeZoneColor}, #EC4899)`,
              }}
            >
              {((user as any)?.display_name || (user as any)?.handle || 'U')
                .charAt(0)
                .toUpperCase()}
            </div>
            {/* Zone info */}
            <div className="flex flex-col items-start min-w-0">
              <span className="text-[9px] text-muted-foreground uppercase tracking-[0.12em] font-semibold leading-none">
                {lang === 'zh' ? '區域' : 'Zone'}
              </span>
              <span className="text-sm font-bold text-foreground leading-tight truncate max-w-[140px]">
                {ZONE_LABELS[currentZone]?.[lang === 'zh' ? 'zh' : 'en'] || currentZone}
              </span>
            </div>
            {currentZone !== 'center' && (
              <ChevronRight
                className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                  showZonePanel ? 'rotate-90' : ''
                }`}
              />
            )}
          </div>
        </motion.button>
      </div>

      {/* ─── Virtual Joystick (bottom-right, works on touch + mouse + stylus) ─── */}
      <div className="absolute bottom-24 right-4 z-50">
        <VirtualJoystick dirRef={touchDirRef} />
      </div>

      {/* ─── Movement instructions (desktop only, auto-hides after 6s) ─── */}
      <AnimatePresence>
        {showControlsHint && !showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none hidden md:block"
          >
            <div className="bg-card/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-border/30 shadow-sm">
              <p className="text-[10px] text-muted-foreground text-center whitespace-nowrap">
                {lang === 'zh' ? '使用 WASD 或方向鍵移動' : 'Use WASD or Arrow Keys to move'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Zone Action Panel (slides in from left, under title card) ─── */}
      <AnimatePresence>
        {showZonePanel && currentZone !== 'center' && ZONE_ACTIONS[currentZone] && (
          <motion.div
            initial={{ opacity: 0, x: -80, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -80, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-4 top-[5.5rem] z-40 w-64 max-w-[calc(100vw-2rem)]"
          >
            <div
              className="bg-card/95 backdrop-blur-xl rounded-2xl border shadow-2xl overflow-hidden"
              style={{ borderColor: `${activeZoneColor}55` }}
            >
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
                      className="w-2 h-2 rounded-full shrink-0"
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Action buttons (right side) ─── */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-2">
        <button
          onClick={() => setShowCustomizer(!showCustomizer)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border transition-all ${
            showCustomizer
              ? 'bg-neon-coral text-white border-neon-coral'
              : 'bg-card/80 backdrop-blur-sm text-muted-foreground border-border/50 hover:text-foreground'
          }`}
          title={lang === 'zh' ? '自訂角色' : 'Customize Avatar'}
        >
          <Paintbrush className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowChat(!showChat)}
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg border transition-all ${
            showChat
              ? 'bg-neon-coral text-white border-neon-coral'
              : 'bg-card/80 backdrop-blur-sm text-muted-foreground border-border/50 hover:text-foreground'
          }`}
          title={lang === 'zh' ? '聊天' : 'Chat'}
        >
          <MessageCircle className="w-4 h-4" />
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
        <div className="absolute bottom-24 lg:bottom-20 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-md">
          <div className="bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-3">
            {/* Recent bubbles */}
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

            {/* Input */}
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
        </div>
      )}

      {/* ─── Selected Player Info ─── */}
      {selectedPlayer && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-card/95 backdrop-blur-xl rounded-2xl border border-border/50 shadow-2xl p-4 w-64">
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
        </div>
      )}

      {/* ─── Bottom Navigation ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-40 bg-card/90 backdrop-blur-xl border-t border-border">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <Home className="w-5 h-5" /><span className="text-[10px]">{t('feed.nav.feed')}</span>
          </a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <HeartHandshake className="w-5 h-5" /><span className="text-[10px]">{t('feed.nav.dating')}</span>
          </a>
          <a href="/plaza" className="flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral">
            <Box className="w-5 h-5" /><span className="text-[10px] font-medium">{lang === 'zh' ? '廣場' : 'Plaza'}</span>
          </a>
          <a href="/tools" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <Wrench className="w-5 h-5" /><span className="text-[10px]">{t('feed.nav.tools')}</span>
          </a>
          <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <User className="w-5 h-5" /><span className="text-[10px]">{t('feed.nav.profile')}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
