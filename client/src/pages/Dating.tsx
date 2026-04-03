import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, Heart, Sparkles, MessageCircle, Users, ChevronLeft, ChevronRight,
  Home, HeartHandshake, Wrench, User, Globe, Moon, Sun, LogOut, Search,
  Ghost, School, GraduationCap, X, Settings, Eye, Zap
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
  blurLevel: number; // 0 = fully blurred, 100 = clear
  messages: number;
  sexuality: string;
  compatibility: number;
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
  { id: "m1", mbti: "INFJ", institution: "HKU", major: "Psychology", interests: ["Reading", "Hiking", "Coffee"], bio: "", blurLevel: 30, messages: 0, sexuality: "bisexual", compatibility: 92 },
  { id: "m2", mbti: "ENTP", institution: "CUHK", major: "Business", interests: ["Debate", "Travel", "Music"], bio: "", blurLevel: 0, messages: 0, sexuality: "straight", compatibility: 87 },
  { id: "m3", mbti: "ISFP", institution: "PolyU", major: "Design", interests: ["Art", "Photography", "Cooking"], bio: "", blurLevel: 60, messages: 12, sexuality: "pansexual", compatibility: 78 },
  { id: "m4", mbti: "ENTJ", institution: "HKUST", major: "Engineering", interests: ["Coding", "Gym", "Anime"], bio: "", blurLevel: 100, messages: 25, sexuality: "gay", compatibility: 95 },
  { id: "m5", mbti: "INFP", institution: "CityU", major: "Creative Media", interests: ["Writing", "Film", "Gaming"], bio: "", blurLevel: 15, messages: 3, sexuality: "queer", compatibility: 83 },
  { id: "m6", mbti: "ESTJ", institution: "HKBU", major: "Journalism", interests: ["News", "Running", "Karaoke"], bio: "", blurLevel: 45, messages: 8, sexuality: "straight", compatibility: 71 },
];

