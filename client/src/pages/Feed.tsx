import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, MessageCircle, Heart, Share2, TrendingUp, BookOpen, Compass,
  DollarSign, Send, Ghost, School, GraduationCap, Plus, Search,
  LogOut, User, Globe, Moon, Sun, Home, HeartHandshake, Wrench, X, Flame,
  ChevronDown, ChevronUp, BarChart3, Trash2, ImagePlus, Flag, MoreVertical, Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { getPosts, createPost, togglePostLike, votePoll, getComments, addComment, deleteComment, deletePost, reportPost } from "@/lib/feed";

type Category = "all" | "trending" | "confessions" | "non-jupas" | "mbti" | "missed" | "salary" | "hku" | "cuhk" | "hkust" | "polyu" | "cityu" | "hkbu" | "exam" | "intern" | "relationship" | "housing";
type PrivacyMode = "ghost" | "campus" | "major";

const REACTION_EMOJIS = [
  { emoji: "❤️", key: "heart" },
  { emoji: "😂", key: "laugh" },
  { emoji: "😮", key: "wow" },
  { emoji: "😢", key: "sad" },
  { emoji: "😡", key: "angry" },
  { emoji: "🔥", key: "fire" },
];

// Anonymous avatar system — random cute animal per post
const ANON_ANIMALS = [
  { zh: "柴犬", en: "Shiba", emoji: "🐕" }, { zh: "水獺", en: "Otter", emoji: "🦦" },
  { zh: "貓咪", en: "Cat", emoji: "🐱" }, { zh: "兔子", en: "Bunny", emoji: "🐰" },
  { zh: "企鵝", en: "Penguin", emoji: "🐧" }, { zh: "熊貓", en: "Panda", emoji: "🐼" },
  { zh: "刺蝟", en: "Hedgehog", emoji: "🦔" }, { zh: "狐狸", en: "Fox", emoji: "🦊" },
  { zh: "浣熊", en: "Raccoon", emoji: "🦝" }, { zh: "倉鼠", en: "Hamster", emoji: "🐹" },
  { zh: "樹懶", en: "Sloth", emoji: "🦥" }, { zh: "鯨魚", en: "Whale", emoji: "🐳" },
  { zh: "小鹿", en: "Deer", emoji: "🦌" }, { zh: "考拉", en: "Koala", emoji: "🐨" },
];
const ANON_COLORS = ["藍色", "粉紅", "紫色", "橙色", "綠色", "金色", "銀色", "紅色"];
const ANON_COLORS_EN = ["Blue", "Pink", "Purple", "Orange", "Green", "Gold", "Silver", "Red"];
function getAnonAvatar(postId: string, lang: string) {
  // Deterministic from postId so same post always shows same avatar
  const hash = postId.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const animal = ANON_ANIMALS[Math.abs(hash) % ANON_ANIMALS.length];
  const colorIdx = Math.abs(hash >> 4) % ANON_COLORS.length;
  return {
    emoji: animal.emoji,
    name: lang === "zh" ? `${ANON_COLORS[colorIdx]}${animal.zh}` : `${ANON_COLORS_EN[colorIdx]} ${animal.en}`,
  };
}

interface Post {
  id: string; user_id?: string; author: string; authorTag: string; authorTag_en?: string;
  privacyMode: PrivacyMode; category: Category; content: string; image_url?: string;
  poll_question?: string; poll_options?: string[]; poll_votes?: Record<string, number>;
  poll_voters?: string[]; likes: number; comments: number; liked: boolean; created_at: string;
  reactions?: Record<string, number>;
  myReaction?: string;
}
interface Comment {
  id: string; user_id: string; author: string; authorTag: string; authorTag_en?: string;
  privacyMode: PrivacyMode; content: string; likes: number; created_at: string; isMe: boolean;
}

