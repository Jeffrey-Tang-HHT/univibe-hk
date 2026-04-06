import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, MessageCircle, Heart, Share2, TrendingUp, BookOpen, Compass,
  DollarSign, Send, Ghost, School, GraduationCap, Plus, Search,
  LogOut, User, Globe, Moon, Sun, Home, HeartHandshake, Wrench, X, Flame
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

type Category = "all" | "trending" | "confessions" | "non-jupas" | "mbti" | "missed" | "salary";
type PrivacyMode = "ghost" | "campus" | "major";

interface Post {
  id: string;
  author: string;
  authorTag: string;
  privacyMode: PrivacyMode;
  category: Category;
  content: string;
  likes: number;
  comments: number;
  timeMinutes: number; // store as minutes ago instead of hardcoded string
  liked: boolean;
}

// Helper: convert minutes to localized "time ago" string
function formatTimeAgo(minutes: number, lang: string): string {
  if (minutes < 1) return lang === "zh" ? "剛剛" : "Just now";
  if (minutes < 60) return lang === "zh" ? `${minutes}分鐘前` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "zh" ? `${hours}小時前` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === "zh" ? `${days}日前` : `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return lang === "zh" ? `${weeks}週前` : `${weeks}w ago`;
}

const MOCK_POSTS: Post[] = [
  { id: "1", author: "匿名", authorTag: "匿名", privacyMode: "ghost", category: "trending", content: "有冇人覺得今個sem嘅 workload 比上年重好多？我已經連續三日通宵做 assignment 😭", likes: 142, comments: 38, timeMinutes: 120, liked: false },
  { id: "2", author: "HKU · ENFP", authorTag: "HKU · ENFP", privacyMode: "campus", category: "non-jupas", content: "Non-JUPAS 入到 HKU BBA！GPA 3.7，面試準備咗兩個月。有咩想問都可以留言 🎉", likes: 287, comments: 94, timeMinutes: 300, liked: false },
  { id: "3", author: "PolyU · Design · INFJ", authorTag: "PolyU · Design · INFJ", privacyMode: "major", category: "mbti", content: "INFJ 同 ENTP 真係天生一對？我同我 project partner 成日嗌交但又做到好嘢出嚟 😂", likes: 203, comments: 67, timeMinutes: 480, liked: false },
  { id: "4", author: "匿名", authorTag: "匿名", privacyMode: "ghost", category: "missed", content: "今日下午3點喺 HKCC 圖書館 2/F 戴黑色 cap 嘅男仔，你跌咗張學生證，我幫你放咗喺 counter 🫣", likes: 89, comments: 23, timeMinutes: 60, liked: false },
  { id: "5", author: "CityU · ISTJ", authorTag: "CityU · ISTJ", privacyMode: "campus", category: "salary", content: "Big 4 summer intern 月薪 HK$18,000，OT 冇補水但學到好多嘢。值唔值得去？", likes: 356, comments: 112, timeMinutes: 720, liked: false },
  { id: "6", author: "匿名", authorTag: "匿名", privacyMode: "ghost", category: "trending", content: "學校飯堂又加價 😤 一碟燒味飯要 $48 係咪搶錢", likes: 521, comments: 156, timeMinutes: 180, liked: false },
  { id: "7", author: "CUHK · CS · INTP", authorTag: "CUHK · CS · INTP", privacyMode: "major", category: "non-jupas", content: "副學士轉 CUHK CS 嘅經驗分享：Portfolio 比 GPA 更重要，面試問咗好多 project 嘅嘢", likes: 178, comments: 45, timeMinutes: 1440, liked: false },
  { id: "8", author: "HKUST · ENFJ", authorTag: "HKUST · ENFJ", privacyMode: "campus", category: "mbti", content: "MBTI 測試話我係 ENFJ 但我覺得自己好 introverted 🤔 有冇人都係咁？", likes: 134, comments: 78, timeMinutes: 360, liked: false },
  { id: "9", author: "匿名", authorTag: "匿名", privacyMode: "ghost", category: "confessions", content: "我偷偷鍾意咗同組嘅 project partner 成個sem，但佢有女朋友... 每次做 group project 都好掙扎 😔", likes: 412, comments: 89, timeMinutes: 45, liked: false },
  { id: "10", author: "匿名", authorTag: "匿名", privacyMode: "ghost", category: "confessions", content: "考試作弊被抓到但教授冇report，只係同我講「下次唔好再咁」。我到而家都覺得好內疚 😞", likes: 267, comments: 134, timeMinutes: 240, liked: false },
  { id: "11", author: "匿名", authorTag: "匿名", privacyMode: "ghost", category: "confessions", content: "其實我轉咗系三次，爸媽以為我一直讀緊 Business，但我偷偷轉咗去讀 Fine Arts 🎨", likes: 589, comments: 201, timeMinutes: 600, liked: false },
  { id: "12", author: "匿名", authorTag: "匿名", privacyMode: "ghost", category: "confessions", content: "每日都喺圖書館扮溫書，其實係因為唔想返宿舍面對 roommate。好想申請轉房但唔知點開口 🥲", likes: 345, comments: 67, timeMinutes: 150, liked: false },
  { id: "13", author: "匿名", authorTag: "匿名", privacyMode: "ghost", category: "confessions", content: "我係全班唯一一個仲未搵到 intern 嘅人，LinkedIn 上面見到同學個個都好叻，自信心跌到谷底 💔", likes: 623, comments: 178, timeMinutes: 420, liked: false },
];

const privacyIcons: Record<PrivacyMode, typeof Ghost> = {
  ghost: Ghost,
  campus: School,
  major: GraduationCap,
};

const privacyColors: Record<PrivacyMode, string> = {
  ghost: "bg-muted text-muted-foreground",
  campus: "bg-neon-emerald/10 text-neon-emerald",
  major: "bg-neon-coral/10 text-neon-coral",
};

export default function Feed() {
  const [category, setCategory] = useState<Category>("all");
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);
  const [newPost, setNewPost] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPrivacy, setComposerPrivacy] = useState<PrivacyMode>("ghost");
  const [searchQuery, setSearchQuery] = useState("");
  const { user, isLoggedIn, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const currentPosts = useMemo(() => {
    const merged = MOCK_POSTS.map(p => {
      const existing = posts.find(ep => ep.id === p.id);
      return existing ? { ...p, liked: existing.liked, likes: existing.likes } : p;
    });
    let filtered = category === "all" ? merged : merged.filter(p => p.category === category);
    if (searchQuery) {
      filtered = filtered.filter(p => p.content.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return filtered;
  }, [category, posts, searchQuery]);

  const categories = [
    { key: "all" as Category, label: t("feed.cat.all"), icon: TrendingUp },
    { key: "trending" as Category, label: t("feed.cat.trending"), icon: TrendingUp },
    { key: "confessions" as Category, label: t("feed.cat.confessions"), icon: Flame },
    { key: "non-jupas" as Category, label: "Non-JUPAS", icon: BookOpen },
    { key: "mbti" as Category, label: "MBTI", icon: Compass },
    { key: "missed" as Category, label: t("feed.cat.missed"), icon: HeartHandshake },
    { key: "salary" as Category, label: t("feed.cat.salary"), icon: DollarSign },
  ];

  const handleLike = (id: string) => {
    setPosts(prev => prev.map(p =>
      p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p
    ));
  };

  const handlePost = () => {
    if (!newPost.trim()) return;
    const newPostObj: Post = {
      id: `new_${Date.now()}`,
      author: composerPrivacy === "ghost" ? (lang === "zh" ? "匿名" : "Anonymous") : (user?.institution + " · " + user?.mbti),
      authorTag: composerPrivacy === "ghost" ? (lang === "zh" ? "匿名" : "Anonymous") : (user?.institution + " · " + user?.mbti),
      privacyMode: composerPrivacy,
      category: "trending",
      content: newPost,
      likes: 0,
      comments: 0,
      timeMinutes: 0,
      liked: false,
    };
    setPosts(prev => [newPostObj, ...prev]);
    setNewPost("");
    setComposerOpen(false);
    toast.success(t("feed.post.success"));
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
              UniGo<span className="text-neon-coral"> HK</span>
            </span>
          </a>

          <nav className="flex-1 space-y-1">
            <a href="/feed" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neon-coral/10 text-neon-coral font-medium text-sm">
              <Home className="w-4 h-4" /> {t("feed.nav.feed")}
            </a>
            <a href="/dating" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm">
              <HeartHandshake className="w-4 h-4" /> {t("feed.nav.dating")}
            </a>
            <a href="/tools" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm">
              <Wrench className="w-4 h-4" /> {t("feed.nav.tools")}
            </a>
            <a href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm">
              <User className="w-4 h-4" /> {t("feed.nav.profile")}
            </a>
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
        <main className="flex-1 min-h-screen pb-20 lg:pb-0">
          {/* Mobile top bar */}
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neon-coral flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display text-base font-bold text-foreground">UniGo<span className="text-neon-coral"> HK</span></span>
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
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t("feed.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-neon-coral focus:ring-2 focus:ring-neon-coral/20 outline-none transition-all"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setCategory(cat.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      category === cat.key
                        ? "bg-neon-coral text-white"
                        : "bg-muted text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Compose button */}
            <button
              onClick={() => setComposerOpen(true)}
              className="w-full mb-6 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm text-muted-foreground">{t("feed.compose.placeholder")}</span>
            </button>

            {/* Composer modal */}
            <AnimatePresence>
              {composerOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                  onClick={() => setComposerOpen(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="w-full max-w-lg bg-card rounded-2xl border border-border p-5 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-bold text-foreground">{t("feed.compose.title")}</h3>
                      <button onClick={() => setComposerOpen(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="flex gap-2 mb-4">
                      {(["ghost", "campus", "major"] as PrivacyMode[]).map((mode) => {
                        const Icon = privacyIcons[mode];
                        return (
                          <button
                            key={mode}
                            onClick={() => setComposerPrivacy(mode)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                              composerPrivacy === mode ? privacyColors[mode] + " ring-2 ring-current/20" : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            {t(`feed.privacy.${mode}`)}
                          </button>
                        );
                      })}
                    </div>

                    <textarea
                      value={newPost}
                      onChange={(e) => setNewPost(e.target.value)}
                      placeholder={t("feed.compose.placeholder")}
                      className="w-full h-32 p-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:border-neon-coral focus:ring-2 focus:ring-neon-coral/20 outline-none"
                      autoFocus
                    />

                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={handlePost}
                        disabled={!newPost.trim()}
                        className="bg-neon-coral hover:bg-neon-coral/90 text-white"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {t("feed.compose.submit")}
                      </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Posts */}
            <div className="space-y-4">
              {currentPosts.map((post, i) => {
                const Icon = privacyIcons[post.privacyMode];
                return (
                  <motion.article
                    key={post.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-5 rounded-xl border border-border bg-card hover:border-border/80 transition-all"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${privacyColors[post.privacyMode]}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{post.authorTag}</span>
                        <span className="text-xs text-muted-foreground ml-2">· {formatTimeAgo(post.timeMinutes, lang)}</span>
                      </div>
                    </div>

                    <p className="text-sm text-foreground leading-relaxed mb-4">{post.content}</p>

                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs transition-colors ${
                          post.liked ? "text-neon-coral" : "text-muted-foreground hover:text-neon-coral"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${post.liked ? "fill-current" : ""}`} />
                        {post.likes}
                      </button>
                      <button
                        onClick={() => toast(t("common.coming_soon"))}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-neon-cyan transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {post.comments}
                      </button>
                      <button
                        onClick={() => toast(t("common.coming_soon"))}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral">
            <Home className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t("feed.nav.feed")}</span>
          </a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <HeartHandshake className="w-5 h-5" />
            <span className="text-[10px]">{t("feed.nav.dating")}</span>
          </a>
          <a href="/tools" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <Wrench className="w-5 h-5" />
            <span className="text-[10px]">{t("feed.nav.tools")}</span>
          </a>
          <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground">
            <User className="w-5 h-5" />
            <span className="text-[10px]">{t("feed.nav.profile")}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
