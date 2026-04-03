import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, Heart, Sparkles, MessageCircle, Users, ChevronLeft, ChevronRight,
  Home, HeartHandshake, Wrench, User, Globe, Moon, Sun, LogOut,
  X, Settings, Eye, Zap, Send, ImageOff,
  Lock, Unlock, Coffee, Music, Camera, Palette, Dumbbell, Gamepad2,
  BookOpen, Plane, ChefHat, Film, Mic2, PenTool, Code, Mountain
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

type DatingTab = "discover" | "matches" | "profile";

interface MatchProfile {
  id: string;
  mbti: string;
  institution: string;
  major: string;
  interests: string[];
  bio: string;
  blurLevel: number;
  messages: number;
  sexuality: string;
  compatibility: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
}

const SEXUALITY_OPTIONS = [
  { key: "straight", zh: "異性戀", en: "Straight" },
  { key: "gay", zh: "男同性戀", en: "Gay" },
  { key: "lesbian", zh: "女同性戀", en: "Lesbian" },
  { key: "bisexual", zh: "雙性戀", en: "Bisexual" },
  { key: "pansexual", zh: "泛性戀", en: "Pansexual" },
  { key: "asexual", zh: "無性戀", en: "Asexual" },
  { key: "queer", zh: "酷兒", en: "Queer" },
  { key: "questioning", zh: "探索中", en: "Questioning" },
  { key: "prefer_not_to_say", zh: "不願透露", en: "Prefer not to say" },
];

const MOCK_PROFILES: MatchProfile[] = [
  { id: "m1", mbti: "INFJ", institution: "HKU", major: "Psychology", interests: ["Reading", "Hiking", "Coffee"], bio: "鍾意行山同飲咖啡，搵緊一個可以一齊傾通宵嘅人 ☕", blurLevel: 30, messages: 0, sexuality: "bisexual", compatibility: 92 },
  { id: "m2", mbti: "ENTP", institution: "CUHK", major: "Business", interests: ["Debate", "Travel", "Music"], bio: "辯論隊嘅，鍾意周圍去旅行，識到新朋友最開心 🌍", blurLevel: 0, messages: 0, sexuality: "straight", compatibility: 87 },
  { id: "m3", mbti: "ISFP", institution: "PolyU", major: "Design", interests: ["Art", "Photography", "Cooking"], bio: "設計系學生，平時鍾意影相同煮嘢食 📸", blurLevel: 60, messages: 12, sexuality: "pansexual", compatibility: 78, lastMessage: "你鍾意去邊度影相？", lastMessageTime: "2小時前", unread: 2 },
  { id: "m4", mbti: "ENTJ", institution: "HKUST", major: "Engineering", interests: ["Coding", "Gym", "Anime"], bio: "工程系，放學就去做gym或者睇anime 💪", blurLevel: 100, messages: 25, sexuality: "gay", compatibility: 95, lastMessage: "今晚一齊食飯？", lastMessageTime: "30分鐘前", unread: 1 },
  { id: "m5", mbti: "INFP", institution: "CityU", major: "Creative Media", interests: ["Writing", "Film", "Gaming"], bio: "文青一個，鍾意睇電影同打機 🎬", blurLevel: 15, messages: 3, sexuality: "queer", compatibility: 83, lastMessage: "你覺得呢套戲點？", lastMessageTime: "5小時前", unread: 0 },
  { id: "m6", mbti: "ESTJ", institution: "HKBU", major: "Journalism", interests: ["News", "Running", "Karaoke"], bio: "新聞系，鍾意跑步同唱K 🎤", blurLevel: 45, messages: 8, sexuality: "straight", compatibility: 71, lastMessage: "下次一齊去唱K！", lastMessageTime: "1日前", unread: 0 },
  { id: "m7", mbti: "ENFJ", institution: "EdUHK", major: "Education", interests: ["Music", "Cooking", "Travel"], bio: "未來老師一個，鍾意彈結他同煮嘢食 🎸", blurLevel: 20, messages: 0, sexuality: "straight", compatibility: 88 },
  { id: "m8", mbti: "ISTP", institution: "LingU", major: "Translation", interests: ["Gaming", "Coffee", "Film"], bio: "翻譯系，安靜但打機好認真 🎮", blurLevel: 0, messages: 0, sexuality: "bisexual", compatibility: 75 },
];

