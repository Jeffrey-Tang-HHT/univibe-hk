import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { useLocation } from 'wouter';
import {
  Shield, Home, HeartHandshake, Wrench, User, Globe, Moon, Sun,
  LogOut, Send, Paintbrush, MapPin, Users, MessageCircle, X, Box
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
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const posRef = useRef({ x: 0, y: 0, z: 5, rotation: 0, zone: 'center', isMoving: false });

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

  if (!isLoggedIn) return null;

  return (
    <div className="h-screen w-screen bg-background overflow-hidden relative">
      {/* ─── 3D Canvas ─── */}
      <Canvas
        shadows
        camera={{ position: [0, 8, 17], fov: 55 }}
        className="absolute inset-0"
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.setClearColor('#87CEEB');
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[20, 30, 10]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={100}
          shadow-camera-left={-50}
          shadow-camera-right={50}
          shadow-camera-top={50}
          shadow-camera-bottom={-50}
        />
        <hemisphereLight args={['#87CEEB', '#7CB342', 0.3]} />

        <Suspense fallback={null}>
          <Environment3D lang={lang} />
          <PlayerController
            config={avatarConfig}
            onPositionUpdate={handlePositionUpdate}
          />
          <OtherPlayers
            players={players}
            bubbles={bubbles}
            onPlayerClick={setSelectedPlayer}
          />
        </Suspense>
      </Canvas>

      {/* ─── Top HUD ─── */}
      <div className="absolute top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: logo + zone */}
          <div className="flex items-center gap-3">
            <a href="/feed" className="flex items-center gap-2 bg-card/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/50 shadow-sm">
              <div className="w-6 h-6 rounded-md bg-neon-coral flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display text-sm font-bold text-foreground hidden sm:inline">
                UniGo<span className="text-neon-coral"> HK</span>
              </span>
            </a>
            <div className="bg-card/80 backdrop-blur-sm rounded-xl px-3 py-2 border border-border/50 shadow-sm flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-neon-coral" />
              <span className="text-xs text-foreground font-medium">
                {ZONE_LABELS[currentZone]?.[lang === 'zh' ? 'zh' : 'en'] || currentZone}
              </span>
            </div>
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl px-2 py-1.5 border border-border/50 shadow-sm flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-foreground font-medium">{players.length}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm text-muted-foreground"
              onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
            >
              <Globe className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-8 h-8 bg-card/80 backdrop-blur-sm border border-border/50 shadow-sm text-muted-foreground"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* ─── Movement instructions ─── */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="bg-card/60 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border/30 shadow-sm">
          <p className="text-[10px] text-muted-foreground text-center">
            {lang === 'zh' ? '使用 WASD 或方向鍵移動' : 'Use WASD or Arrow Keys to move'}
          </p>
        </div>
      </div>

      {/* ─── Mini Map ─── */}
      <MiniMap players={players} myPosition={myPosition} />

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