function formatTimeAgo(dateStr: string, lang: string): string {
  const minutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (minutes < 1) return lang === "zh" ? "剛剛" : "Just now";
  if (minutes < 60) return lang === "zh" ? `${minutes}分鐘前` : `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return lang === "zh" ? `${hours}小時前` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return lang === "zh" ? `${days}日前` : `${days}d ago`;
  return lang === "zh" ? `${Math.floor(days / 7)}週前` : `${Math.floor(days / 7)}w ago`;
}

const privacyIcons: Record<PrivacyMode, typeof Ghost> = { ghost: Ghost, campus: School, major: GraduationCap };
const privacyColors: Record<PrivacyMode, string> = { ghost: "bg-muted text-muted-foreground", campus: "bg-neon-emerald/10 text-neon-emerald", major: "bg-neon-coral/10 text-neon-coral" };

function CommentSection({ postId, lang }: { postId: string; lang: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [privacy, setPrivacy] = useState<PrivacyMode>("ghost");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getComments(postId).then(data => { if (data.comments) setComments(data.comments); }).catch(() => {}).finally(() => setLoading(false));
  }, [postId]);

  const handleSubmit = async () => {
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await addComment(postId, newComment.trim(), privacy);
      if (data.comment) {
        const fresh = await getComments(postId);
        if (fresh.comments) setComments(fresh.comments);
        setNewComment("");
        toast.success(lang === "zh" ? "留言已發布" : "Comment posted");
      }
    } catch { toast.error(lang === "zh" ? "發布失敗" : "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (commentId: string) => {
    try { await deleteComment(commentId, postId); setComments(prev => prev.filter(c => c.id !== commentId)); toast.success(lang === "zh" ? "已刪除" : "Deleted"); }
    catch { toast.error(lang === "zh" ? "刪除失敗" : "Failed"); }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      {loading ? (
        <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {comments.length > 0 ? (
            <div className="space-y-3 mb-3">
              {comments.map(c => {
                const Icon = privacyIcons[c.privacyMode];
                return (
                  <div key={c.id} className="flex gap-2.5">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${privacyColors[c.privacyMode]}`}><Icon className="w-3 h-3" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-foreground">{lang === "zh" ? c.authorTag : (c.authorTag_en || c.authorTag)}</span>
                        <span className="text-[10px] text-muted-foreground">{formatTimeAgo(c.created_at, lang)}</span>
                        {c.isMe && <button onClick={() => handleDelete(c.id)} className="ml-auto text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>}
                      </div>
                      <p className="text-sm text-foreground mt-0.5">{c.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2 mb-2">{lang === "zh" ? "暫無留言，做第一個留言嘅人！" : "No comments yet. Be the first!"}</p>
          )}
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <div className="flex gap-1.5 mb-1.5">
                {(["ghost", "campus", "major"] as PrivacyMode[]).map(m => {
                  const I = privacyIcons[m];
                  const label = m === "ghost" ? (lang === "zh" ? "匿名" : "Anon") : m === "campus" ? (lang === "zh" ? "校園" : "School") : (lang === "zh" ? "學科" : "Major");
                  return <button key={m} onClick={() => setPrivacy(m)} className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${privacy === m ? privacyColors[m] + " ring-1 ring-current/20" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}><I className="w-2.5 h-2.5" />{label}</button>;
                })}
              </div>
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSubmit()}
                placeholder={lang === "zh" ? "寫留言..." : "Write a comment..."} className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-neon-coral/30" />
            </div>
            <Button onClick={handleSubmit} disabled={!newComment.trim() || submitting} size="sm" className="bg-neon-coral hover:bg-neon-coral/90 text-white rounded-lg h-9 px-3"><Send className="w-3.5 h-3.5" /></Button>
          </div>
        </>
      )}
    </div>
  );
}

function PollDisplay({ post, lang, userId, onVote }: { post: Post; lang: string; userId?: string; onVote: (id: string, idx: number) => void }) {
  const options = post.poll_options || [];
  const votes = post.poll_votes || {};
  const voters = post.poll_voters || [];
  const hasVoted = userId ? voters.includes(userId) : false;
  const totalVotes = Object.values(votes).reduce((s: number, v: any) => s + (Number(v) || 0), 0);
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm font-medium text-foreground flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5 text-neon-lavender" />{post.poll_question}</p>
      {options.map((opt: string, idx: number) => {
        const count = Number(votes[String(idx)] || 0);
        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return (
          <button key={idx} onClick={() => !hasVoted && onVote(post.id, idx)} disabled={hasVoted}
            className={`w-full text-left rounded-xl border p-3 transition-all relative overflow-hidden ${hasVoted ? "border-border cursor-default" : "border-border hover:border-neon-lavender/40 cursor-pointer"}`}>
            {hasVoted && <div className="absolute inset-y-0 left-0 bg-neon-lavender/10 transition-all" style={{ width: `${pct}%` }} />}
            <div className="relative flex items-center justify-between">
              <span className="text-sm text-foreground">{opt}</span>
              {hasVoted && <span className="text-xs font-medium text-muted-foreground">{pct}%</span>}
            </div>
          </button>
        );
      })}
      <p className="text-[10px] text-muted-foreground text-center">{totalVotes} {lang === "zh" ? "票" : "votes"}{hasVoted ? (lang === "zh" ? " · 已投票" : " · Voted") : ""}</p>
    </div>
  );
}