const INTEREST_OPTIONS = [
  { key: "Coding", icon: Code, zh: "編程" },
  { key: "Hiking", icon: Mountain, zh: "行山" },
  { key: "Photography", icon: Camera, zh: "攝影" },
  { key: "Music", icon: Music, zh: "音樂" },
  { key: "Reading", icon: BookOpen, zh: "閱讀" },
  { key: "Travel", icon: Plane, zh: "旅行" },
  { key: "Coffee", icon: Coffee, zh: "咖啡" },
  { key: "Cooking", icon: ChefHat, zh: "煮食" },
  { key: "Art", icon: Palette, zh: "藝術" },
  { key: "Gaming", icon: Gamepad2, zh: "遊戲" },
  { key: "Gym", icon: Dumbbell, zh: "健身" },
  { key: "Film", icon: Film, zh: "電影" },
  { key: "Debate", icon: Mic2, zh: "辯論" },
  { key: "Writing", icon: PenTool, zh: "寫作" },
];

const MBTI_TYPES = [
  "INTJ", "INTP", "ENTJ", "ENTP",
  "INFJ", "INFP", "ENFJ", "ENFP",
  "ISTJ", "ISFJ", "ESTJ", "ESFJ",
  "ISTP", "ISFP", "ESTP", "ESFP"
];