function BlurredAvatar({ blurLevel, mbti, size = "lg" }: { blurLevel: number; mbti: string; size?: "sm" | "lg" }) {
  const clarity = blurLevel / 100;
  const blurPx = Math.max(0, 20 * (1 - clarity));
  const dim = size === "lg" ? "w-full aspect-square" : "w-14 h-14";

  // Generate a unique gradient based on MBTI
  const hue1 = mbti.charCodeAt(0) * 20 % 360;
  const hue2 = (hue1 + 120) % 360;

  return (
    <div className={`${dim} rounded-2xl overflow-hidden relative`}>
      <div
        className="w-full h-full"
        style={{
          background: `linear-gradient(135deg, hsl(${hue1}, 60%, 50%), hsl(${hue2}, 50%, 40%))`,
          filter: `blur(${blurPx}px)`,
          transition: "filter 0.5s ease",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-display font-bold text-white/90 ${size === "lg" ? "text-4xl" : "text-lg"}`} style={{ filter: `blur(${Math.max(0, blurPx - 5)}px)` }}>
          {mbti}
        </span>
      </div>
      {blurLevel < 100 && (
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/50 text-white text-[10px] font-medium backdrop-blur-sm">
          {blurLevel}% {blurLevel < 100 ? "🔒" : "🔓"}
        </div>
      )}
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
  const { user, isLoggedIn, logout, updateProfile } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const INTEREST_OPTIONS = [
    "Coding", "Hiking", "Photography", "Music", "Reading", "Travel",
    "Coffee", "Cooking", "Art", "Gaming", "Gym", "Film",
    "Debate", "Writing", "Anime", "Running", "Karaoke", "Dance"
  ];

  const MBTI_TYPES = [
    "INTJ", "INTP", "ENTJ", "ENTP",
    "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ",
    "ISTP", "ISFP", "ESTP", "ESFP"
  ];

  const filteredProfiles = useMemo(() => {
    if (filterSexuality === "all") return MOCK_PROFILES;
    return MOCK_PROFILES.filter(p => p.sexuality === filterSexuality);
  }, [filterSexuality]);

  const currentProfile = filteredProfiles[currentIndex % filteredProfiles.length];

  const handleVibeCheck = () => {
    toast.success(t("dating.vibe_sent"));
    setCurrentIndex(prev => prev + 1);
  };

  const handleSkip = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleSaveProfile = () => {
    if (!selectedMbti) {
      toast.error(t("dating.error.mbti"));
      return;
    }
    if (selectedInterests.length < 3) {
      toast.error(t("dating.error.interests"));
      return;
    }
    updateProfile({ mbti: selectedMbti, sexuality: selectedSexuality, interests: selectedInterests });
    setProfileSetup(true);
    toast.success(t("dating.profile_saved"));
  };

  if (!isLoggedIn) {
    setLocation("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-card/50 p-4">
          <a href="/" className="flex items-center gap-2.5 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-neon-coral flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              UniVibe<span className="text-neon-coral"> HK</span>
            </span>
          </a>

          <nav className="flex-1 space-y-1">
            <a href="/feed" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm">
              <Home className="w-4 h-4" /> {t("feed.nav.feed")}
            </a>
            <a href="/dating" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neon-coral/10 text-neon-coral font-medium text-sm">
              <HeartHandshake className="w-4 h-4" /> {t("feed.nav.dating")}
            </a>
            <button onClick={() => toast(t("common.coming_soon"))} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm w-full text-left">
              <Wrench className="w-4 h-4" /> {t("feed.nav.tools")}
            </button>
            <button onClick={() => toast(t("common.coming_soon"))} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm w-full text-left">
              <User className="w-4 h-4" /> {t("feed.nav.profile")}
            </button>
          </nav>

          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2 px-2">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
                <Globe className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
            <button
              onClick={() => { logout(); setLocation("/"); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm w-full"
            >
              <LogOut className="w-4 h-4" /> {t("feed.nav.logout")}
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-screen">
          {/* Mobile top bar */}
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neon-coral flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display text-base font-bold text-foreground">UniVibe<span className="text-neon-coral"> HK</span></span>
            </a>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}>
                <Globe className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Dating tabs */}
            <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
              {(["discover", "matches", "profile"] as DatingTab[]).map((t_) => (
                <button
                  key={t_}
                  onClick={() => setTab(t_)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                    tab === t_ ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(`dating.tab.${t_}`)}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* DISCOVER TAB */}
              {tab === "discover" && (
                <motion.div key="discover" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Filter bar */}
                  <div className="flex items-center justify-between mb-5">
                    <h2 className="font-display text-lg font-bold text-foreground">{t("dating.discover.title")}</h2>
                    <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowFilters(!showFilters)}>
                      <Settings className="w-4 h-4 mr-1" /> {t("dating.filter")}
                    </Button>
                  </div>

                  {/* Filters panel */}
                  <AnimatePresence>
                    {showFilters && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-5"
                      >
                        <div className="p-4 rounded-xl border border-border bg-card">
                          <p className="text-xs font-medium text-muted-foreground mb-2">{t("dating.filter.sexuality")}</p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setFilterSexuality("all")}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                filterSexuality === "all" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {t("dating.filter.all")}
                            </button>
                            {SEXUALITY_OPTIONS.map((opt) => (
                              <button
                                key={opt.key}
                                onClick={() => setFilterSexuality(opt.key)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                  filterSexuality === opt.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {lang === "zh" ? opt.zh : opt.en}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Profile card */}
                  {currentProfile && (
                    <motion.div
                      key={currentProfile.id + currentIndex}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-2xl border border-border bg-card overflow-hidden"
                    >
                      <BlurredAvatar blurLevel={currentProfile.blurLevel} mbti={currentProfile.mbti} size="lg" />

                      <div className="p-5">
                        {/* Compatibility badge */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-display text-xl font-bold text-foreground">{currentProfile.mbti}</span>
                            <span className="text-sm text-muted-foreground">· {currentProfile.institution}</span>
                          </div>
                          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-neon-emerald/10 text-neon-emerald text-xs font-medium">
                            <Sparkles className="w-3 h-3" />
                            {currentProfile.compatibility}% {t("dating.match")}
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">{currentProfile.major}</p>

                        {/* Sexuality tag */}
                        <div className="mb-3">
                          {SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-neon-lavender/10 text-neon-lavender text-xs font-medium">
                              {lang === "zh"
                                ? SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality)?.zh
                                : SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality)?.en
                              }
                            </span>
                          )}
                        </div>

                        {/* Interests */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {currentProfile.interests.map((interest) => (
                            <span key={interest} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground">
                              {interest}
                            </span>
                          ))}
                        </div>

                        {/* Blur progress */}
                        <div className="mb-5">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                            <span>{t("dating.photo_clarity")}</span>
                            <span>{currentProfile.blurLevel}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan transition-all duration-500"
                              style={{ width: `${currentProfile.blurLevel}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {currentProfile.messages}/20 {t("dating.messages_to_reveal")}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={handleSkip}
                          >
                            <ChevronRight className="w-4 h-4 mr-1" />
                            {t("dating.skip")}
                          </Button>
                          <Button
                            className="flex-1 bg-neon-coral hover:bg-neon-coral/90 text-white"
                            onClick={handleVibeCheck}
                          >
                            <Zap className="w-4 h-4 mr-1" />
                            {t("dating.vibe_check")}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* MATCHES TAB */}
              {tab === "matches" && (
                <motion.div key="matches" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="font-display text-lg font-bold text-foreground mb-5">{t("dating.matches.title")}</h2>

                  <div className="space-y-3">
                    {MOCK_PROFILES.filter(p => p.messages > 0).map((profile) => (
                      <button
                        key={profile.id}
                        onClick={() => toast(t("common.coming_soon"))}
                        className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-all text-left"
                      >
                        <BlurredAvatar blurLevel={profile.blurLevel} mbti={profile.mbti} size="sm" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-display font-bold text-sm text-foreground">{profile.mbti}</span>
                            <span className="text-xs text-muted-foreground">· {profile.institution}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{profile.major}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-neon-coral font-medium">{profile.messages}/20 {t("dating.messages_short")}</span>
                            <span className="text-[10px] text-muted-foreground">· {profile.blurLevel}% {t("dating.clarity")}</span>
                          </div>
                        </div>
                        <MessageCircle className="w-5 h-5 text-neon-coral" />
                      </button>
                    ))}

                    {MOCK_PROFILES.filter(p => p.messages > 0).length === 0 && (
                      <div className="text-center py-12">
                        <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">{t("dating.matches.empty")}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* PROFILE TAB */}
              {tab === "profile" && (
                <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="font-display text-lg font-bold text-foreground mb-5">{t("dating.profile.title")}</h2>

                  <div className="space-y-6">
                    {/* Sexuality selector */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">{t("dating.profile.sexuality")}</label>
                      <div className="flex flex-wrap gap-2">
                        {SEXUALITY_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            onClick={() => setSelectedSexuality(opt.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              selectedSexuality === opt.key
                                ? "bg-neon-lavender text-white"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {lang === "zh" ? opt.zh : opt.en}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* MBTI selector */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">{t("dating.profile.mbti")}</label>
                      <div className="grid grid-cols-4 gap-2">
                        {MBTI_TYPES.map((type) => (
                          <button
                            key={type}
                            onClick={() => setSelectedMbti(type)}
                            className={`py-2 rounded-lg text-xs font-bold transition-all ${
                              selectedMbti === type
                                ? "bg-neon-coral text-white shadow-md"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Interests */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">
                        {t("dating.profile.interests")} <span className="text-muted-foreground font-normal">({selectedInterests.length}/3 {t("dating.profile.min")})</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {INTEREST_OPTIONS.map((interest) => (
                          <button
                            key={interest}
                            onClick={() => {
                              if (selectedInterests.includes(interest)) {
                                setSelectedInterests(prev => prev.filter(i => i !== interest));
                              } else if (selectedInterests.length < 6) {
                                setSelectedInterests(prev => [...prev, interest]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              selectedInterests.includes(interest)
                                ? "bg-neon-cyan text-white"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {interest}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={handleSaveProfile}
                      className="w-full h-11 bg-neon-coral hover:bg-neon-coral/90 text-white font-medium"
                    >
                      {t("dating.profile.save")}
                    </Button>

                    {profileSetup && (
                      <div className="p-4 rounded-xl bg-neon-emerald/10 border border-neon-emerald/20">
                        <p className="text-sm text-neon-emerald font-medium">{t("dating.profile.active")}</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <Home className="w-5 h-5" />
            <span className="text-[10px]">{t("feed.nav.feed")}</span>
          </a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral">
            <HeartHandshake className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t("feed.nav.dating")}</span>
          </a>
          <button onClick={() => toast(t("common.coming_soon"))} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <Wrench className="w-5 h-5" />
            <span className="text-[10px]">{t("feed.nav.tools")}</span>
          </button>
          <button onClick={() => toast(t("common.coming_soon"))} className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-[10px]">{t("feed.nav.profile")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