export default function Feed() {
  const [category, setCategory] = useState<Category>("all");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerPrivacy, setComposerPrivacy] = useState<PrivacyMode>("ghost");
  const [composerCategory, setComposerCategory] = useState<Category>("trending");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [isPoll, setIsPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postImagePreview, setPostImagePreview] = useState<string | null>(null);
  const feedImageRef = useRef<HTMLInputElement>(null);
  const { user, isLoggedIn, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  const fetchPosts = useCallback(() => {
    setLoading(true);
    getPosts(category).then(data => { if (data.posts) setPosts(data.posts); }).catch(() => {}).finally(() => setLoading(false));
  }, [category]);
  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const filteredPosts = searchQuery ? posts.filter(p => p.content.toLowerCase().includes(searchQuery.toLowerCase())) : posts;

  const [boardTab, setBoardTab] = useState<"topics" | "schools">("topics");

  const topicCategories = [
    { key: "all" as Category, label: t("feed.cat.all"), icon: TrendingUp },
    { key: "trending" as Category, label: t("feed.cat.trending"), icon: TrendingUp },
    { key: "confessions" as Category, label: t("feed.cat.confessions"), icon: Flame },
    { key: "non-jupas" as Category, label: "Non-JUPAS", icon: BookOpen },
    { key: "mbti" as Category, label: "MBTI", icon: Compass },
    { key: "missed" as Category, label: t("feed.cat.missed"), icon: HeartHandshake },
    { key: "salary" as Category, label: t("feed.cat.salary"), icon: DollarSign },
    { key: "exam" as Category, label: lang === "zh" ? "考試攻略" : "Exams", icon: BookOpen },
    { key: "intern" as Category, label: lang === "zh" ? "實習分享" : "Internships", icon: GraduationCap },
    { key: "relationship" as Category, label: lang === "zh" ? "感情事" : "Relationships", icon: HeartHandshake },
    { key: "housing" as Category, label: lang === "zh" ? "住宿" : "Housing", icon: Home },
  ];
  const schoolCategories = [
    { key: "hku" as Category, label: "HKU", icon: School },
    { key: "cuhk" as Category, label: "CUHK", icon: School },
    { key: "hkust" as Category, label: "HKUST", icon: School },
    { key: "polyu" as Category, label: "PolyU", icon: School },
    { key: "cityu" as Category, label: "CityU", icon: School },
    { key: "hkbu" as Category, label: "HKBU", icon: School },
  ];
  const categories = boardTab === "schools" ? schoolCategories : topicCategories;

  const handleLike = async (id: string) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
    try { await togglePostLike(id); } catch { setPosts(prev => prev.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p)); }
  };

  const handleVotePoll = async (postId: string, optionIndex: number) => {
    try {
      const data = await votePoll(postId, optionIndex);
      if (data.poll_votes) setPosts(prev => prev.map(p => p.id === postId ? { ...p, poll_votes: data.poll_votes, poll_voters: [...(p.poll_voters || []), user?.id || ''] } : p));
    } catch { toast.error(lang === "zh" ? "投票失敗" : "Vote failed"); }
  };

  const handlePost = async () => {
    if (!newPost.trim() && !pollQuestion.trim() && !postImage) return;
    try {
      const postData: any = { content: newPost, category: composerCategory, privacy_mode: composerPrivacy };
      if (postImage) postData.image_url = postImage;
      if (isPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2) {
        postData.poll_question = pollQuestion;
        postData.poll_options = pollOptions.filter(o => o.trim());
      }
      const data = await createPost(postData);
      if (data.post) { toast.success(t("feed.post.success")); setNewPost(""); setComposerOpen(false); setIsPoll(false); setPollQuestion(""); setPollOptions(["", ""]); setPostImage(null); setPostImagePreview(null); fetchPosts(); }
    } catch { toast.error(lang === "zh" ? "發布失敗" : "Post failed"); }
  };

  const handleFeedImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error(lang === "zh" ? "圖片不能超過 5MB" : "Image must be under 5MB"); return; }
    setPostImagePreview(URL.createObjectURL(file));
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > 1200 || h > 1200) { const r = Math.min(1200 / w, 1200 / h); w *= r; h *= r; }
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        setPostImage(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggleComments = (postId: string) => setExpandedComments(prev => { const n = new Set(prev); if (n.has(postId)) n.delete(postId); else n.add(postId); return n; });

  if (!isLoggedIn) { setLocation("/login"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-card/50 p-4">
          <a href="/" className="flex items-center gap-2.5 mb-8 px-2"><div className="w-8 h-8 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-4.5 h-4.5 text-white" /></div><span className="font-display text-lg font-bold tracking-tight text-foreground">UniGo<span className="text-neon-coral"> HK</span></span></a>
          <nav className="flex-1 space-y-1">
            <a href="/feed" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neon-coral/10 text-neon-coral font-medium text-sm"><Home className="w-4 h-4" /> {t("feed.nav.feed")}</a>
            <a href="/dating" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><HeartHandshake className="w-4 h-4" /> {t("feed.nav.dating")}</a>
            <a href="/plaza" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><Box className="w-4 h-4" /> {lang === "zh" ? "3D 廣場" : "3D Plaza"}</a>
            <a href="/tools" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><Wrench className="w-4 h-4" /> {t("feed.nav.tools")}</a>
            <a href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><User className="w-4 h-4" /> {t("feed.nav.profile")}</a>
          </nav>
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2 px-2">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}><Globe className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            </div>
            <button onClick={() => { logout(); setLocation("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm w-full"><LogOut className="w-4 h-4" /> {t("feed.nav.logout")}</button>
          </div>
        </aside>

        <main className="flex-1 min-h-screen pb-20 lg:pb-0">
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div><span className="font-display text-base font-bold text-foreground">UniGo<span className="text-neon-coral"> HK</span></span></a>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}><Globe className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder={t("feed.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-neon-coral focus:ring-2 focus:ring-neon-coral/20 outline-none transition-all" />
            </div>

            {/* Board tabs */}
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setBoardTab("topics"); setCategory("all"); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${boardTab === "topics" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {lang === "zh" ? "💬 話題版" : "💬 Topics"}
              </button>
              <button onClick={() => { setBoardTab("schools"); setCategory("hku"); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${boardTab === "schools" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                {lang === "zh" ? "🏫 學校版" : "🏫 Schools"}
              </button>
            </div>

            <div className="relative">
              <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2 scrollbar-hide pr-8">
                {categories.map((cat) => { const Icon = cat.icon; return (
                  <button key={cat.key} onClick={() => setCategory(cat.key)} className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap flex-shrink-0 transition-all ${category === cat.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}><Icon className="w-3.5 h-3.5" />{cat.label}</button>
              ); })}
              </div>
              <div className="absolute right-0 top-0 bottom-2 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            </div>

            <button onClick={() => setComposerOpen(true)} className="w-full mb-6 p-4 rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors text-left flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center"><Plus className="w-4 h-4 text-muted-foreground" /></div>
              <span className="text-sm text-muted-foreground">{t("feed.compose.placeholder")}</span>
            </button>

            {/* Composer */}
            <AnimatePresence>
              {composerOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setComposerOpen(false)}>
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="w-full max-w-lg bg-card rounded-2xl border border-border p-5 shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-display font-bold text-foreground">{t("feed.compose.title")}</h3>
                      <button onClick={() => setComposerOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="flex gap-2 mb-3">
                      {(["ghost", "campus", "major"] as PrivacyMode[]).map((mode) => { const Icon = privacyIcons[mode]; return (
                        <button key={mode} onClick={() => setComposerPrivacy(mode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${composerPrivacy === mode ? privacyColors[mode] + " ring-2 ring-current/20" : "bg-muted text-muted-foreground"}`}><Icon className="w-3 h-3" />{t(`feed.privacy.${mode}`)}</button>
                      ); })}
                    </div>
                    <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                      {categories.filter(c => c.key !== "all").map(cat => (
                        <button key={cat.key} onClick={() => setComposerCategory(cat.key)} className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${composerCategory === cat.key ? "bg-neon-coral/15 text-neon-coral" : "bg-muted text-muted-foreground"}`}>{cat.label}</button>
                      ))}
                    </div>
                    <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder={t("feed.compose.placeholder")}
                      className="w-full h-28 p-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:border-neon-coral focus:ring-2 focus:ring-neon-coral/20 outline-none" autoFocus />
                    <div className="flex items-center gap-3 mt-3">
                      <input ref={feedImageRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFeedImage} />
                      <button onClick={() => feedImageRef.current?.click()} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${postImage ? "bg-neon-cyan/15 text-neon-cyan ring-1 ring-neon-cyan/30" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                        <ImagePlus className="w-3 h-3" />{lang === "zh" ? "相片" : "Photo"}
                      </button>
                      <button onClick={() => setIsPoll(!isPoll)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isPoll ? "bg-neon-lavender/15 text-neon-lavender ring-1 ring-neon-lavender/30" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                        <BarChart3 className="w-3 h-3" />{lang === "zh" ? "投票" : "Poll"}
                      </button>
                    </div>
                    {/* Image preview */}
                    {postImagePreview && (
                      <div className="relative mt-3 rounded-xl overflow-hidden border border-border">
                        <img src={postImagePreview} alt="" className="w-full max-h-48 object-cover" />
                        <button onClick={() => { setPostImage(null); setPostImagePreview(null); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                    <AnimatePresence>
                      {isPoll && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-3 p-3 rounded-xl border border-neon-lavender/20 bg-neon-lavender/5 space-y-2">
                            <input type="text" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} placeholder={lang === "zh" ? "投票問題" : "Poll question"}
                              className="w-full bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-neon-lavender" />
                            {pollOptions.map((opt, i) => (
                              <div key={i} className="flex gap-2">
                                <input type="text" value={opt} onChange={e => { const n = [...pollOptions]; n[i] = e.target.value; setPollOptions(n); }}
                                  placeholder={`${lang === "zh" ? "選項" : "Option"} ${i + 1}`}
                                  className="flex-1 bg-background rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none border border-border focus:border-neon-lavender" />
                                {pollOptions.length > 2 && <button onClick={() => setPollOptions(prev => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>}
                              </div>
                            ))}
                            {pollOptions.length < 6 && <button onClick={() => setPollOptions(prev => [...prev, ""])} className="text-xs text-neon-lavender hover:text-neon-lavender/80 font-medium">+ {lang === "zh" ? "新增選項" : "Add option"}</button>}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex justify-end mt-4">
                      <Button onClick={handlePost} disabled={!newPost.trim() && !(isPoll && pollQuestion.trim()) && !postImage} className="bg-neon-coral hover:bg-neon-coral/90 text-white"><Send className="w-4 h-4 mr-2" />{t("feed.compose.submit")}</Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Posts */}
            {loading ? (
              <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-neon-coral border-t-transparent rounded-full animate-spin" /></div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border border-border bg-card"><MessageCircle className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" /><p className="text-foreground font-medium">{lang === "zh" ? "暫無帖子" : "No posts yet"}</p><p className="text-sm text-muted-foreground mt-1">{lang === "zh" ? "做第一個發帖嘅人！" : "Be the first to post!"}</p></div>
            ) : (
              <div className="space-y-5">
                {filteredPosts.map((post, i) => {
                  const commentsOpen = expandedComments.has(post.id);
                  const anon = post.privacyMode === "ghost" ? getAnonAvatar(post.id, lang) : null;
                  const Icon = privacyIcons[post.privacyMode];
                  return (
                    <motion.article key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      className="p-6 rounded-xl border border-border bg-card hover:border-border/80 transition-all">
                      <div className="flex items-center gap-2.5 mb-4">
                        {anon ? (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-base">{anon.emoji}</div>
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${privacyColors[post.privacyMode]}`}><Icon className="w-3.5 h-3.5" /></div>
                        )}
                        <div>
                          <span className="text-sm font-medium text-foreground">{anon ? anon.name : (lang === "zh" ? post.authorTag : (post.authorTag_en || post.authorTag))}</span>
                          <span className="text-xs text-muted-foreground ml-2">· {formatTimeAgo(post.created_at, lang)}</span>
                        </div>
                        <div className="ml-auto flex items-center gap-1">
                          {post.user_id === user?.id && (
                            <button onClick={async () => { if (confirm(lang === "zh" ? "確定刪除此帖子？" : "Delete this post?")) { try { await deletePost(post.id); setPosts(prev => prev.filter(p => p.id !== post.id)); toast.success(lang === "zh" ? "已刪除" : "Deleted"); } catch { toast.error(lang === "zh" ? "刪除失敗" : "Failed"); } } }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          )}
                          {post.user_id !== user?.id && (
                            <button onClick={async () => { const reason = prompt(lang === "zh" ? "舉報原因（可選）：" : "Reason (optional):"); try { await reportPost(post.id, reason || ""); toast.success(lang === "zh" ? "已舉報" : "Reported"); } catch { toast.error(lang === "zh" ? "舉報失敗" : "Failed"); } }}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"><Flag className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed mb-4 whitespace-pre-wrap">{post.content}</p>
                      {post.image_url && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-border">
                          <img src={post.image_url} alt="" className="w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity" onClick={() => window.open(post.image_url, '_blank')} />
                        </div>
                      )}
                      {post.poll_question && post.poll_options && <PollDisplay post={post} lang={lang} userId={user?.id} onVote={handleVotePoll} />}
                      {/* Multi-reactions */}
                      <div className="flex items-center gap-1 mt-3 flex-wrap">
                        {REACTION_EMOJIS.map(r => {
                          const count = post.reactions?.[r.key] || 0;
                          const isMine = post.myReaction === r.key;
                          return (
                            <button key={r.key} onClick={() => {
                              setPosts(prev => prev.map(p => {
                                if (p.id !== post.id) return p;
                                const reactions = { ...(p.reactions || {}) };
                                const wasMyReaction = p.myReaction === r.key;
                                if (wasMyReaction) {
                                  reactions[r.key] = Math.max((reactions[r.key] || 1) - 1, 0);
                                  return { ...p, reactions, myReaction: undefined, likes: Math.max(p.likes - 1, 0) };
                                } else {
                                  if (p.myReaction) reactions[p.myReaction] = Math.max((reactions[p.myReaction] || 1) - 1, 0);
                                  reactions[r.key] = (reactions[r.key] || 0) + 1;
                                  return { ...p, reactions, myReaction: r.key, likes: p.myReaction ? p.likes : p.likes + 1 };
                                }
                              }));
                              handleLike(post.id).catch(() => {});
                            }}
                              className={`flex items-center gap-0.5 px-2 py-1 rounded-full text-xs transition-all ${isMine ? "bg-primary/10 border border-primary/30 scale-105" : count > 0 ? "bg-muted border border-transparent" : "bg-transparent border border-transparent hover:bg-muted"}`}>
                              <span className="text-sm">{r.emoji}</span>
                              {count > 0 && <span className={`text-[10px] font-medium ${isMine ? "text-primary" : "text-muted-foreground"}`}>{count}</span>}
                            </button>
                          );
                        })}
                        <div className="flex-1" />
                        <button onClick={() => toggleComments(post.id)} className={`flex items-center gap-1.5 text-xs transition-colors ${commentsOpen ? "text-neon-cyan" : "text-muted-foreground hover:text-neon-cyan"}`}>
                          <MessageCircle className={`w-4 h-4 ${commentsOpen ? "fill-current" : ""}`} />{post.comments}
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(post.content); toast.success(lang === "zh" ? "已複製" : "Copied"); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"><Share2 className="w-4 h-4" /></button>
                      </div>
                      <AnimatePresence>
                        {commentsOpen && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <CommentSection postId={post.id} lang={lang} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.article>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral"><Home className="w-5 h-5" /><span className="text-[10px] font-medium">{t("feed.nav.feed")}</span></a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><HeartHandshake className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.dating")}</span></a>
          <a href="/plaza" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Box className="w-5 h-5" /><span className="text-[10px]">{lang === "zh" ? "廣場" : "Plaza"}</span></a>
          <a href="/tools" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Wrench className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.tools")}</span></a>
          <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><User className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.profile")}</span></a>
        </div>
      </div>
    </div>
  );
}