function BlurredAvatar({ blurLevel, mbti, size = "lg" }: { blurLevel: number; mbti: string; size?: "sm" | "md" | "lg" }) {
  const clarity = blurLevel / 100;
  const blurPx = Math.max(0, 20 * (1 - clarity));
  const dim = size === "lg" ? "w-full aspect-[4/3]" : size === "md" ? "w-16 h-16" : "w-12 h-12";
  const hue1 = mbti.charCodeAt(0) * 20 % 360;
  const hue2 = (hue1 + 120) % 360;
  const hue3 = (hue1 + 60) % 360;

  return (
    <div className={`${dim} rounded-2xl overflow-hidden relative flex-shrink-0`}>
      <div className="w-full h-full" style={{
        background: `linear-gradient(135deg, hsl(${hue1}, 55%, 55%), hsl(${hue3}, 45%, 45%), hsl(${hue2}, 50%, 40%))`,
        filter: `blur(${blurPx}px)`, transition: "filter 0.5s ease", transform: "scale(1.1)",
      }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-display font-bold text-white/80 ${size === "lg" ? "text-5xl" : size === "md" ? "text-lg" : "text-sm"}`}
          style={{ filter: `blur(${Math.max(0, blurPx * 0.6)}px)` }}>{mbti}</span>
      </div>
      {size === "lg" && (
        <div className={`absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 ${blurLevel >= 100 ? "bg-neon-emerald/80" : "bg-black/50"}`}>
          {blurLevel < 100 ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {blurLevel >= 100 ? "已解鎖" : `${blurLevel}%`}
        </div>
      )}
    </div>
  );
}

function ChatBubble({ message, isMe, time }: { message: string; isMe: boolean; time: string }) {
  return (
    <div className={`flex ${isMe ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl ${isMe ? "bg-neon-coral text-white rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}>
        <p className="text-sm">{message}</p>
        <p className={`text-[10px] mt-1 ${isMe ? "text-white/60" : "text-muted-foreground"}`}>{time}</p>
      </div>
    </div>
  );
}

export default function Dating() {
  const [tab, setTab] = useState<DatingTab>("discover");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profileSetup, setProfileSetup] = useState(false);
  const [selectedSexuality, setSelectedSexuality] = useState("prefer_not_to_say");
  const [selectedMbti, setSelectedMbti] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [filterSexuality, setFilterSexuality] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatMessages, setChatMessages] = useState<Record<string, { text: string; isMe: boolean; time: string }[]>>({
    m3: [
      { text: "你好！見到你都鍾意攝影 📸", isMe: false, time: "3小時前" },
      { text: "係呀！我平時鍾意去離島影日落", isMe: true, time: "3小時前" },
      { text: "你鍾意去邊度影相？", isMe: false, time: "2小時前" },
    ],
    m4: [
      { text: "你個 ENTJ 配我個 ENFP 好夾喎 😆", isMe: true, time: "2日前" },
      { text: "係呀！MBTI compatibility 95% 🔥", isMe: false, time: "2日前" },
      { text: "今晚一齊食飯？", isMe: false, time: "30分鐘前" },
    ],
    m5: [
      { text: "你個 profile 好文青呀", isMe: true, time: "6小時前" },
      { text: "哈哈多謝！你鍾意咩類型嘅電影？", isMe: false, time: "6小時前" },
      { text: "你覺得呢套戲點？", isMe: false, time: "5小時前" },
    ],
    m6: [
      { text: "你都鍾意唱K！去邊間？", isMe: true, time: "2日前" },
      { text: "下次一齊去唱K！", isMe: false, time: "1日前" },
    ],
  });
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const { user, isLoggedIn, logout, updateProfile } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const filteredProfiles = useMemo(() => {
    const available = MOCK_PROFILES.filter(p => p.messages === 0);
    if (filterSexuality === "all") return available;
    return available.filter(p => p.sexuality === filterSexuality);
  }, [filterSexuality]);

  const matchedProfiles = useMemo(() => {
    return MOCK_PROFILES.filter(p => p.messages > 0).sort((a, b) => (b.unread || 0) - (a.unread || 0));
  }, []);

  const currentProfile = filteredProfiles[currentIndex % Math.max(filteredProfiles.length, 1)];
  const activeChat = activeChatId ? MOCK_PROFILES.find(p => p.id === activeChatId) : null;

  const handleVibeCheck = () => {
    setSwipeDirection("right");
    setTimeout(() => { toast.success("氛圍檢測已發送！等待對方回應 💫"); setCurrentIndex(prev => prev + 1); setSwipeDirection(null); }, 300);
  };
  const handleSkip = () => {
    setSwipeDirection("left");
    setTimeout(() => { setCurrentIndex(prev => prev + 1); setSwipeDirection(null); }, 300);
  };
  const handleSendMessage = () => {
    if (!chatMessage.trim() || !activeChatId) return;
    setChatMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), { text: chatMessage, isMe: true, time: "剛剛" }] }));
    setChatMessage("");
  };
  const handleSaveProfile = () => {
    if (!selectedMbti) { toast.error("請選擇你的 MBTI 類型"); return; }
    if (selectedInterests.length < 3) { toast.error("請至少選擇3個興趣"); return; }
    updateProfile({ mbti: selectedMbti, sexuality: selectedSexuality, interests: selectedInterests });
    setProfileSetup(true);
    toast.success("交友檔案已儲存！");
  };

  if (!isLoggedIn) { setLocation("/login"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-card/50 p-4">
          <a href="/" className="flex items-center gap-2.5 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-4.5 h-4.5 text-white" /></div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">UniVibe<span className="text-neon-coral"> HK</span></span>
          </a>
          <nav className="flex-1 space-y-1">
            <a href="/feed" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><Home className="w-4 h-4" /> {t("feed.nav.feed")}</a>
            <a href="/dating" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neon-coral/10 text-neon-coral font-medium text-sm"><HeartHandshake className="w-4 h-4" /> {t("feed.nav.dating")}</a>
            <button onClick={() => toast(t("common.coming_soon"))} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm w-full text-left"><Wrench className="w-4 h-4" /> {t("feed.nav.tools")}</button>
            <button onClick={() => toast(t("common.coming_soon"))} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm w-full text-left"><User className="w-4 h-4" /> {t("feed.nav.profile")}</button>
          </nav>
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2 px-2">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}><Globe className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            </div>
            <button onClick={() => { logout(); setLocation("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm w-full"><LogOut className="w-4 h-4" /> {t("feed.nav.logout")}</button>
          </div>
        </aside>

        <main className="flex-1 min-h-screen">
          {/* Mobile header */}
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
            {activeChatId ? (
              <>
                <button onClick={() => setActiveChatId(null)} className="flex items-center gap-2 text-foreground"><ChevronLeft className="w-5 h-5" /><span className="font-medium text-sm">返回</span></button>
                {activeChat && <span className="font-display font-bold text-sm">{activeChat.mbti} · {activeChat.institution}</span>}
                <div className="w-10" />
              </>
            ) : (
              <>
                <a href="/" className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div><span className="font-display text-base font-bold text-foreground">UniVibe<span className="text-neon-coral"> HK</span></span></a>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}><Globe className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
                </div>
              </>
            )}
          </div>

          {/* Chat View */}
          {activeChatId && activeChat ? (
            <div className="flex flex-col h-[calc(100vh-57px)] lg:h-screen">
              <div className="hidden lg:flex items-center gap-4 p-4 border-b border-border">
                <button onClick={() => setActiveChatId(null)} className="text-muted-foreground hover:text-foreground"><ChevronLeft className="w-5 h-5" /></button>
                <BlurredAvatar blurLevel={activeChat.blurLevel} mbti={activeChat.mbti} size="sm" />
                <div>
                  <div className="flex items-center gap-2"><span className="font-display font-bold text-foreground">{activeChat.mbti}</span><span className="text-sm text-muted-foreground">· {activeChat.institution} · {activeChat.major}</span></div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-1 w-16 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan" style={{ width: `${activeChat.blurLevel}%` }} /></div>
                    <span className="text-[10px] text-muted-foreground">{activeChat.messages}/20 訊息解鎖</span>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <div className="flex justify-center mb-6"><div className="px-4 py-2 rounded-full bg-muted/50 text-xs text-muted-foreground flex items-center gap-2"><Eye className="w-3 h-3" />照片清晰度 {activeChat.blurLevel}% · 再發 {20 - activeChat.messages} 條訊息即可完全解鎖</div></div>
                {(chatMessages[activeChatId] || []).map((msg, idx) => (<ChatBubble key={idx} message={msg.text} isMe={msg.isMe} time={msg.time} />))}
              </div>
              <div className="p-4 border-t border-border bg-card/50">
                <div className="flex items-center gap-3">
                  <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} placeholder="輸入訊息..." className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-neon-coral/30" />
                  <Button onClick={handleSendMessage} disabled={!chatMessage.trim()} className="bg-neon-coral hover:bg-neon-coral/90 text-white rounded-xl px-4" size="sm"><Send className="w-4 h-4" /></Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-6">
              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
                {(["discover", "matches", "profile"] as DatingTab[]).map((t_) => (
                  <button key={t_} onClick={() => setTab(t_)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${tab === t_ ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {t_ === "discover" ? "探索" : t_ === "matches" ? `配對 (${matchedProfiles.length})` : "交友檔案"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* DISCOVER */}
                {tab === "discover" && (
                  <motion.div key="discover" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="flex items-center justify-between mb-5">
                      <div><h2 className="font-display text-lg font-bold text-foreground">探索配對</h2><p className="text-xs text-muted-foreground mt-0.5">個性優先，外貌其後 ✨</p></div>
                      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowFilters(!showFilters)}><Settings className="w-4 h-4 mr-1" /> 篩選</Button>
                    </div>
                    <AnimatePresence>{showFilters && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-5">
                        <div className="p-4 rounded-xl border border-border bg-card">
                          <p className="text-xs font-medium text-muted-foreground mb-2.5">性取向篩選</p>
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => setFilterSexuality("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterSexuality === "all" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground"}`}>全部</button>
                            {SEXUALITY_OPTIONS.map((opt) => (<button key={opt.key} onClick={() => setFilterSexuality(opt.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterSexuality === opt.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground"}`}>{lang === "zh" ? opt.zh : opt.en}</button>))}
                          </div>
                        </div>
                      </motion.div>
                    )}</AnimatePresence>

                    {currentProfile && filteredProfiles.length > 0 ? (
                      <div className="relative">
                        <div className="absolute inset-x-3 top-3 h-40 rounded-2xl border border-border bg-card/50 -z-10" />
                        <motion.div key={currentProfile.id + currentIndex} initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: swipeDirection ? 0 : 1, scale: swipeDirection ? 0.9 : 1, x: swipeDirection === "left" ? -200 : swipeDirection === "right" ? 200 : 0, rotate: swipeDirection === "left" ? -10 : swipeDirection === "right" ? 10 : 0 }}
                          transition={{ duration: 0.3 }} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                          <BlurredAvatar blurLevel={currentProfile.blurLevel} mbti={currentProfile.mbti} size="lg" />
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2"><span className="font-display text-xl font-bold text-foreground">{currentProfile.mbti}</span><span className="text-sm text-muted-foreground">· {currentProfile.institution}</span></div>
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-emerald/10 text-neon-emerald text-xs font-semibold"><Sparkles className="w-3 h-3" />{currentProfile.compatibility}%</div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{currentProfile.major}</p>
                            {currentProfile.bio && <p className="text-sm text-foreground mb-4 leading-relaxed">{currentProfile.bio}</p>}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality) && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-neon-lavender/10 text-neon-lavender text-xs font-medium">{lang === "zh" ? SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality)?.zh : SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality)?.en}</span>
                              )}
                              {currentProfile.interests.map((interest) => (<span key={interest} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground font-medium">{interest}</span>))}
                            </div>
                            <div className="p-3 rounded-xl bg-muted/50 mb-5">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2"><span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> 照片清晰度</span><span className="font-medium">{currentProfile.blurLevel}%</span></div>
                              <div className="h-2 rounded-full bg-background overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan" initial={{ width: 0 }} animate={{ width: `${currentProfile.blurLevel}%` }} transition={{ duration: 0.8, ease: "easeOut" }} /></div>
                              <p className="text-[10px] text-muted-foreground mt-1.5">配對後透過訊息逐步解鎖，20條訊息後完全揭示 🔓</p>
                            </div>
                            <div className="flex gap-3">
                              <Button variant="outline" className="flex-1 h-12 rounded-xl text-base" onClick={handleSkip}><X className="w-5 h-5 mr-2 text-muted-foreground" />跳過</Button>
                              <Button className="flex-1 h-12 bg-neon-coral hover:bg-neon-coral/90 text-white rounded-xl text-base" onClick={handleVibeCheck}><Zap className="w-5 h-5 mr-2" />氛圍檢測</Button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-2xl border border-border bg-card"><Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" /><p className="text-lg font-medium text-foreground mb-2">暫時冇更多配對</p><p className="text-sm text-muted-foreground">稍後再返嚟睇吓 💫</p></div>
                    )}

                    <div className="mt-8 p-5 rounded-2xl border border-border bg-card/50">
                      <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-neon-coral" />慢揭示交友點樣運作？</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[{ icon: Zap, title: "氛圍檢測", desc: "喺論壇有好嘅交流？發送氛圍檢測開始私聊" }, { icon: ImageOff, title: "模糊照片", desc: "一開始只見到 MBTI 同學科，照片係模糊嘅" }, { icon: MessageCircle, title: "20條訊息", desc: "每發一條訊息，照片就會清晰少少" }, { icon: Users, title: "組隊配對", desc: "同朋友一齊配對，低壓力嘅群組聚會" }].map((step, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                            <div className="w-8 h-8 rounded-lg bg-neon-coral/10 flex items-center justify-center flex-shrink-0"><step.icon className="w-4 h-4 text-neon-coral" /></div>
                            <div><p className="text-sm font-medium text-foreground">{step.title}</p><p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* MATCHES */}
                {tab === "matches" && (
                  <motion.div key="matches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h2 className="font-display text-lg font-bold text-foreground mb-2">你的配對</h2>
                    <p className="text-xs text-muted-foreground mb-5">繼續傾偈解鎖對方嘅照片 🔓</p>
                    <div className="space-y-2">
                      {matchedProfiles.map((profile) => (
                        <button key={profile.id} onClick={() => setActiveChatId(profile.id)} className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all text-left group">
                          <div className="relative">
                            <BlurredAvatar blurLevel={profile.blurLevel} mbti={profile.mbti} size="md" />
                            {(profile.unread || 0) > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neon-coral text-white text-[10px] font-bold flex items-center justify-center">{profile.unread}</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-display font-bold text-sm text-foreground">{profile.mbti}</span><span className="text-xs text-muted-foreground">· {profile.institution}</span></div><span className="text-[10px] text-muted-foreground">{profile.lastMessageTime}</span></div>
                            <p className="text-xs text-muted-foreground mt-0.5">{profile.major}</p>
                            {profile.lastMessage && <p className={`text-sm mt-1.5 truncate ${(profile.unread || 0) > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{profile.lastMessage}</p>}
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5"><div className="h-1 w-12 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan" style={{ width: `${profile.blurLevel}%` }} /></div><span className="text-[10px] text-muted-foreground">{profile.blurLevel}%</span></div>
                              <span className="text-[10px] text-neon-coral font-medium">{profile.messages}/20 訊息</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                      {matchedProfiles.length === 0 && (
                        <div className="text-center py-16 rounded-2xl border border-border bg-card"><Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" /><p className="text-lg font-medium text-foreground mb-2">仲未有配對</p><p className="text-sm text-muted-foreground mb-4">去「探索」頁面發送氛圍檢測開始配對！</p><Button onClick={() => setTab("discover")} className="bg-neon-coral hover:bg-neon-coral/90 text-white">開始探索</Button></div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* PROFILE */}
                {tab === "profile" && (
                  <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h2 className="font-display text-lg font-bold text-foreground mb-2">設定交友檔案</h2>
                    <p className="text-xs text-muted-foreground mb-6">其他用戶會見到你嘅 MBTI、興趣同模糊照片</p>
                    <div className="space-y-6">
                      <div className="p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-medium text-foreground mb-3 block">性取向</label>
                        <div className="flex flex-wrap gap-2">
                          {SEXUALITY_OPTIONS.map((opt) => (<button key={opt.key} onClick={() => setSelectedSexuality(opt.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedSexuality === opt.key ? "bg-neon-lavender text-white shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{lang === "zh" ? opt.zh : opt.en}</button>))}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-medium text-foreground mb-3 block">你的 MBTI</label>
                        <div className="grid grid-cols-4 gap-2">
                          {MBTI_TYPES.map((type) => (<button key={type} onClick={() => setSelectedMbti(type)} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${selectedMbti === type ? "bg-neon-coral text-white shadow-md scale-105" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}>{type}</button>))}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-medium text-foreground mb-1 block">興趣愛好</label>
                        <p className="text-xs text-muted-foreground mb-3">已選 {selectedInterests.length}/6（最少 3 個）</p>
                        <div className="grid grid-cols-2 gap-2">
                          {INTEREST_OPTIONS.map(({ key, icon: Icon, zh }) => {
                            const selected = selectedInterests.includes(key);
                            return (<button key={key} onClick={() => { if (selected) setSelectedInterests(prev => prev.filter(i => i !== key)); else if (selectedInterests.length < 6) setSelectedInterests(prev => [...prev, key]); }}
                              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${selected ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30" : "bg-muted text-muted-foreground hover:text-foreground border border-transparent"}`}>
                              <Icon className="w-4 h-4 flex-shrink-0" />{lang === "zh" ? zh : key}
                            </button>);
                          })}
                        </div>
                      </div>
                      <Button onClick={handleSaveProfile} className="w-full h-12 bg-neon-coral hover:bg-neon-coral/90 text-white font-medium rounded-xl text-base">儲存檔案</Button>
                      {profileSetup && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-neon-emerald/10 border border-neon-emerald/20"><p className="text-sm text-neon-emerald font-medium">✓ 你的交友檔案已啟用！其他用戶現在可以看到你。</p></motion.div>)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Home className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.feed")}</span></a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral"><HeartHandshake className="w-5 h-5" /><span className="text-[10px] font-medium">{t("feed.nav.dating")}</span></a>
          <button onClick={() => toast(t("common.coming_soon"))} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Wrench className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.tools")}</span></button>
          <button onClick={() => toast(t("common.coming_soon"))} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><User className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.profile")}</span></button>
        </div>
      </div>
    </div>
  );
}
