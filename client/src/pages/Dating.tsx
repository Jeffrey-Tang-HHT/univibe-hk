import { useState, useMemo, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, Heart, Sparkles, MessageCircle, Users, ChevronLeft, ChevronRight,
  Home, HeartHandshake, Wrench, User, Globe, Moon, Sun, LogOut,
  X, Settings, Eye, Zap, Send, ImageOff, MessageSquare, Plus, Trash2, Timer,
  Lock, Unlock, Coffee, Music, Camera, Palette, Dumbbell, Gamepad2,
  BookOpen, Plane, ChefHat, Film, Mic2, PenTool, Code, Mountain,
  Mic, CheckCheck, Smile, Square, Play, UserX, MoreVertical,
  Reply, Copy, CornerUpLeft, ShieldAlert, Flag, Bell, Upload, ImagePlus, Star, Crown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { createMatch, getMatches, getMessages, sendMessage, sendVoiceMessage, sendImageMessage, discoverProfiles, formatMessageTime, unmatch, deleteMessage, blockUser, reportUser, heartbeat, uploadAvatar, deletePhoto, getOnlineStatus, likeUser, getLikedBy, getSuperLikesRemaining } from "@/lib/chat";

type DatingTab = "discover" | "matches" | "liked" | "profile";

interface MatchProfile {
  id: string;
  gender: "male" | "female" | "nonbinary";
  age: number;
  mbti: string;
  institution: string;
  faculty: string;
  major: string;
  district: string;
  relationshipType: string;
  religion: string;
  interests: string[];
  bio: string;
  blurLevel: number;
  messages: number;
  sexuality: string;
  compatibility: number;
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
  icebreakers?: { prompt: string; answer: string }[];
  matchedAt?: number;
  avatar_url?: string;
  photos?: string[];
  last_seen?: string;
}

const SEXUALITY_OPTIONS = [
  { key: "straight", zh: "異性戀", en: "Straight" },
  { key: "gay", zh: "男同性戀", en: "Gay" },
  { key: "lesbian", zh: "女同性戀", en: "Lesbian" },
  { key: "bisexual", zh: "雙性戀", en: "Bisexual" },
  { key: "pansexual", zh: "泛性戀", en: "Pansexual" },
  { key: "asexual", zh: "無性戀", en: "Asexual" },
  { key: "queer", zh: "酷兒", en: "Queer" },
  { key: "other_s", zh: "其他", en: "Other" },
  { key: "unsure", zh: "未確定", en: "Unsure" },
];

const INSTITUTION_OPTIONS = [
  { key: "HKU", zh: "香港大學", en: "HKU" },
  { key: "CUHK", zh: "中文大學", en: "CUHK" },
  { key: "HKUST", zh: "科技大學", en: "HKUST" },
  { key: "PolyU", zh: "理工大學", en: "PolyU" },
  { key: "CityU", zh: "城市大學", en: "CityU" },
  { key: "HKBU", zh: "浸會大學", en: "HKBU" },
  { key: "LingU", zh: "嶺南大學", en: "LU" },
  { key: "EdUHK", zh: "教育大學", en: "EdUHK" },
  { key: "other_i", zh: "其他", en: "Others" },
];

const FACULTY_OPTIONS = [
  { key: "Architecture", zh: "建築", en: "Architecture" },
  { key: "Arts", zh: "文學", en: "Arts" },
  { key: "Business", zh: "商學", en: "Business" },
  { key: "Dentistry", zh: "牙醫", en: "Dentistry" },
  { key: "Education", zh: "教育", en: "Education" },
  { key: "Engineering", zh: "工程", en: "Engineering" },
  { key: "Law", zh: "法律", en: "Law" },
  { key: "Medicine", zh: "醫學", en: "Medicine" },
  { key: "Science", zh: "理學", en: "Science" },
  { key: "Social Sciences", zh: "社會科學", en: "Social Sciences" },
  { key: "Creative Media", zh: "創意媒體", en: "Creative Media" },
  { key: "Design", zh: "設計", en: "Design" },
  { key: "Journalism", zh: "新聞", en: "Journalism" },
  { key: "Translation", zh: "翻譯", en: "Translation" },
  { key: "other_f", zh: "其他", en: "Other" },
];

const DISTRICT_OPTIONS = [
  { key: "central_western", zh: "中西區", en: "Central & Western" },
  { key: "eastern", zh: "東區", en: "Eastern" },
  { key: "southern", zh: "南區", en: "Southern" },
  { key: "wan_chai", zh: "灣仔區", en: "Wan Chai" },
  { key: "kowloon_city", zh: "九龍城區", en: "Kowloon City" },
  { key: "kwun_tong", zh: "觀塘區", en: "Kwun Tong" },
  { key: "sham_shui_po", zh: "深水埗區", en: "Sham Shui Po" },
  { key: "wong_tai_sin", zh: "黃大仙區", en: "Wong Tai Sin" },
  { key: "yau_tsim_mong", zh: "油尖旺區", en: "Yau Tsim Mong" },
  { key: "kwai_tsing", zh: "葵青區", en: "Kwai Tsing" },
  { key: "north", zh: "北區", en: "North" },
  { key: "sai_kung", zh: "西貢區", en: "Sai Kung" },
  { key: "sha_tin", zh: "沙田區", en: "Sha Tin" },
  { key: "tai_po", zh: "大埔區", en: "Tai Po" },
  { key: "tsuen_wan", zh: "荃灣區", en: "Tsuen Wan" },
  { key: "tuen_mun", zh: "屯門區", en: "Tuen Mun" },
  { key: "yuen_long", zh: "元朗區", en: "Yuen Long" },
  { key: "islands", zh: "離島區", en: "Islands" },
];

const RELATIONSHIP_OPTIONS = [
  { key: "long_term", zh: "長期關係", en: "Long-term" },
  { key: "short_term", zh: "短期關係", en: "Short-term" },
  { key: "casual", zh: "隨意交往", en: "Casual" },
  { key: "friends_first", zh: "先做朋友", en: "Friends first" },
  { key: "not_sure", zh: "未確定", en: "Not sure yet" },
];

const RELIGION_OPTIONS = [
  { key: "none", zh: "無宗教", en: "None" },
  { key: "christian", zh: "基督教", en: "Christian" },
  { key: "catholic", zh: "天主教", en: "Catholic" },
  { key: "buddhist", zh: "佛教", en: "Buddhist" },
  { key: "taoist", zh: "道教", en: "Taoist" },
  { key: "muslim", zh: "伊斯蘭教", en: "Muslim" },
  { key: "hindu", zh: "印度教", en: "Hindu" },
  { key: "spiritual", zh: "有靈性信仰", en: "Spiritual" },
  { key: "other_r", zh: "其他", en: "Other" },
  { key: "prefer_not_to_say_r", zh: "不願透露", en: "Prefer not to say" },
];

const AGE_OPTIONS = [
  { key: "18-20", zh: "18-20歲", en: "18-20" },
  { key: "21-23", zh: "21-23歲", en: "21-23" },
  { key: "24-26", zh: "24-26歲", en: "24-26" },
  { key: "27+", zh: "27歲以上", en: "27+" },
];

const ICEBREAKER_PROMPTS = [
  { key: "food_opinion", zh: "我最有爭議嘅食物觀點係...", en: "My most controversial food opinion is..." },
  { key: "perfect_date", zh: "我理想嘅約會係...", en: "My perfect first date would be..." },
  { key: "useless_talent", zh: "我最冇用嘅特長係...", en: "My most useless talent is..." },
  { key: "guilty_pleasure", zh: "我嘅秘密guilty pleasure係...", en: "My guilty pleasure is..." },
  { key: "hill_to_die", zh: "我會死守嘅一個觀點係...", en: "A hill I will die on..." },
  { key: "worst_pickup", zh: "我聽過最差嘅pickup line係...", en: "The worst pickup line I've heard..." },
  { key: "superpower", zh: "如果我有一個超能力...", en: "If I had one superpower..." },
  { key: "red_flag", zh: "我嘅green flag係...", en: "My biggest green flag is..." },
  { key: "3am_thought", zh: "我凌晨3點會諗嘅問題係...", en: "The question that keeps me up at 3am..." },
  { key: "exam_stress", zh: "我考試壓力最大嗰時會...", en: "When exam stress hits, I..." },
];

const MOCK_PROFILES: MatchProfile[] = [
  { id: "m1", gender: "female", age: 21, mbti: "INFJ", institution: "HKU", faculty: "Social Sciences", major: "Psychology", district: "central_western", relationshipType: "long_term", religion: "none", interests: ["Reading", "Hiking", "Coffee"], bio: "鍾意行山同飲咖啡，搵緊一個可以一齊傾通宵嘅人 ☕", blurLevel: 30, messages: 0, sexuality: "bisexual", compatibility: 92, icebreakers: [{ prompt: "food_opinion", answer: "菠蘿放喺pizza上面係正確嘅 🍍" }, { prompt: "3am_thought", answer: "如果平行宇宙存在，另一個我係咪已經搵到soulmate？" }] },
  { id: "m2", gender: "male", age: 22, mbti: "ENTP", institution: "CUHK", faculty: "Business", major: "Business", district: "sha_tin", relationshipType: "casual", religion: "christian", interests: ["Debate", "Travel", "Music"], bio: "辯論隊嘅，鍾意周圍去旅行，識到新朋友最開心 🌍", blurLevel: 0, messages: 0, sexuality: "straight", compatibility: 87, icebreakers: [{ prompt: "useless_talent", answer: "可以用兩隻手同時寫唔同嘅字 ✌️" }] },
  { id: "m3", gender: "female", age: 20, mbti: "ISFP", institution: "PolyU", faculty: "Design", major: "Design", district: "kowloon_city", relationshipType: "friends_first", religion: "buddhist", interests: ["Art", "Photography", "Cooking"], bio: "設計系學生，平時鍾意影相同煮嘢食 📸", blurLevel: 60, messages: 12, sexuality: "pansexual", compatibility: 78, lastMessage: "你鍾意去邊度影相？", lastMessageTime: "2小時前", unread: 2, matchedAt: Date.now() - 2 * 60 * 60 * 1000 },
  { id: "m4", gender: "male", age: 24, mbti: "ENTJ", institution: "HKUST", faculty: "Engineering", major: "Engineering", district: "sai_kung", relationshipType: "long_term", religion: "none", interests: ["Coding", "Gym", "Anime"], bio: "工程系，放學就去做gym或者睇anime 💪", blurLevel: 100, messages: 25, sexuality: "gay", compatibility: 95, lastMessage: "今晚一齊食飯？", lastMessageTime: "30分鐘前", unread: 1, matchedAt: Date.now() - 30 * 60 * 1000 },
  { id: "m5", gender: "nonbinary", age: 23, mbti: "INFP", institution: "CityU", faculty: "Creative Media", major: "Creative Media", district: "kowloon_city", relationshipType: "not_sure", religion: "spiritual", interests: ["Writing", "Film", "Gaming"], bio: "文青一個，鍾意睇電影同打機 🎬", blurLevel: 15, messages: 3, sexuality: "queer", compatibility: 83, lastMessage: "你覺得呢套戲點？", lastMessageTime: "5小時前", unread: 0, matchedAt: Date.now() - 40 * 60 * 60 * 1000 },
  { id: "m6", gender: "female", age: 21, mbti: "ESTJ", institution: "HKBU", faculty: "Journalism", major: "Journalism", district: "kowloon_city", relationshipType: "short_term", religion: "catholic", interests: ["News", "Running", "Karaoke"], bio: "新聞系，鍾意跑步同唱K 🎤", blurLevel: 45, messages: 8, sexuality: "straight", compatibility: 71, lastMessage: "下次一齊去唱K！", lastMessageTime: "1日前", unread: 0, matchedAt: Date.now() - 47 * 60 * 60 * 1000 },
  { id: "m7", gender: "male", age: 22, mbti: "ENFJ", institution: "EdUHK", faculty: "Education", major: "Education", district: "tai_po", relationshipType: "long_term", religion: "christian", interests: ["Music", "Cooking", "Travel"], bio: "未來老師一個，鍾意彈結他同煮嘢食 🎸", blurLevel: 20, messages: 0, sexuality: "straight", compatibility: 88 },
  { id: "m8", gender: "male", age: 25, mbti: "ISTP", institution: "LingU", faculty: "Translation", major: "Translation", district: "tuen_mun", relationshipType: "casual", religion: "none", interests: ["Gaming", "Coffee", "Film"], bio: "翻譯系，安靜但打機好認真 🎮", blurLevel: 0, messages: 0, sexuality: "bisexual", compatibility: 75 },
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

// MBTI golden pairs (highest compatibility)
const MBTI_GOLDEN_PAIRS: Record<string, string[]> = {
  INFJ: ["ENTP", "ENFP"], ENFP: ["INFJ", "INTJ"], INFP: ["ENFJ", "ENTJ"], ENFJ: ["INFP", "ISFP"],
  INTJ: ["ENFP", "ENTP"], ENTJ: ["INFP", "INTP"], INTP: ["ENTJ", "ESTJ"], ENTP: ["INFJ", "INTJ"],
  ISFJ: ["ESFP", "ESTP"], ESFJ: ["ISFP", "ISTP"], ISTJ: ["ESFP", "ESTP"], ESTJ: ["INTP", "ISFP"],
  ISFP: ["ENFJ", "ESFJ", "ESTJ"], ESFP: ["ISFJ", "ISTJ"], ISTP: ["ESFJ", "ESTJ"], ESTP: ["ISFJ", "ISTJ"],
};
const MBTI_GOOD_PAIRS: Record<string, string[]> = {
  INFJ: ["INFP", "ENFJ"], ENFP: ["INFP", "ENFJ"], INFP: ["ENFP", "INFJ"], ENFJ: ["ENFP", "INFJ"],
  INTJ: ["ENTJ", "INTP"], ENTJ: ["INTJ", "ENTP"], INTP: ["INTJ", "ENTP"], ENTP: ["ENTJ", "INTP"],
  ISFJ: ["ISTJ", "ESFJ"], ESFJ: ["ISFJ", "ESTJ"], ISTJ: ["ISFJ", "ESTJ"], ESTJ: ["ISTJ", "ESFJ"],
  ISFP: ["ESFP", "ISTP"], ESFP: ["ISFP", "ESTP"], ISTP: ["ISFP", "ESTP"], ESTP: ["ESFP", "ISTP"],
};

function computeCompatibility(myProfile: { mbti: string; interests: string[]; institution?: string; district?: string; religion?: string }, other: MatchProfile) {
  const factors: { key: string; label_zh: string; label_en: string; score: number; max: number; emoji: string }[] = [];

  // MBTI pairing
  const golden = MBTI_GOLDEN_PAIRS[myProfile.mbti] || [];
  const good = MBTI_GOOD_PAIRS[myProfile.mbti] || [];
  let mbtiScore = 5;
  let mbtiLabel = { zh: "一般配對", en: "Neutral match" };
  if (golden.includes(other.mbti)) { mbtiScore = 25; mbtiLabel = { zh: "黃金配對 ✨", en: "Golden pair ✨" }; }
  else if (good.includes(other.mbti)) { mbtiScore = 18; mbtiLabel = { zh: "好配對", en: "Great match" }; }
  else if (myProfile.mbti === other.mbti) { mbtiScore = 15; mbtiLabel = { zh: "同類型", en: "Same type" }; }
  factors.push({ key: "mbti", label_zh: `MBTI ${mbtiLabel.zh}`, label_en: `MBTI ${mbtiLabel.en}`, score: mbtiScore, max: 25, emoji: "🧠" });

  // Shared interests
  const shared = myProfile.interests.filter(i => other.interests.includes(i));
  const interestScore = Math.min(shared.length * 10, 30);
  factors.push({ key: "interests", label_zh: `${shared.length} 個共同興趣`, label_en: `${shared.length} shared interests`, score: interestScore, max: 30, emoji: "🎯" });

  // Same institution
  const sameSchool = myProfile.institution && myProfile.institution === other.institution;
  factors.push({ key: "school", label_zh: sameSchool ? "同校" : "唔同校", label_en: sameSchool ? "Same school" : "Different school", score: sameSchool ? 15 : 0, max: 15, emoji: "🏫" });

  // Same district
  const sameDistrict = myProfile.district && myProfile.district === other.district;
  factors.push({ key: "district", label_zh: sameDistrict ? "同區" : "唔同區", label_en: sameDistrict ? "Same district" : "Different district", score: sameDistrict ? 10 : 0, max: 10, emoji: "📍" });

  // Same religion
  const sameReligion = myProfile.religion && myProfile.religion === other.religion && myProfile.religion !== "none";
  factors.push({ key: "religion", label_zh: sameReligion ? "相同信仰" : "信仰不同", label_en: sameReligion ? "Same faith" : "Different faith", score: sameReligion ? 5 : 0, max: 5, emoji: "🙏" });

  // Base
  factors.push({ key: "base", label_zh: "基礎分", label_en: "Base score", score: 15, max: 15, emoji: "💫" });

  const total = Math.min(factors.reduce((s, f) => s + f.score, 0), 100);
  return { total, factors, sharedInterests: shared };
}

function genderSign(g: "male" | "female" | "nonbinary") {
  if (g === "male") return <span className="text-blue-400">♂</span>;
  if (g === "female") return <span className="text-pink-400">♀</span>;
  return <span className="text-purple-400">⚧</span>;
}

function BlurredAvatar({ blurLevel, mbti, size = "lg", avatarUrl, photos }: { blurLevel: number; mbti: string; size?: "sm" | "md" | "lg"; avatarUrl?: string; photos?: string[] }) {
  const { t } = useLanguage();
  const clarity = blurLevel / 100;
  const blurPx = Math.max(0, 20 * (1 - clarity));
  const dim = size === "lg" ? "w-full aspect-[4/3]" : size === "md" ? "w-16 h-16" : "w-12 h-12";
  const hue1 = mbti.charCodeAt(0) * 20 % 360;
  const hue2 = (hue1 + 120) % 360;
  const hue3 = (hue1 + 60) % 360;

  // Build photos list from photos array or single avatarUrl
  const allPhotos = (photos && photos.length > 0) ? photos.filter(Boolean) : (avatarUrl ? [avatarUrl] : []);
  const hasPhotos = allPhotos.length > 0;
  const [photoIndex, setPhotoIndex] = useState(0);
  const touchStartX = useRef(0);
  const safeIndex = Math.min(photoIndex, Math.max(allPhotos.length - 1, 0));

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (allPhotos.length <= 1) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0 && safeIndex < allPhotos.length - 1) setPhotoIndex(safeIndex + 1);
      else if (diff < 0 && safeIndex > 0) setPhotoIndex(safeIndex - 1);
    }
  };

  return (
    <div className={`${dim} rounded-2xl overflow-hidden relative flex-shrink-0`}
      onTouchStart={size === "lg" ? handleTouchStart : undefined}
      onTouchEnd={size === "lg" ? handleTouchEnd : undefined}>
      {hasPhotos ? (
        <img src={allPhotos[safeIndex]} alt="" className="w-full h-full object-cover" style={{
          filter: `blur(${blurPx}px)`, transition: "filter 0.5s ease, opacity 0.3s ease", transform: "scale(1.1)",
        }} />
      ) : (
        <div className="w-full h-full" style={{
          background: `linear-gradient(135deg, hsl(${hue1}, 55%, 55%), hsl(${hue3}, 45%, 45%), hsl(${hue2}, 50%, 40%))`,
          filter: `blur(${blurPx}px)`, transition: "filter 0.5s ease", transform: "scale(1.1)",
        }} />
      )}
      {/* Only show MBTI text if NO photos uploaded */}
      {!hasPhotos && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-display font-bold text-white/80 ${size === "lg" ? "text-5xl" : size === "md" ? "text-lg" : "text-sm"}`}
            style={{ filter: `blur(${Math.max(0, blurPx * 0.6)}px)` }}>{mbti}</span>
        </div>
      )}
      {/* Photo dots indicator for lg size with multiple photos */}
      {size === "lg" && allPhotos.length > 1 && (
        <div className="absolute top-3 left-0 right-0 flex justify-center gap-1.5 z-10">
          {allPhotos.map((_, i) => (
            <button key={i} onClick={() => setPhotoIndex(i)}
              className={`h-1 rounded-full transition-all ${i === safeIndex ? "w-6 bg-white" : "w-1.5 bg-white/50"}`} />
          ))}
        </div>
      )}
      {/* Tap zones for lg size with multiple photos */}
      {size === "lg" && allPhotos.length > 1 && (
        <>
          <button className="absolute left-0 top-0 bottom-0 w-1/3 z-[5]" onClick={() => safeIndex > 0 && setPhotoIndex(safeIndex - 1)} />
          <button className="absolute right-0 top-0 bottom-0 w-1/3 z-[5]" onClick={() => safeIndex < allPhotos.length - 1 && setPhotoIndex(safeIndex + 1)} />
        </>
      )}
      {size === "lg" && (
        <div className={`absolute bottom-3 right-3 px-2.5 py-1 rounded-full text-white text-xs font-medium backdrop-blur-sm flex items-center gap-1.5 ${blurLevel >= 100 ? "bg-neon-emerald/80" : "bg-black/50"}`}>
          {blurLevel < 100 ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
          {blurLevel >= 100 ? t("dating.unlocked") : `${blurLevel}%`}
        </div>
      )}
    </div>
  );
}

type ChatMsg = { id?: string; text: string; isMe: boolean; time: string; type?: "text" | "gif" | "voice" | "image"; gifUrl?: string; imageUrl?: string; voiceDuration?: number; read?: boolean; replyTo?: string };

function ChatBubble({ msg, onDelete, onReply, onCopy, lang }: { msg: ChatMsg; onDelete?: (forBoth: boolean) => void; onReply?: () => void; onCopy?: () => void; lang: string }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteSub, setShowDeleteSub] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const playVoice = () => {
    if (playing) return;
    setPlaying(true);
    setProgress(0);
    const dur = (msg.voiceDuration || 5) * 1000;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= dur) { setPlaying(false); setProgress(0); return; }
      setProgress((elapsed / dur) * 100);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const startLongPress = () => {
    longPressTimer.current = setTimeout(() => { setShowMenu(true); setShowDeleteSub(false); }, 500);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const closeMenu = () => { setShowMenu(false); setShowDeleteSub(false); };

  return (
    <>
      {/* Backdrop to close menu */}
      {showMenu && <div className="fixed inset-0 z-40" onClick={closeMenu} />}
      <div className={`flex ${msg.isMe ? "justify-end" : "justify-start"} mb-3 relative`}>
        <div
          className={`max-w-[75%] relative select-none ${msg.type === "gif" || msg.type === "image" ? "rounded-2xl overflow-hidden" : `px-4 py-2.5 rounded-2xl ${msg.isMe ? "bg-neon-coral text-white rounded-br-md" : "bg-muted text-foreground rounded-bl-md"}`}`}
          onTouchStart={startLongPress}
          onTouchEnd={cancelLongPress}
          onTouchMove={cancelLongPress}
          onMouseDown={startLongPress}
          onMouseUp={cancelLongPress}
          onMouseLeave={cancelLongPress}
          onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); setShowDeleteSub(false); }}
        >
          {/* Reply preview */}
          {msg.replyTo && (
            <div className={`mb-1.5 px-2.5 py-1.5 rounded-lg border-l-2 ${msg.isMe ? "bg-white/10 border-white/40" : "bg-foreground/5 border-foreground/20"}`}>
              <p className={`text-[11px] truncate ${msg.isMe ? "text-white/70" : "text-muted-foreground"}`}>{msg.replyTo}</p>
            </div>
          )}
          {msg.type === "image" && msg.imageUrl ? (
            <div className="relative">
              <img src={msg.imageUrl} alt="" className="max-w-full rounded-2xl object-cover cursor-pointer" style={{ maxHeight: "280px" }}
                onClick={() => window.open(msg.imageUrl, '_blank')} />
              <div className={`absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full ${msg.isMe ? "bg-black/40" : "bg-black/40"}`}>
                <span className="text-[10px] text-white/80">{msg.time}</span>
                {msg.isMe && <CheckCheck className={`w-3 h-3 ${msg.read ? "text-neon-cyan" : "text-white/40"}`} />}
              </div>
            </div>
          ) : msg.type === "voice" ? (
            <button onClick={(e) => { e.stopPropagation(); playVoice(); }} className="flex items-center gap-2 min-w-[160px]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.isMe ? "bg-white/20" : "bg-foreground/10"}`}>
                {playing ? <Square className="w-3 h-3" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </div>
              <div className="flex-1">
                <div className="h-1.5 rounded-full bg-current/20 overflow-hidden"><div className="h-full rounded-full bg-current/60 transition-all" style={{ width: `${playing ? progress : 0}%` }} /></div>
                <span className={`text-[10px] mt-0.5 block ${msg.isMe ? "text-white/60" : "text-muted-foreground"}`}>{msg.voiceDuration || 5}s</span>
              </div>
            </button>
          ) : (
            <p className="text-sm">{msg.text}</p>
          )}
          {msg.type !== "image" && (
          <div className={`flex items-center gap-1 mt-1 ${msg.isMe ? "justify-end" : ""}`}>
            <span className={`text-[10px] ${msg.isMe ? "text-white/60" : "text-muted-foreground"}`}>{msg.time}</span>
            {msg.isMe && <CheckCheck className={`w-3 h-3 ${msg.read ? "text-neon-cyan" : "text-white/40"}`} />}
          </div>
          )}
        </div>
        {/* Long-press menu */}
        <AnimatePresence>
          {showMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: -5 }}
              transition={{ duration: 0.15 }}
              className={`absolute ${msg.isMe ? "right-0" : "left-0"} bottom-full mb-2 z-50 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[180px]`}
            >
              {!showDeleteSub ? (
                <>
                  <button onClick={() => { onReply?.(); closeMenu(); }}
                    className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3">
                    <CornerUpLeft className="w-4 h-4 text-muted-foreground" />{lang === "zh" ? "回覆" : "Reply"}
                  </button>
                  {msg.type !== "voice" && (
                    <button onClick={() => { onCopy?.(); closeMenu(); }}
                      className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3 border-t border-border/50">
                      <Copy className="w-4 h-4 text-muted-foreground" />{lang === "zh" ? "複製" : "Copy"}
                    </button>
                  )}
                  <button onClick={() => setShowDeleteSub(true)}
                    className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-3 border-t border-border/50">
                    <Trash2 className="w-4 h-4" />{lang === "zh" ? "刪除" : "Delete"}
                  </button>
                </>
              ) : (
                <>
                  <div className="px-4 py-2 border-b border-border/50">
                    <button onClick={() => setShowDeleteSub(false)} className="text-xs text-muted-foreground flex items-center gap-1"><ChevronLeft className="w-3 h-3" />{lang === "zh" ? "返回" : "Back"}</button>
                  </div>
                  <button onClick={() => { onDelete?.(false); closeMenu(); }}
                    className="w-full px-4 py-3 text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3">
                    <X className="w-4 h-4 text-muted-foreground" />{lang === "zh" ? "為我刪除" : "Delete for me"}
                  </button>
                  {msg.isMe && (
                    <button onClick={() => { onDelete?.(true); closeMenu(); }}
                      className="w-full px-4 py-3 text-left text-sm text-destructive hover:bg-destructive/5 transition-colors flex items-center gap-3 border-t border-border/50">
                      <Trash2 className="w-4 h-4" />{lang === "zh" ? "為所有人刪除" : "Delete for everyone"}
                    </button>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="px-4 py-3 rounded-2xl bg-muted rounded-bl-md">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    </div>
  );
}

function resizeImage(file: File, maxW: number, maxH: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Dating() {
  const [tab, setTab] = useState<DatingTab>("discover");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profileSetup, setProfileSetup] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem("unigo-dating-profile") || ""); return !!d.mbti; } catch { return false; }
  });
  const [selectedSexuality, setSelectedSexuality] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("unigo-dating-profile") || "").sexuality || ["prefer_not_to_say"]; } catch { return ["prefer_not_to_say"]; }
  });
  const [selectedMbti, setSelectedMbti] = useState(() => {
    try { return JSON.parse(localStorage.getItem("unigo-dating-profile") || "").mbti || ""; } catch { return ""; }
  });
  const [selectedInterests, setSelectedInterests] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("unigo-dating-profile") || "").interests || []; } catch { return []; }
  });
  const [selectedIcebreakers, setSelectedIcebreakers] = useState<{ prompt: string; answer: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("unigo-dating-profile") || "").icebreakers || []; } catch { return []; }
  });
  const [editingIcebreakerIdx, setEditingIcebreakerIdx] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const MATCH_EXPIRY_MS = 48 * 60 * 60 * 1000;
  const getTimeRemaining = (matchedAt?: number) => {
    if (!matchedAt) return { hours: 48, minutes: 0, expired: false, urgent: false };
    const elapsed = Date.now() - matchedAt;
    const remaining = Math.max(0, MATCH_EXPIRY_MS - elapsed);
    const hours = Math.floor(remaining / (60 * 60 * 1000));
    const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
    return { hours, minutes, expired: remaining <= 0, urgent: hours < 6 };
  };

  const toggleSexuality = (key: string) => {
    setSelectedSexuality(prev => {
      if (key === "prefer_not_to_say") return ["prefer_not_to_say"];
      const without = prev.filter(k => k !== "prefer_not_to_say");
      if (without.includes(key)) {
        const result = without.filter(k => k !== key);
        return result.length === 0 ? ["prefer_not_to_say"] : result;
      }
      return [...without, key];
    });
  };
  const [filterSexuality, setFilterSexuality] = useState("all");
  const [filterInstitution, setFilterInstitution] = useState("all");
  const [filterFaculty, setFilterFaculty] = useState("all");
  const [filterDistrict, setFilterDistrict] = useState("all");
  const [filterRelationship, setFilterRelationship] = useState("all");
  const [filterAge, setFilterAge] = useState<[number, number]>([18, 30]);
  const [filterReligion, setFilterReligion] = useState("all");
  const [filterGender, setFilterGender] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMsg[]>>({
    m3: [
      { text: "你好！見到你都鍾意攝影 📸", isMe: false, time: "3小時前", read: true },
      { text: "係呀！我平時鍾意去離島影日落", isMe: true, time: "3小時前", read: true },
      { text: "", isMe: false, time: "2小時前", type: "voice", voiceDuration: 8, read: true },
      { text: "你鍾意去邊度影相？", isMe: false, time: "2小時前", read: true },
    ],
    m4: [
      { text: "你個 ENTJ 配我個 ENFP 好夾喎 😆", isMe: true, time: "2日前", read: true },
      { text: "係呀！MBTI compatibility 95% 🔥", isMe: false, time: "2日前", read: true },
      { text: "今晚一齊食飯？", isMe: false, time: "30分鐘前", read: false },
    ],
    m5: [
      { text: "你個 profile 好文青呀", isMe: true, time: "6小時前", read: true },
      { text: "哈哈多謝！你鍾意咩類型嘅電影？", isMe: false, time: "6小時前", read: true },
      { text: "你覺得呢套戲點？", isMe: false, time: "5小時前", read: true },
    ],
    m6: [
      { text: "你都鍾意唱K！去邊間？", isMe: true, time: "2日前", read: true },
      { text: "", isMe: true, time: "2日前", type: "voice", voiceDuration: 12, read: true },
      { text: "下次一齊去唱K！", isMe: false, time: "1日前", read: true },
    ],
  });
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const { user, isLoggedIn, logout, updateProfile } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  // === REAL DATA STATE ===
  const [realProfiles, setRealProfiles] = useState<MatchProfile[]>([]);
  const [realMatches, setRealMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingDiscover, setLoadingDiscover] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [likedByProfiles, setLikedByProfiles] = useState<any[]>([]);
  const [superLikesRemaining, setSuperLikesRemaining] = useState(3);
  const [showCompatibility, setShowCompatibility] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (activeChatId && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [activeChatId, chatMessages[activeChatId || ""]?.length]);

  // Load real discover profiles
  useEffect(() => {
    if (!user?.id || !profileSetup) return;
    setLoadingDiscover(true);
    discoverProfiles(user.id).then(data => {
      if (data.profiles && data.profiles.length > 0) setRealProfiles(data.profiles);
    }).catch(() => {}).finally(() => setLoadingDiscover(false));
  }, [user?.id, profileSetup]);

  // Load real matches on mount + when matches tab opens
  useEffect(() => {
    if (!user?.id) return;
    setLoadingMatches(true);
    getMatches(user.id).then(data => {
      if (data.matches) setRealMatches(data.matches);
    }).catch(() => {}).finally(() => setLoadingMatches(false));
  }, [user?.id, tab]);

  // Load who liked me
  useEffect(() => {
    if (!user?.id || tab !== 'liked') return;
    getLikedBy(user.id).then(data => {
      if (data.liked_by) setLikedByProfiles(data.liked_by);
    }).catch(() => {});
  }, [user?.id, tab]);

  // Load super likes remaining
  useEffect(() => {
    if (!user?.id) return;
    getSuperLikesRemaining(user.id).then(data => {
      if (data.remaining !== undefined) setSuperLikesRemaining(data.remaining);
    }).catch(() => {});
  }, [user?.id]);

  // Poll for new messages when in a chat
  useEffect(() => {
    if (!activeChatId || !user?.id || !activeMatchId) return;
    const fetchMessages = () => {
      getMessages(activeMatchId, user.id).then(data => {
        if (data.messages) {
          const formatted: ChatMsg[] = data.messages.map((m: any) => ({
            id: m.id,
            text: m.text,
            isMe: m.isMe,
            time: formatMessageTime(m.time, lang),
            type: m.type || "text",
            voiceDuration: m.voice_duration,
            imageUrl: m.image_url || undefined,
            read: m.read,
          }));
          setChatMessages(prev => ({ ...prev, [activeChatId]: formatted }));
        }
      }).catch(() => {});
    };
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 3000); // poll every 3s
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeChatId, activeMatchId, user?.id, lang]);

  // Use real profiles if available, otherwise mock
  const discoverSource = realProfiles.length > 0 ? realProfiles : MOCK_PROFILES.filter(p => p.messages === 0);

  const filteredProfiles = useMemo(() => {
    let available = discoverSource;
    if (filterSexuality !== "all") available = available.filter(p => p.sexuality === filterSexuality);
    if (filterInstitution !== "all") available = available.filter(p => p.institution === filterInstitution);
    if (filterFaculty !== "all") available = available.filter(p => p.faculty === filterFaculty);
    if (filterDistrict !== "all") available = available.filter(p => p.district === filterDistrict);
    if (filterRelationship !== "all") available = available.filter(p => p.relationshipType === filterRelationship);
    if (filterReligion !== "all") available = available.filter(p => p.religion === filterReligion);
    if (filterGender !== "all") available = available.filter(p => p.gender === filterGender);
    if (filterAge[0] !== 18 || filterAge[1] !== 30) {
      available = available.filter(p => p.age >= filterAge[0] && p.age <= filterAge[1]);
    }
    return available;
  }, [discoverSource, filterSexuality, filterInstitution, filterFaculty, filterDistrict, filterRelationship, filterAge, filterReligion, filterGender]);

  const activeFilterCount = [filterSexuality, filterInstitution, filterFaculty, filterDistrict, filterRelationship, filterReligion, filterGender].filter(f => f !== "all").length + ((filterAge[0] !== 18 || filterAge[1] !== 30) ? 1 : 0);

  // Use real matches if available, otherwise mock
  const matchedProfiles = useMemo(() => {
    if (realMatches.length > 0) {
      return realMatches.map((m: any) => ({
        id: m.partner?.id || m.match_id,
        gender: m.partner?.gender || "other",
        age: m.partner?.age || 20,
        mbti: m.partner?.mbti || "????",
        institution: m.partner?.school || "",
        faculty: m.partner?.faculty || "",
        major: m.partner?.faculty || "",
        district: m.partner?.district || "",
        relationshipType: m.partner?.relationship_type || "",
        religion: m.partner?.religion || "",
        interests: m.partner?.interests || [],
        bio: m.partner?.bio || "",
        sexuality: m.partner?.sexuality || "",
        blurLevel: m.blur_level || 0,
        messages: m.message_count || 0,
        compatibility: 85,
        lastMessage: m.last_message || undefined,
        lastMessageTime: m.last_message_at ? formatMessageTime(m.last_message_at, lang) : undefined,
        unread: m.unread_count || 0,
        matchedAt: new Date(m.created_at).getTime(),
        _matchId: m.match_id,
        avatar_url: m.partner?.avatar_url || undefined,
        photos: (() => { try { const p = m.partner?.photos; return typeof p === 'string' ? JSON.parse(p) : (Array.isArray(p) ? p : []); } catch { return []; } })().filter(Boolean),
        last_seen: m.partner?.last_seen || undefined,
      }));
    }
    return user?.id ? [] : MOCK_PROFILES.filter(p => p.messages > 0).sort((a, b) => (b.unread || 0) - (a.unread || 0));
  }, [realMatches, lang, user?.id]);

  const currentProfile = filteredProfiles[currentIndex % Math.max(filteredProfiles.length, 1)];
  const activeChat = activeChatId ? (matchedProfiles.find(p => p.id === activeChatId) || MOCK_PROFILES.find(p => p.id === activeChatId)) : null;

  const handleVibeCheck = () => {
    setSwipeDirection("right");
    if (user?.id && currentProfile?.id && !currentProfile.id.startsWith("m")) {
      likeUser(user.id, currentProfile.id, false).then(data => {
        if (data.matched) {
          toast.success(lang === "zh" ? "互相喜歡！已配對 🎉" : "Mutual like! You matched 🎉");
          getMatches(user.id).then(d => { if (d.matches) setRealMatches(d.matches); });
        } else {
          toast.success(t("dating.vibe_sent"));
        }
      }).catch(() => toast.success(t("dating.vibe_sent")));
    } else {
      toast.success(t("dating.vibe_sent"));
    }
    setTimeout(() => { setCurrentIndex(prev => prev + 1); setSwipeDirection(null); }, 300);
  };
  const handleSuperLike = () => {
    if (superLikesRemaining <= 0) {
      toast.error(lang === "zh" ? "今日已用完 Super Like" : "No Super Likes left today");
      return;
    }
    setSwipeDirection("right");
    if (user?.id && currentProfile?.id && !currentProfile.id.startsWith("m")) {
      likeUser(user.id, currentProfile.id, true).then(data => {
        setSuperLikesRemaining(prev => Math.max(0, prev - 1));
        if (data.matched) {
          toast.success(lang === "zh" ? "⭐ Super Like 配對成功！" : "⭐ Super Like matched!");
          getMatches(user.id).then(d => { if (d.matches) setRealMatches(d.matches); });
        } else {
          toast.success(lang === "zh" ? "⭐ 已發送 Super Like！" : "⭐ Super Like sent!");
        }
      }).catch(() => toast.error(lang === "zh" ? "發送失敗" : "Failed"));
    } else {
      toast.success(lang === "zh" ? "⭐ 已發送 Super Like！" : "⭐ Super Like sent!");
    }
    setTimeout(() => { setCurrentIndex(prev => prev + 1); setSwipeDirection(null); }, 300);
  };
  const handleLikedByAccept = (profileId: string) => {
    if (!user?.id) return;
    likeUser(user.id, profileId, false).then(data => {
      if (data.matched) {
        toast.success(lang === "zh" ? "配對成功！🎉" : "Matched! 🎉");
        getMatches(user.id).then(d => { if (d.matches) setRealMatches(d.matches); });
      }
      setLikedByProfiles(prev => prev.filter(p => p.profile.id !== profileId));
    }).catch(() => {});
  };
  const handleSkip = () => {
    setSwipeDirection("left");
    setTimeout(() => { setCurrentIndex(prev => prev + 1); setSwipeDirection(null); }, 300);
  };
  const handleSendMessage = () => {
    if (!chatMessage.trim() || !activeChatId) return;
    const newMsg: ChatMsg = { text: chatMessage, isMe: true, time: lang === "zh" ? "剛剛" : "Just now", read: false, replyTo: replyingTo || undefined };
    setChatMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), newMsg] }));
    const msgText = chatMessage;
    setChatMessage("");
    setReplyingTo(null);

    // Try real API
    const matchProfile = matchedProfiles.find(p => p.id === activeChatId);
    const matchId = (matchProfile as any)?._matchId || activeMatchId;
    if (user?.id && matchId && !matchId.startsWith("m")) {
      sendMessage(matchId, user.id, msgText).then(data => {
        if (data.message) {
          // Mark as read after 1s
          setTimeout(() => {
            setChatMessages(prev => {
              const msgs = [...(prev[activeChatId] || [])];
              const last = msgs[msgs.length - 1];
              if (last?.isMe) msgs[msgs.length - 1] = { ...last, read: true };
              return { ...prev, [activeChatId]: msgs };
            });
          }, 1000);
        }
      }).catch(() => {});
    } else {
      // Mock: simulate read receipt + auto-reply
      setTimeout(() => {
        setChatMessages(prev => {
          const msgs = [...(prev[activeChatId] || [])];
          const last = msgs[msgs.length - 1];
          if (last?.isMe) msgs[msgs.length - 1] = { ...last, read: true };
          return { ...prev, [activeChatId]: msgs };
        });
      }, 1000);
      setTimeout(() => setIsTyping(true), 1500);
      setTimeout(() => {
        setIsTyping(false);
        const replies = lang === "zh"
          ? ["哈哈真係？😂", "好呀！", "有意思 🤔", "我都覺得！", "可以再講多啲嗎？"]
          : ["Haha really? 😂", "Sure!", "Interesting 🤔", "I agree!", "Tell me more?"];
        const reply: ChatMsg = { text: replies[Math.floor(Math.random() * replies.length)], isMe: false, time: lang === "zh" ? "剛剛" : "Just now", read: true };
        setChatMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), reply] }));
      }, 2500 + Math.random() * 2000);
    }
  };
  const [showUnmatchConfirm, setShowUnmatchConfirm] = useState(false);
  const [showPartnerProfile, setShowPartnerProfile] = useState(false);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState(-1);
  const [sendingImage, setSendingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chatImageInputRef = useRef<HTMLInputElement | null>(null);
  const prevMatchCountRef = useRef(0);
  const prevMsgCountsRef = useRef<Record<string, number>>({});

  // Heartbeat — update last_seen every 60s
  useEffect(() => {
    if (!user?.id) return;
    heartbeat(user.id).catch(() => {});
    const hb = setInterval(() => heartbeat(user.id).catch(() => {}), 60000);
    return () => clearInterval(hb);
  }, [user?.id]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // Delay to avoid being too aggressive
      const timer = setTimeout(() => Notification.requestPermission(), 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Notify on new matches
  useEffect(() => {
    if (realMatches.length > prevMatchCountRef.current && prevMatchCountRef.current > 0) {
      if ('Notification' in window && Notification.permission === 'granted') {
        const newest = realMatches[realMatches.length - 1];
        const mbti = newest?.partner?.mbti || '???';
        new Notification(lang === 'zh' ? '新配對！' : 'New Match!', {
          body: lang === 'zh' ? `你同 ${mbti} 配對成功 🎉` : `You matched with ${mbti} 🎉`,
          icon: '/favicon.ico',
        });
      }
    }
    prevMatchCountRef.current = realMatches.length;
  }, [realMatches.length]);

  // Notify on new unread messages
  useEffect(() => {
    if (!activeChatId) {
      for (const m of realMatches) {
        const key = m.match_id;
        const prev = prevMsgCountsRef.current[key] || 0;
        if (m.unread_count > 0 && m.unread_count > prev) {
          if ('Notification' in window && Notification.permission === 'granted') {
            const mbti = m.partner?.mbti || '???';
            new Notification(lang === 'zh' ? '新訊息' : 'New Message', {
              body: lang === 'zh' ? `${mbti}: ${m.last_message || '新訊息'}` : `${mbti}: ${m.last_message || 'New message'}`,
              icon: '/favicon.ico',
            });
          }
        }
        prevMsgCountsRef.current[key] = m.unread_count;
      }
    }
  }, [realMatches, activeChatId]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === 'zh' ? '圖片太大（最大5MB）' : 'Image too large (max 5MB)');
      return;
    }
    setUploadingPhoto(true);
    try {
      const resized = await resizeImage(file, 600, 600);
      const idx = uploadingPhotoIndex >= 0 ? uploadingPhotoIndex : undefined;
      const result = await uploadAvatar(resized, idx);
      if (result.success && result.photos) {
        updateProfile({ avatar_url: result.avatar_url, photos: result.photos });
        toast.success(lang === 'zh' ? '相片已上傳！' : 'Photo uploaded!');
      } else if (result.success && result.avatar_url) {
        updateProfile({ avatar_url: result.avatar_url });
        toast.success(lang === 'zh' ? '相片已上傳！' : 'Photo uploaded!');
      } else {
        toast.error(lang === 'zh' ? '上傳失敗' : 'Upload failed');
      }
    } catch {
      toast.error(lang === 'zh' ? '上傳失敗' : 'Upload failed');
    } finally {
      setUploadingPhoto(false);
      setUploadingPhotoIndex(-1);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeletePhotoAt = async (index: number) => {
    try {
      const result = await deletePhoto(index);
      if (result.success) {
        updateProfile({ avatar_url: result.avatar_url || null, photos: result.photos || [] });
        toast.success(lang === 'zh' ? '已刪除相片' : 'Photo deleted');
      }
    } catch {
      toast.error(lang === 'zh' ? '刪除失敗' : 'Delete failed');
    }
  };

  const triggerPhotoUpload = (index: number) => {
    setUploadingPhotoIndex(index);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  const handleChatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(lang === 'zh' ? '圖片太大（最大5MB）' : 'Image too large (max 5MB)');
      return;
    }
    setSendingImage(true);

    // Show preview INSTANTLY using object URL — no waiting for resize
    const previewUrl = URL.createObjectURL(file);
    const chatId = activeChatId;
    const tempMsg: ChatMsg = { text: '📷', isMe: true, time: lang === 'zh' ? '剛剛' : 'Just now', type: 'image', imageUrl: previewUrl, read: false };
    setChatMessages(prev => ({ ...prev, [chatId]: [...(prev[chatId] || []), tempMsg] }));

    // Resize + upload in background
    try {
      const resized = await resizeImage(file, 800, 800);
      const matchProfile = matchedProfiles.find(p => p.id === chatId);
      const matchId = (matchProfile as any)?._matchId || activeMatchId;
      if (user?.id && matchId && !matchId.startsWith('m')) {
        sendImageMessage(matchId, user.id, resized).then(data => {
          if (data.message) {
            // Replace preview URL with server URL + mark as read
            const serverUrl = data.message.image_url || resized;
            setTimeout(() => {
              setChatMessages(prev => {
                const msgs = [...(prev[chatId] || [])];
                const idx = msgs.findLastIndex(m => m.isMe && m.type === 'image' && m.imageUrl === previewUrl);
                if (idx >= 0) msgs[idx] = { ...msgs[idx], imageUrl: serverUrl, read: true };
                return { ...prev, [chatId]: msgs };
              });
              URL.revokeObjectURL(previewUrl);
            }, 500);
          }
        }).catch(() => toast.error(lang === 'zh' ? '發送失敗' : 'Send failed'));
      }
    } catch {
      toast.error(lang === 'zh' ? '發送失敗' : 'Send failed');
    } finally {
      setSendingImage(false);
      if (chatImageInputRef.current) chatImageInputRef.current.value = '';
    }
  };

  const handleBlock = () => {
    if (!user?.id || !activeChat) return;
    blockUser(user.id, activeChat.id).then(() => {
      toast.success(lang === 'zh' ? '已封鎖此用戶' : 'User blocked');
      setActiveChatId(null);
      setActiveMatchId(null);
      setShowBlockConfirm(false);
      getMatches(user.id).then(data => { if (data.matches) setRealMatches(data.matches); });
    }).catch(() => toast.error(lang === 'zh' ? '操作失敗' : 'Failed'));
  };

  const handleReport = () => {
    if (!user?.id || !activeChat) return;
    reportUser(user.id, activeChat.id, reportReason).then(() => {
      toast.success(lang === 'zh' ? '舉報已提交，感謝你的反饋' : 'Report submitted, thank you');
      setShowReportDialog(false);
      setReportReason("");
    }).catch(() => toast.error(lang === 'zh' ? '操作失敗' : 'Failed'));
  };

  const handleUnmatch = () => {
    if (!activeChatId) return;
    const matchProfile = matchedProfiles.find(p => p.id === activeChatId);
    const matchId = (matchProfile as any)?._matchId || activeMatchId;
    if (user?.id && matchId && !matchId.startsWith("m")) {
      unmatch(matchId, user.id).then(() => {
        toast.success(lang === "zh" ? "已取消配對" : "Unmatched");
        setActiveChatId(null);
        setActiveMatchId(null);
        setShowUnmatchConfirm(false);
        // Refresh matches
        getMatches(user.id).then(data => { if (data.matches) setRealMatches(data.matches); });
      }).catch(() => toast.error(lang === "zh" ? "操作失敗" : "Failed"));
    } else {
      // Mock unmatch
      toast.success(lang === "zh" ? "已取消配對" : "Unmatched");
      setActiveChatId(null);
      setShowUnmatchConfirm(false);
    }
  };

  const handleDeleteMsg = (msgId: string, forBoth: boolean) => {
    if (!activeChatId || !user?.id || !msgId) return;

    // Immediately hide from UI by message ID
    setHiddenMsgIds(prev => new Set([...prev, msgId]));

    // Call API to persist the deletion
    deleteMessage(msgId, user.id, forBoth).catch(() => {});
  };

  const handleInsertEmoji = (emoji: string) => {
    setChatMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };
  const handleVoiceRecord = () => {
    if (isRecording) {
      if (recordingRef.current) clearInterval(recordingRef.current);
      setIsRecording(false);
      if (!activeChatId || recordingTime < 1) { setRecordingTime(0); return; }
      const msg: ChatMsg = { text: "", isMe: true, time: lang === "zh" ? "剛剛" : "Just now", type: "voice", voiceDuration: recordingTime, read: false };
      setChatMessages(prev => ({ ...prev, [activeChatId]: [...(prev[activeChatId] || []), msg] }));
      const dur = recordingTime;
      setRecordingTime(0);
      // Try real API
      const matchProfile = matchedProfiles.find(p => p.id === activeChatId);
      const matchId = (matchProfile as any)?._matchId || activeMatchId;
      if (user?.id && matchId && !matchId.startsWith("m")) {
        sendVoiceMessage(matchId, user.id, dur).catch(() => {});
      }
      setTimeout(() => setChatMessages(prev => { const msgs = [...(prev[activeChatId] || [])]; const last = msgs[msgs.length - 1]; if (last?.isMe) msgs[msgs.length - 1] = { ...last, read: true }; return { ...prev, [activeChatId]: msgs }; }), 1000);
    } else {
      setIsRecording(true);
      setRecordingTime(0);
      recordingRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    }
  };
  const handleSaveProfile = () => {
    if (!selectedMbti) { toast.error(t("dating.error.mbti")); return; }
    if (selectedInterests.length < 3) { toast.error(t("dating.error.interests")); return; }
    updateProfile({ mbti: selectedMbti, sexuality: selectedSexuality.join(","), interests: selectedInterests, icebreakers: selectedIcebreakers });
    localStorage.setItem("unigo-dating-profile", JSON.stringify({ mbti: selectedMbti, sexuality: selectedSexuality, interests: selectedInterests, icebreakers: selectedIcebreakers }));
    setProfileSetup(true);
    setShowPreview(true);
    toast.success(t("dating.profile_saved"));
  };

  if (!isLoggedIn) { setLocation("/login"); return null; }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-card/50 p-4">
          <a href="/" className="flex items-center gap-2.5 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-4.5 h-4.5 text-white" /></div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">UniGo<span className="text-neon-coral"> HK</span></span>
          </a>
          <nav className="flex-1 space-y-1">
            <a href="/feed" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><Home className="w-4 h-4" /> {t("feed.nav.feed")}</a>
            <a href="/dating" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neon-coral/10 text-neon-coral font-medium text-sm"><HeartHandshake className="w-4 h-4" /> {t("feed.nav.dating")}</a>
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

        <main className="flex-1 min-h-screen">
          {/* Mobile header */}
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
            {activeChatId ? (
              <>
                <button onClick={() => setActiveChatId(null)} className="flex items-center gap-2 text-foreground"><ChevronLeft className="w-5 h-5" /><span className="font-medium text-sm">{t("dating.back")}</span></button>
                {activeChat && <button onClick={() => setShowPartnerProfile(true)} className="font-display font-bold text-sm hover:text-primary transition-colors flex items-center gap-1">{activeChat.mbti} {genderSign(activeChat.gender)} · {activeChat.institution} <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" /></button>}
                <div className="flex items-center gap-1">
                  <button onClick={() => setShowReportDialog(true)} className="text-muted-foreground hover:text-orange-500 p-1"><Flag className="w-4 h-4" /></button>
                  <button onClick={() => setShowBlockConfirm(true)} className="text-muted-foreground hover:text-destructive p-1"><ShieldAlert className="w-4 h-4" /></button>
                  <button onClick={() => setShowUnmatchConfirm(true)} className="text-muted-foreground hover:text-destructive p-1"><UserX className="w-5 h-5" /></button>
                </div>
              </>
            ) : (
              <>
                <a href="/" className="flex items-center gap-2"><div className="w-7 h-7 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div><span className="font-display text-base font-bold text-foreground">UniGo<span className="text-neon-coral"> HK</span></span></a>
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
                <button onClick={() => setShowPartnerProfile(true)} className="relative cursor-pointer hover:opacity-80 transition-opacity group">
                  <BlurredAvatar blurLevel={activeChat.blurLevel} mbti={activeChat.mbti} size="sm" avatarUrl={activeChat.avatar_url} photos={activeChat.photos} />
                  {(() => { const s = getOnlineStatus(activeChat.last_seen || null, lang); return s.online ? <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-neon-emerald border-2 border-card" /> : null; })()}
                </button>
                <button onClick={() => setShowPartnerProfile(true)} className="text-left hover:opacity-80 transition-opacity">
                  <div className="flex items-center gap-2"><span className="font-display font-bold text-foreground">{activeChat.mbti} {genderSign(activeChat.gender)}</span><span className="text-sm text-muted-foreground">· {activeChat.institution} · {activeChat.major}</span><ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" /></div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${getOnlineStatus(activeChat.last_seen || null, lang).online ? "text-neon-emerald" : "text-muted-foreground"}`}>{getOnlineStatus(activeChat.last_seen || null, lang).text}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <div className="h-1 w-16 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan" style={{ width: `${activeChat.blurLevel}%` }} /></div>
                    <span className="text-[10px] text-muted-foreground">{activeChat.messages}/20 {t("dating.msg_unlock")}</span>
                  </div>
                </button>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={() => setShowReportDialog(true)} className="text-muted-foreground hover:text-orange-500 transition-colors p-1.5 rounded-lg hover:bg-muted" title={lang === "zh" ? "舉報" : "Report"}><Flag className="w-4 h-4" /></button>
                  <button onClick={() => setShowBlockConfirm(true)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-muted" title={lang === "zh" ? "封鎖" : "Block"}><ShieldAlert className="w-4 h-4" /></button>
                  <button onClick={() => setShowUnmatchConfirm(true)} className="text-muted-foreground hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-muted" title={lang === "zh" ? "取消配對" : "Unmatch"}><UserX className="w-5 h-5" /></button>
                </div>
              </div>
              {/* Unmatch confirmation */}
              <AnimatePresence>
                {showUnmatchConfirm && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowUnmatchConfirm(false)}>
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                      <div className="text-center">
                        <UserX className="w-12 h-12 text-destructive mx-auto mb-3" />
                        <h3 className="font-display font-bold text-lg text-foreground mb-2">{lang === "zh" ? "確認取消配對？" : "Unmatch?"}</h3>
                        <p className="text-sm text-muted-foreground mb-5">{lang === "zh" ? "所有對話記錄將被永久刪除，此操作無法撤銷。" : "All chat messages will be permanently deleted. This cannot be undone."}</p>
                        <div className="flex gap-3">
                          <button onClick={() => setShowUnmatchConfirm(false)} className="flex-1 py-3 rounded-xl font-medium text-sm border border-border hover:bg-muted transition-colors">{lang === "zh" ? "取消" : "Cancel"}</button>
                          <button onClick={handleUnmatch} className="flex-1 py-3 rounded-xl font-medium text-sm bg-destructive text-white hover:bg-destructive/90 transition-colors">{lang === "zh" ? "取消配對" : "Unmatch"}</button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Block confirmation */}
              <AnimatePresence>
                {showBlockConfirm && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowBlockConfirm(false)}>
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                      <div className="text-center">
                        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-3" />
                        <h3 className="font-display font-bold text-lg text-foreground mb-2">{lang === "zh" ? "封鎖此用戶？" : "Block this user?"}</h3>
                        <p className="text-sm text-muted-foreground mb-5">{lang === "zh" ? "封鎖後對方將無法再看到你或與你配對，所有對話將被刪除。" : "They won't be able to see you or match with you. All messages will be deleted."}</p>
                        <div className="flex gap-3">
                          <button onClick={() => setShowBlockConfirm(false)} className="flex-1 py-3 rounded-xl font-medium text-sm border border-border hover:bg-muted transition-colors">{lang === "zh" ? "取消" : "Cancel"}</button>
                          <button onClick={handleBlock} className="flex-1 py-3 rounded-xl font-medium text-sm bg-destructive text-white hover:bg-destructive/90 transition-colors">{lang === "zh" ? "封鎖" : "Block"}</button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Report dialog */}
              <AnimatePresence>
                {showReportDialog && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowReportDialog(false)}>
                    <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-card rounded-2xl border border-border p-6 max-w-sm w-full shadow-xl" onClick={e => e.stopPropagation()}>
                      <div className="text-center">
                        <Flag className="w-12 h-12 text-orange-500 mx-auto mb-3" />
                        <h3 className="font-display font-bold text-lg text-foreground mb-2">{lang === "zh" ? "舉報此用戶" : "Report this user"}</h3>
                        <p className="text-sm text-muted-foreground mb-4">{lang === "zh" ? "你的舉報將被匿名處理" : "Your report will be handled anonymously"}</p>
                        <div className="space-y-2 mb-5">
                          {[
                            { key: "spam", zh: "垃圾訊息 / 廣告", en: "Spam / Advertising" },
                            { key: "harassment", zh: "騷擾 / 不當行為", en: "Harassment / Inappropriate behavior" },
                            { key: "fake", zh: "虛假個人資料", en: "Fake profile" },
                            { key: "underage", zh: "未成年用戶", en: "Underage user" },
                            { key: "other", zh: "其他", en: "Other" },
                          ].map(r => (
                            <button key={r.key} onClick={() => setReportReason(r.key)} className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all ${reportReason === r.key ? "bg-orange-500/10 text-orange-500 border border-orange-500/30" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                              {lang === "zh" ? r.zh : r.en}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-3">
                          <button onClick={() => { setShowReportDialog(false); setReportReason(""); }} className="flex-1 py-3 rounded-xl font-medium text-sm border border-border hover:bg-muted transition-colors">{lang === "zh" ? "取消" : "Cancel"}</button>
                          <button onClick={handleReport} disabled={!reportReason} className="flex-1 py-3 rounded-xl font-medium text-sm bg-orange-500 text-white hover:bg-orange-500/90 transition-colors disabled:opacity-40">{lang === "zh" ? "提交舉報" : "Submit Report"}</button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Partner Profile Drawer */}
              <AnimatePresence>
                {showPartnerProfile && activeChat && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={() => setShowPartnerProfile(false)}>
                    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                      className="bg-card rounded-t-2xl lg:rounded-2xl border border-border w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
                      {/* Drag handle */}
                      <div className="flex justify-center pt-3 pb-1 lg:hidden"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>
                      {/* Photo */}
                      <div className="relative">
                        <BlurredAvatar blurLevel={activeChat.blurLevel} mbti={activeChat.mbti} size="lg" avatarUrl={activeChat.avatar_url} photos={activeChat.photos} />
                        <button onClick={() => setShowPartnerProfile(false)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"><X className="w-4 h-4" /></button>
                      </div>
                      <div className="p-5 space-y-4">
                        {/* Name / School */}
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-display text-xl font-bold text-foreground">{activeChat.mbti} {genderSign(activeChat.gender)}</span>
                            {activeChat.age > 0 && <span className="text-sm text-muted-foreground">· {activeChat.age}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground">{activeChat.institution}{activeChat.major ? ` · ${activeChat.major}` : ""}</p>
                          {activeChat.district && <p className="text-xs text-muted-foreground mt-0.5">📍 {activeChat.district}</p>}
                        </div>
                        {/* Bio */}
                        {activeChat.bio && (
                          <div className="p-3 rounded-xl bg-muted/50">
                            <p className="text-sm text-foreground leading-relaxed">{activeChat.bio}</p>
                          </div>
                        )}
                        {/* Icebreakers */}
                        {activeChat.icebreakers && activeChat.icebreakers.filter(ib => ib.answer).length > 0 && (
                          <div className="space-y-2">
                            {activeChat.icebreakers.filter(ib => ib.answer).map((ib, idx) => {
                              const prompt = ICEBREAKER_PROMPTS.find(p => p.key === ib.prompt);
                              return (
                                <div key={idx} className="p-3 rounded-xl bg-neon-lavender/5 border border-neon-lavender/15">
                                  <p className="text-[11px] font-medium text-neon-lavender mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />{prompt ? (lang === "zh" ? prompt.zh : prompt.en) : ib.prompt}</p>
                                  <p className="text-sm text-foreground">{ib.answer}</p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {activeChat.sexuality && activeChat.sexuality !== "prefer_not_to_say" && (() => {
                            const opt = SEXUALITY_OPTIONS.find(s => s.key === activeChat.sexuality);
                            return opt ? <span className="px-2.5 py-1 rounded-full bg-neon-lavender/10 text-neon-lavender text-xs font-medium">{lang === "zh" ? opt.zh : opt.en}</span> : null;
                          })()}
                          {activeChat.relationshipType && (() => {
                            const labels: Record<string, { zh: string; en: string }> = { long: { zh: "長期關係", en: "Long-term" }, short: { zh: "短期關係", en: "Short-term" }, casual: { zh: "隨意交往", en: "Casual" }, friends: { zh: "先做朋友", en: "Friends first" }, unsure: { zh: "未確定", en: "Unsure" } };
                            const l = labels[activeChat.relationshipType];
                            return l ? <span className="px-2.5 py-1 rounded-full bg-neon-cyan/10 text-neon-cyan text-xs font-medium">{lang === "zh" ? l.zh : l.en}</span> : null;
                          })()}
                          {activeChat.religion && activeChat.religion !== "none" && activeChat.religion !== "private" && (
                            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium">{activeChat.religion}</span>
                          )}
                        </div>
                        {/* Interests */}
                        {activeChat.interests.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-2">{lang === "zh" ? "興趣" : "Interests"}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {activeChat.interests.map(key => {
                                const item = INTEREST_OPTIONS.find(i => i.key === key);
                                return <span key={key} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground font-medium">{item ? (lang === "zh" ? item.zh : key) : key}</span>;
                              })}
                            </div>
                          </div>
                        )}
                        {/* Photo clarity */}
                        <div className="p-3 rounded-xl bg-muted/50">
                          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2"><span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> {t("dating.photo_clarity")}</span><span className="font-medium">{activeChat.blurLevel}%</span></div>
                          <div className="h-2 rounded-full bg-background overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan" style={{ width: `${activeChat.blurLevel}%` }} /></div>
                        </div>
                        {/* Compatibility */}
                        {(() => {
                          const stored = (() => { try { return JSON.parse(localStorage.getItem("unigo-dating-profile") || "{}"); } catch { return {}; } })();
                          const myProfile = { mbti: stored.mbti || user?.mbti || "", interests: stored.interests || [], institution: user?.school || user?.institution || "", district: user?.district || "", religion: user?.religion || "" };
                          if (!myProfile.mbti) return null;
                          const compat = computeCompatibility(myProfile as any, activeChat);
                          return (
                            <div className="p-3 rounded-xl bg-neon-emerald/5 border border-neon-emerald/15">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-foreground">{lang === "zh" ? "配對指數" : "Compatibility"}</span>
                                <span className="text-lg font-bold text-neon-emerald">{compat.total}%</span>
                              </div>
                              <div className="space-y-1.5">
                                {compat.factors.map(f => (
                                  <div key={f.key} className="flex items-center gap-2 text-[11px]">
                                    <span>{f.emoji}</span>
                                    <span className="flex-1 text-muted-foreground">{lang === "zh" ? f.label_zh : f.label_en}</span>
                                    <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-neon-emerald/60" style={{ width: `${(f.score / f.max) * 100}%` }} /></div>
                                  </div>
                                ))}
                              </div>
                              {compat.sharedInterests.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-neon-emerald/10">
                                  {compat.sharedInterests.map(key => {
                                    const item = INTEREST_OPTIONS.find(i => i.key === key);
                                    return <span key={key} className="px-2 py-0.5 rounded-full bg-neon-emerald/10 text-neon-emerald text-[10px] font-medium">{item ? (lang === "zh" ? item.zh : key) : key}</span>;
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => setShowPartnerProfile(false)} className="flex-1 py-3 rounded-xl font-medium text-sm bg-primary text-white hover:bg-primary/90 transition-colors">{lang === "zh" ? "返回聊天" : "Back to Chat"}</button>
                          <button onClick={() => { setShowPartnerProfile(false); setShowReportDialog(true); }} className="py-3 px-4 rounded-xl font-medium text-sm border border-border text-muted-foreground hover:text-orange-500 hover:border-orange-500/30 transition-colors"><Flag className="w-4 h-4" /></button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                <div className="flex justify-center mb-6"><div className="px-4 py-2 rounded-full bg-muted/50 text-xs text-muted-foreground flex items-center gap-2"><Eye className="w-3 h-3" />{activeChat.blurLevel >= 100 ? (lang === "zh" ? "照片已完全解鎖 🎉" : "Photos fully unlocked 🎉") : `${t("dating.photo_clarity")} ${activeChat.blurLevel}% · ${t("dating.send_more")} ${Math.max(0, 20 - activeChat.messages)} ${t("dating.to_fully_unlock")}`}</div></div>
                {(chatMessages[activeChatId] || []).filter((msg) => !hiddenMsgIds.has((msg as any).id || '')).map((msg, idx) => (
                  <ChatBubble key={(msg as any).id || idx} msg={msg} lang={lang}
                    onDelete={(forBoth) => handleDeleteMsg((msg as any).id, forBoth)}
                    onReply={() => setReplyingTo(msg.type === "voice" ? "🎤 Voice note" : msg.text)}
                    onCopy={() => { navigator.clipboard.writeText(msg.text); toast.success(lang === "zh" ? "已複製" : "Copied"); }}
                  />
                ))}
                {isTyping && <TypingIndicator />}
                <div ref={chatEndRef} />
              </div>
              <div className="p-4 border-t border-border bg-card/50">
                {/* Reply bar */}
                <AnimatePresence>
                  {replyingTo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-2 overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neon-coral/5 border-l-2 border-neon-coral">
                        <CornerUpLeft className="w-3.5 h-3.5 text-neon-coral flex-shrink-0" />
                        <p className="text-xs text-muted-foreground truncate flex-1">{replyingTo}</p>
                        <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
                      <div className="flex items-center justify-between mb-2"><span className="text-xs font-medium text-foreground">{lang === "zh" ? "表情符號" : "Emoji"}</span><button onClick={() => setShowEmojiPicker(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button></div>
                      <div className="grid grid-cols-8 gap-1">
                        {["😀","😂","🥰","😍","😘","🤗","😎","🤔","😅","🥺","😭","🤣","❤️","🔥","✨","💯","👍","👏","🙌","💪","🎉","🎵","☕","🍜","📸","🌸","💕","🫶","😊","🤭","😏","🙈","💀","🫠","🥲","😤","👀","💬","🌙","⭐"].map(emoji => (
                          <button key={emoji} onClick={() => handleInsertEmoji(emoji)} className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center text-lg transition-colors">{emoji}</button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {isRecording ? (
                  <div data-recording className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-destructive/10 border border-destructive/30">
                      <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                      <span className="text-sm font-medium text-destructive">{lang === "zh" ? "錄音中" : "Recording"} {recordingTime}s</span>
                      <div className="flex-1 flex items-center gap-0.5">{Array.from({ length: 20 }).map((_, i) => (<span key={i} className="w-1 rounded-full bg-destructive/40" style={{ height: `${6 + Math.random() * 14}px`, animationDelay: `${i * 50}ms` }} />))}</div>
                    </div>
                    <Button onClick={handleVoiceRecord} className="bg-destructive hover:bg-destructive/90 text-white rounded-xl px-4" size="sm"><Send className="w-4 h-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${showEmojiPicker ? "bg-neon-coral/10 text-neon-coral" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><Smile className="w-5 h-5" /></button>
                    <input ref={chatImageInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleChatImageUpload} />
                    <button onClick={() => chatImageInputRef.current?.click()} disabled={sendingImage}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50">
                      {sendingImage ? <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                    </button>
                    <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} placeholder={t("dating.msg_input")} className="flex-1 bg-muted rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-neon-coral/30" />
                    {chatMessage.trim() ? (
                      <Button onClick={handleSendMessage} className="bg-neon-coral hover:bg-neon-coral/90 text-white rounded-xl px-4" size="sm"><Send className="w-4 h-4" /></Button>
                    ) : (
                      <button onClick={handleVoiceRecord} className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-neon-coral hover:bg-neon-coral/10 transition-colors"><Mic className="w-5 h-5" /></button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto px-4 py-6">
              {/* Tabs */}
              <div className="flex gap-1 mb-6 bg-muted rounded-xl p-1">
                {(["discover", "liked", "matches", "profile"] as DatingTab[]).map((t_) => (
                  <button key={t_} onClick={() => setTab(t_)} className={`flex-1 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all relative ${tab === t_ ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                    {t_ === "discover" ? t("dating.tab.discover") : t_ === "liked" ? (lang === "zh" ? "喜歡你" : "Liked You") : t_ === "matches" ? t("dating.tab.matches") : t("dating.tab.profile")}
                    {t_ === "liked" && likedByProfiles.length > 0 && <span className="absolute -top-1 -right-0.5 w-4 h-4 rounded-full bg-neon-coral text-white text-[9px] flex items-center justify-center">{likedByProfiles.length}</span>}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {/* DISCOVER */}
                {tab === "discover" && (
                  <motion.div key="discover" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <div className="flex items-center justify-between mb-5">
                      <div><h2 className="font-display text-lg font-bold text-foreground">{t("dating.discover.title")}</h2><p className="text-xs text-muted-foreground mt-0.5">{t("dating.discover.subtitle")}</p></div>
                      <Button variant="ghost" size="sm" className="text-muted-foreground relative" onClick={() => setShowFilters(!showFilters)}>
                        <Settings className="w-4 h-4 mr-1" /> {t("dating.filter")}
                        {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-neon-coral text-white text-[10px] flex items-center justify-center">{activeFilterCount}</span>}
                      </Button>
                    </div>
                    <AnimatePresence>{showFilters && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-5">
                        <div className="p-4 rounded-xl border border-border bg-card space-y-4 max-h-[60vh] overflow-y-auto">
                          {/* Gender */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dating.filter.gender")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {[{key:"all",zh:t("dating.filter.gender.all")},{key:"male",zh:t("dating.filter.gender.male")},{key:"female",zh:t("dating.filter.gender.female")},{key:"nonbinary",zh:t("dating.filter.gender.nonbinary")}].map(o => (
                                <button key={o.key} onClick={() => setFilterGender(o.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterGender === o.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{o.zh}</button>
                              ))}
                            </div>
                          </div>
                          {/* Sexuality */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dating.profile.sexuality")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setFilterSexuality("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterSexuality === "all" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{t("dating.filter.all")}</button>
                              {SEXUALITY_OPTIONS.map(o => (<button key={o.key} onClick={() => setFilterSexuality(o.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterSexuality === o.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{lang === "zh" ? o.zh : o.en}</button>))}
                            </div>
                          </div>
                          {/* Age Range Slider */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-medium text-muted-foreground">{t("dating.filter.age")}</p>
                              <span className="text-xs font-semibold text-foreground">{filterAge[0]} – {filterAge[1]}{filterAge[1] >= 30 ? "+" : ""}</span>
                            </div>
                            <div className="px-1">
                              <div className="relative h-10 flex items-center">
                                {/* Track background */}
                                <div className="absolute w-full h-1.5 rounded-full bg-muted" />
                                {/* Active range */}
                                <div className="absolute h-1.5 rounded-full bg-neon-coral" style={{ left: `${((filterAge[0] - 18) / 12) * 100}%`, right: `${100 - ((filterAge[1] - 18) / 12) * 100}%` }} />
                                {/* Min thumb */}
                                <input type="range" min={18} max={30} value={filterAge[0]}
                                  onChange={(e) => { const v = Math.min(Number(e.target.value), filterAge[1] - 1); setFilterAge([v, filterAge[1]]); }}
                                  className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neon-coral [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-neon-coral [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer" style={{ zIndex: 3 }} />
                                {/* Max thumb */}
                                <input type="range" min={18} max={30} value={filterAge[1]}
                                  onChange={(e) => { const v = Math.max(Number(e.target.value), filterAge[0] + 1); setFilterAge([filterAge[0], v]); }}
                                  className="absolute w-full h-1.5 appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-neon-coral [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-neon-coral [&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-pointer" style={{ zIndex: 4 }} />
                              </div>
                              <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                                <span>18</span><span>21</span><span>24</span><span>27</span><span>30+</span>
                              </div>
                            </div>
                          </div>
                          {/* Institution */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dating.filter.school")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setFilterInstitution("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterInstitution === "all" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{t("dating.filter.all")}</button>
                              {INSTITUTION_OPTIONS.map(o => (<button key={o.key} onClick={() => setFilterInstitution(o.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterInstitution === o.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{lang === "zh" ? o.zh : o.en}</button>))}
                            </div>
                          </div>
                          {/* Faculty */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dating.filter.faculty")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setFilterFaculty("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterFaculty === "all" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{t("dating.filter.all")}</button>
                              {FACULTY_OPTIONS.map(o => (<button key={o.key} onClick={() => setFilterFaculty(o.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterFaculty === o.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{lang === "zh" ? o.zh : o.en}</button>))}
                            </div>
                          </div>
                          {/* District */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dating.filter.district")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setFilterDistrict("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterDistrict === "all" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{t("dating.filter.all")}</button>
                              {DISTRICT_OPTIONS.map(o => (<button key={o.key} onClick={() => setFilterDistrict(o.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterDistrict === o.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{lang === "zh" ? o.zh : o.en}</button>))}
                            </div>
                          </div>
                          {/* Relationship Type */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dating.filter.relationship")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setFilterRelationship("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterRelationship === "all" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{t("dating.filter.all")}</button>
                              {RELATIONSHIP_OPTIONS.map(o => (<button key={o.key} onClick={() => setFilterRelationship(o.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterRelationship === o.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{lang === "zh" ? o.zh : o.en}</button>))}
                            </div>
                          </div>
                          {/* Religion */}
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">{t("dating.filter.religion")}</p>
                            <div className="flex flex-wrap gap-1.5">
                              <button onClick={() => setFilterReligion("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterReligion === "all" ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{t("dating.filter.all")}</button>
                              {RELIGION_OPTIONS.map(o => (<button key={o.key} onClick={() => setFilterReligion(o.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${filterReligion === o.key ? "bg-neon-coral text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{lang === "zh" ? o.zh : o.en}</button>))}
                            </div>
                          </div>
                          {/* Reset filters */}
                          {activeFilterCount > 0 && (
                            <button onClick={() => { setFilterSexuality("all"); setFilterInstitution("all"); setFilterFaculty("all"); setFilterDistrict("all"); setFilterRelationship("all"); setFilterAge([18, 30]); setFilterReligion("all"); setFilterGender("all"); }} className="w-full py-2 rounded-lg text-xs font-medium text-neon-coral hover:bg-neon-coral/10 transition-all">
                              {t("dating.filter.clear")} ({activeFilterCount})
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}</AnimatePresence>

                    {currentProfile && filteredProfiles.length > 0 ? (
                      <div className="relative">
                        <div className="absolute inset-x-3 top-3 h-40 rounded-2xl border border-border bg-card/50 -z-10" />
                        <motion.div key={currentProfile.id + currentIndex} initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: swipeDirection ? 0 : 1, scale: swipeDirection ? 0.9 : 1, x: swipeDirection === "left" ? -200 : swipeDirection === "right" ? 200 : 0, rotate: swipeDirection === "left" ? -10 : swipeDirection === "right" ? 10 : 0 }}
                          transition={{ duration: 0.3 }} className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                          <BlurredAvatar blurLevel={currentProfile.blurLevel} mbti={currentProfile.mbti} size="lg" avatarUrl={currentProfile.avatar_url} photos={currentProfile.photos} />
                          <div className="p-5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2"><span className="font-display text-xl font-bold text-foreground">{currentProfile.mbti} {genderSign(currentProfile.gender)}</span><span className="text-sm text-muted-foreground">· {currentProfile.institution}</span></div>
                              <button onClick={() => setShowCompatibility(!showCompatibility)} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-emerald/10 text-neon-emerald text-xs font-semibold hover:bg-neon-emerald/20 transition-colors">
                                <Sparkles className="w-3 h-3" />
                                {(() => { const c = computeCompatibility({ mbti: selectedMbti, interests: selectedInterests, institution: user?.school, district: user?.district, religion: user?.religion }, currentProfile); return c.total; })()}%
                              </button>
                            </div>
                            {/* Compatibility breakdown */}
                            <AnimatePresence>
                              {showCompatibility && (() => {
                                const compat = computeCompatibility({ mbti: selectedMbti, interests: selectedInterests, institution: user?.school, district: user?.district, religion: user?.religion }, currentProfile);
                                return (
                                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-4 overflow-hidden">
                                    <div className="p-3 rounded-xl bg-neon-emerald/5 border border-neon-emerald/15 space-y-2">
                                      <p className="text-xs font-medium text-neon-emerald mb-1">{lang === "zh" ? "配對分析" : "Compatibility Breakdown"}</p>
                                      {compat.factors.map(f => (
                                        <div key={f.key} className="flex items-center gap-2">
                                          <span className="text-sm w-5">{f.emoji}</span>
                                          <span className="text-xs text-foreground flex-1">{lang === "zh" ? f.label_zh : f.label_en}</span>
                                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-neon-emerald" style={{ width: `${(f.score / f.max) * 100}%` }} /></div>
                                          <span className="text-[10px] text-muted-foreground w-8 text-right">+{f.score}</span>
                                        </div>
                                      ))}
                                      {compat.sharedInterests.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1 pt-2 border-t border-neon-emerald/10">
                                          {compat.sharedInterests.map(i => <span key={i} className="px-2 py-0.5 rounded-full bg-neon-emerald/10 text-neon-emerald text-[10px] font-medium">{i}</span>)}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                );
                              })()}
                            </AnimatePresence>
                            <p className="text-sm text-muted-foreground mb-3">{currentProfile.major}</p>
                            {currentProfile.bio && <p className="text-sm text-foreground mb-4 leading-relaxed">{currentProfile.bio}</p>}
                            {currentProfile.icebreakers && currentProfile.icebreakers.length > 0 && (
                              <div className="space-y-2 mb-4">
                                {currentProfile.icebreakers.map((ib, idx) => {
                                  const prompt = ICEBREAKER_PROMPTS.find(p => p.key === ib.prompt);
                                  return (
                                    <div key={idx} className="p-3 rounded-xl bg-neon-lavender/5 border border-neon-lavender/15">
                                      <p className="text-[11px] font-medium text-neon-lavender mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />{prompt ? (lang === "zh" ? prompt.zh : prompt.en) : ib.prompt}</p>
                                      <p className="text-sm text-foreground">{ib.answer}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-2 mb-4">
                              {SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality) && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-neon-lavender/10 text-neon-lavender text-xs font-medium">{lang === "zh" ? SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality)?.zh : SEXUALITY_OPTIONS.find(s => s.key === currentProfile.sexuality)?.en}</span>
                              )}
                              {currentProfile.interests.map((interest) => (<span key={interest} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground font-medium">{interest}</span>))}
                            </div>
                            <div className="p-3 rounded-xl bg-muted/50 mb-5">
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-2"><span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> {t("dating.photo_clarity")}</span><span className="font-medium">{currentProfile.blurLevel}%</span></div>
                              <div className="h-2 rounded-full bg-background overflow-hidden"><motion.div className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan" initial={{ width: 0 }} animate={{ width: `${currentProfile.blurLevel}%` }} transition={{ duration: 0.8, ease: "easeOut" }} /></div>
                              <p className="text-[10px] text-muted-foreground mt-1.5">{t("dating.reveal_desc")}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" className="flex-1 h-12 rounded-xl text-base" onClick={handleSkip}><X className="w-5 h-5 mr-1 text-muted-foreground" />{t("dating.skip")}</Button>
                              <Button variant="outline" className="h-12 rounded-xl px-3 border-amber-400/40 hover:bg-amber-400/10" onClick={handleSuperLike} disabled={superLikesRemaining <= 0}>
                                <Star className={`w-5 h-5 ${superLikesRemaining > 0 ? "text-amber-400 fill-amber-400" : "text-muted-foreground"}`} />
                                <span className="text-[10px] text-muted-foreground ml-0.5">{superLikesRemaining}</span>
                              </Button>
                              <Button className="flex-1 h-12 bg-neon-coral hover:bg-neon-coral/90 text-white rounded-xl text-base" onClick={handleVibeCheck}><Zap className="w-5 h-5 mr-1" />{t("dating.vibe_check")}</Button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-2xl border border-border bg-card"><Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" /><p className="text-lg font-medium text-foreground mb-2">{t("dating.no_more")}</p><p className="text-sm text-muted-foreground">{t("dating.no_more_sub")}</p></div>
                    )}

                    <div className="mt-8 p-5 rounded-2xl border border-border bg-card/50">
                      <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-neon-coral" />{t("dating.how_it_works")}</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[{ icon: Zap, title: t("dating.how.vibe.title"), desc: t("dating.how.vibe.desc") }, { icon: ImageOff, title: t("dating.how.blur.title"), desc: t("dating.how.blur.desc") }, { icon: MessageCircle, title: t("dating.how.msg.title"), desc: t("dating.how.msg.desc") }, { icon: Users, title: t("dating.how.group.title"), desc: t("dating.how.group.desc") }].map((step, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                            <div className="w-8 h-8 rounded-lg bg-neon-coral/10 flex items-center justify-center flex-shrink-0"><step.icon className="w-4 h-4 text-neon-coral" /></div>
                            <div><p className="text-sm font-medium text-foreground">{step.title}</p><p className="text-xs text-muted-foreground mt-0.5">{step.desc}</p></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* LIKED YOU */}
                {tab === "liked" && (
                  <motion.div key="liked" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h2 className="font-display text-lg font-bold text-foreground mb-2">{lang === "zh" ? "誰喜歡了你" : "Who Liked You"}</h2>
                    <p className="text-xs text-muted-foreground mb-4">{lang === "zh" ? "呢啲用戶向你傳送咗 Vibe Check — 接受即配對！" : "These users sent you a Vibe Check — accept to match!"}</p>
                    {likedByProfiles.length > 0 ? (
                      <div className="space-y-3">
                        {likedByProfiles.map((item) => (
                          <div key={item.like_id} className={`p-4 rounded-2xl border bg-card overflow-hidden ${item.is_super ? "border-amber-400/40 ring-1 ring-amber-400/20" : "border-border"}`}>
                            <div className="flex items-center gap-4">
                              <BlurredAvatar blurLevel={0} mbti={item.profile.mbti} size="md" avatarUrl={item.profile.avatar_url} photos={item.profile.photos} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-display font-bold text-foreground">{item.profile.mbti} {genderSign(item.profile.gender)}</span>
                                  {item.is_super && <span className="px-1.5 py-0.5 rounded-full bg-amber-400/15 text-amber-500 text-[10px] font-bold flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-current" />Super</span>}
                                </div>
                                <p className="text-xs text-muted-foreground truncate">{item.profile.institution}{item.profile.faculty ? ` · ${item.profile.faculty}` : ""}</p>
                                {item.profile.bio && <p className="text-xs text-foreground mt-1 line-clamp-2">{item.profile.bio}</p>}
                                {item.profile.interests.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {item.profile.interests.slice(0, 4).map(i => <span key={i} className="px-1.5 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground">{i}</span>)}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-3">
                              <Button variant="outline" className="flex-1 h-9 rounded-xl text-sm" onClick={() => setLikedByProfiles(prev => prev.filter(p => p.like_id !== item.like_id))}>
                                <X className="w-4 h-4 mr-1 text-muted-foreground" />{lang === "zh" ? "略過" : "Skip"}
                              </Button>
                              <Button className="flex-1 h-9 bg-neon-coral hover:bg-neon-coral/90 text-white rounded-xl text-sm" onClick={() => handleLikedByAccept(item.profile.id)}>
                                <Heart className="w-4 h-4 mr-1" />{lang === "zh" ? "接受配對" : "Accept"}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-16 rounded-2xl border border-border bg-card">
                        <Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
                        <p className="text-lg font-medium text-foreground mb-2">{lang === "zh" ? "暫時冇人" : "No one yet"}</p>
                        <p className="text-sm text-muted-foreground">{lang === "zh" ? "繼續完善你嘅檔案，吸引更多人！" : "Keep improving your profile to attract more people!"}</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* MATCHES */}
                {tab === "matches" && (
                  <motion.div key="matches" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h2 className="font-display text-lg font-bold text-foreground mb-2">{t("dating.matches.title")}</h2>
                    <p className="text-xs text-muted-foreground mb-3">{t("dating.matches.subtitle")}</p>
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-neon-coral/5 border border-neon-coral/15 mb-4">
                      <Timer className="w-4 h-4 text-neon-coral flex-shrink-0" />
                      <p className="text-xs text-muted-foreground">{lang === "zh" ? "配對會喺 48 小時後過期。盡快傾偈！" : "Matches expire after 48 hours. Start chatting!"}</p>
                    </div>
                    <div className="space-y-2">
                      {matchedProfiles.map((profile) => {
                        const timeLeft = getTimeRemaining(profile.matchedAt);
                        if (timeLeft.expired) return null;
                        return (
                        <button key={profile.id} onClick={() => { setActiveChatId(profile.id); setActiveMatchId((profile as any)._matchId || profile.id); }} className={`w-full flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-all text-left group ${timeLeft.urgent ? "border-destructive/40" : "border-border"}`}>
                          <div className="relative">
                            <BlurredAvatar blurLevel={profile.blurLevel} mbti={profile.mbti} size="md" avatarUrl={profile.avatar_url} photos={profile.photos} />
                            {(profile.unread || 0) > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-neon-coral text-white text-[10px] font-bold flex items-center justify-center">{profile.unread}</div>}
                            {getOnlineStatus(profile.last_seen || null, lang).online && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-neon-emerald border-2 border-card" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-display font-bold text-sm text-foreground">{profile.mbti} {genderSign(profile.gender)}</span><span className="text-xs text-muted-foreground">· {profile.institution}</span>{getOnlineStatus(profile.last_seen || null, lang).online && <span className="text-[10px] text-neon-emerald font-medium">{lang === "zh" ? "在線" : "Online"}</span>}</div><span className="text-[10px] text-muted-foreground">{profile.lastMessageTime}</span></div>
                            <p className="text-xs text-muted-foreground mt-0.5">{profile.major}</p>
                            {profile.lastMessage && <p className={`text-sm mt-1.5 truncate ${(profile.unread || 0) > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>{profile.lastMessage}</p>}
                            <div className="flex items-center gap-3 mt-2">
                              <div className="flex items-center gap-1.5"><div className="h-1 w-12 rounded-full bg-muted overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan" style={{ width: `${profile.blurLevel}%` }} /></div><span className="text-[10px] text-muted-foreground">{profile.blurLevel}%</span></div>
                              <span className="text-[10px] text-neon-coral font-medium">{profile.messages}/20 {t("dating.messages_short")}</span>
                              <span className={`text-[10px] font-medium flex items-center gap-0.5 ml-auto ${timeLeft.urgent ? "text-destructive" : "text-muted-foreground"}`}><Timer className="w-3 h-3" />{timeLeft.hours}h {timeLeft.minutes}m</span>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        );
                      })}
                      {matchedProfiles.length === 0 && (
                        <div className="text-center py-16 rounded-2xl border border-border bg-card"><Heart className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" /><p className="text-lg font-medium text-foreground mb-2">{t("dating.matches.no_matches")}</p><p className="text-sm text-muted-foreground mb-4">{t("dating.matches.go_discover")}</p><Button onClick={() => setTab("discover")} className="bg-neon-coral hover:bg-neon-coral/90 text-white">{t("dating.matches.start")}</Button></div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* PROFILE */}
                {tab === "profile" && (
                  <motion.div key="profile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <h2 className="font-display text-lg font-bold text-foreground mb-2">{t("dating.profile.title")}</h2>
                    <p className="text-xs text-muted-foreground mb-6">{t("dating.profile.subtitle")}</p>
                    <div className="space-y-6">
                      {/* Photo Upload - 5 slots */}
                      <div className="p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1.5"><Camera className="w-4 h-4 text-neon-coral" />{lang === "zh" ? "交友相片" : "Dating Photos"}</label>
                        <p className="text-xs text-muted-foreground mb-3">{lang === "zh" ? "最多上傳5張相片，配對時會模糊處理，聊天越多越清晰。左右滑動瀏覽" : "Upload up to 5 photos — they start blurred and reveal as you chat. Swipe to browse"}</p>
                        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
                        <div className="grid grid-cols-3 gap-2">
                          {[0, 1, 2, 3, 4].map((idx) => {
                            const photos = user?.photos || [];
                            const photoUrl = photos[idx];
                            const isUploading = uploadingPhoto && uploadingPhotoIndex === idx;
                            return (
                              <div key={idx} className={`relative rounded-xl overflow-hidden bg-muted border-2 border-dashed transition-all ${idx === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"} ${photoUrl ? "border-transparent" : "border-border hover:border-neon-coral/40"}`}>
                                {photoUrl ? (
                                  <>
                                    <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                                    <button onClick={() => handleDeletePhotoAt(idx)}
                                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => triggerPhotoUpload(idx)}
                                      className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
                                      <Upload className="w-3 h-3" />
                                    </button>
                                  </>
                                ) : (
                                  <button onClick={() => triggerPhotoUpload(idx)} disabled={uploadingPhoto}
                                    className="w-full h-full flex flex-col items-center justify-center text-muted-foreground hover:text-neon-coral transition-colors disabled:opacity-50">
                                    <Camera className={idx === 0 ? "w-8 h-8 mb-1" : "w-5 h-5"} />
                                    {idx === 0 && <span className="text-[10px] font-medium">{lang === "zh" ? "主相片" : "Main"}</span>}
                                  </button>
                                )}
                                {isUploading && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  </div>
                                )}
                                {idx === 0 && !photoUrl && (
                                  <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded bg-neon-coral/80 text-white text-[9px] font-medium">
                                    {lang === "zh" ? "必填" : "Required"}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2 text-center">{lang === "zh" ? "JPEG / PNG · 每張最大 5MB · 最多 5 張" : "JPEG / PNG · Max 5MB each · Up to 5 photos"}</p>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-medium text-foreground mb-3 block">{t("dating.profile.sexuality")}</label>
                        <div className="flex flex-wrap gap-2">
                          {SEXUALITY_OPTIONS.map((opt) => (<button key={opt.key} onClick={() => toggleSexuality(opt.key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedSexuality.includes(opt.key) ? "bg-neon-lavender text-white shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{lang === "zh" ? opt.zh : opt.en}</button>))}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-medium text-foreground mb-3 block">{t("dating.profile.mbti")}</label>
                        <div className="grid grid-cols-4 gap-2">
                          {MBTI_TYPES.map((type) => (<button key={type} onClick={() => setSelectedMbti(type)} className={`py-2.5 rounded-lg text-xs font-bold transition-all ${selectedMbti === type ? "bg-neon-coral text-white shadow-md scale-105" : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"}`}>{type}</button>))}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-medium text-foreground mb-1 block">{t("dating.profile.interests")}</label>
                        <p className="text-xs text-muted-foreground mb-3">{t("dating.profile.selected")} {selectedInterests.length}/6（{t("dating.profile.min")} 3）</p>
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
                      {/* Icebreaker Prompts */}
                      <div className="p-4 rounded-xl border border-border bg-card">
                        <label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1.5"><MessageSquare className="w-4 h-4 text-neon-lavender" />{lang === "zh" ? "破冰問題" : "Icebreaker Prompts"}</label>
                        <p className="text-xs text-muted-foreground mb-3">{lang === "zh" ? "回答 1-2 個問題，畀人更容易開始傾偈" : "Answer 1-2 prompts so others can start a conversation"}</p>
                        {selectedIcebreakers.map((ib, idx) => {
                          const prompt = ICEBREAKER_PROMPTS.find(p => p.key === ib.prompt);
                          return (
                            <div key={idx} className="mb-3 p-3 rounded-xl bg-neon-lavender/5 border border-neon-lavender/15">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-neon-lavender">{prompt ? (lang === "zh" ? prompt.zh : prompt.en) : ib.prompt}</p>
                                <button onClick={() => setSelectedIcebreakers(prev => prev.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                              </div>
                              {editingIcebreakerIdx === idx ? (
                                <div className="flex gap-2">
                                  <input type="text" value={ib.answer} onChange={(e) => setSelectedIcebreakers(prev => prev.map((item, i) => i === idx ? { ...item, answer: e.target.value } : item))}
                                    className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground outline-none focus:border-neon-lavender" maxLength={100} autoFocus
                                    onKeyDown={(e) => { if (e.key === "Enter") setEditingIcebreakerIdx(null); }} />
                                  <button onClick={() => setEditingIcebreakerIdx(null)} className="px-3 py-2 rounded-lg bg-neon-lavender text-white text-xs font-medium">✓</button>
                                </div>
                              ) : (
                                <p className="text-sm text-foreground cursor-pointer hover:text-neon-lavender transition-colors" onClick={() => setEditingIcebreakerIdx(idx)}>{ib.answer || (lang === "zh" ? "點擊輸入你嘅回答..." : "Tap to write your answer...")}</p>
                              )}
                            </div>
                          );
                        })}
                        {selectedIcebreakers.length < 2 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] text-muted-foreground">{lang === "zh" ? "揀一個問題：" : "Pick a prompt:"}</p>
                            <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto">
                              {ICEBREAKER_PROMPTS.filter(p => !selectedIcebreakers.some(ib => ib.prompt === p.key)).map(p => (
                                <button key={p.key} onClick={() => { setSelectedIcebreakers(prev => [...prev, { prompt: p.key, answer: "" }]); setEditingIcebreakerIdx(selectedIcebreakers.length); }}
                                  className="text-left px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all flex items-center gap-2">
                                  <Plus className="w-3 h-3 flex-shrink-0" />{lang === "zh" ? p.zh : p.en}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <Button onClick={handleSaveProfile} className="w-full h-12 bg-neon-coral hover:bg-neon-coral/90 text-white font-medium rounded-xl text-base">{t("dating.profile.save")}</Button>
                      {profileSetup && (
                        <>
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl bg-neon-emerald/10 border border-neon-emerald/20"><p className="text-sm text-neon-emerald font-medium">{t("dating.profile.active")}</p></motion.div>
                          <button onClick={() => setShowPreview(!showPreview)} className="w-full h-12 rounded-xl font-medium text-sm border border-neon-cyan/30 bg-neon-cyan/5 text-neon-cyan hover:bg-neon-cyan/10 transition-all flex items-center justify-center gap-2">
                            <Eye className="w-4 h-4" />{showPreview ? (lang === "zh" ? "收起預覽" : "Hide Preview") : (lang === "zh" ? "預覽我的交友檔案" : "👁 Preview My Profile as Others See It")}
                          </button>
                        </>
                      )}
                      {showPreview && profileSetup && (
                        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
                          <p className="text-xs text-muted-foreground mb-3 text-center">{lang === "zh" ? "↓ 其他用戶會見到以下畫面 ↓" : "↓ This is what others see ↓"}</p>
                          <div className="rounded-2xl border-2 border-dashed border-neon-cyan/30 p-3">
                            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                              <BlurredAvatar blurLevel={85} mbti={selectedMbti} size="lg" avatarUrl={user?.avatar_url} photos={user?.photos} />
                              <div className="p-5">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2"><span className="font-display text-xl font-bold text-foreground">{selectedMbti} {user?.gender === "male" ? "♂" : user?.gender === "female" ? "♀" : "⚧"}</span><span className="text-sm text-muted-foreground">· {user?.institution || user?.school || "Your School"}</span></div>
                                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-emerald/10 text-neon-emerald text-xs font-semibold"><Sparkles className="w-3 h-3" />—%</div>
                                </div>
                                <p className="text-sm text-muted-foreground mb-3">{user?.faculty || ""}</p>
                                {user?.bio && <p className="text-sm text-foreground mb-4 leading-relaxed">{user.bio}</p>}
                                {selectedIcebreakers.filter(ib => ib.answer).map((ib, idx) => {
                                  const prompt = ICEBREAKER_PROMPTS.find(p => p.key === ib.prompt);
                                  return (
                                    <div key={idx} className="p-3 rounded-xl bg-neon-lavender/5 border border-neon-lavender/15 mb-2">
                                      <p className="text-[11px] font-medium text-neon-lavender mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" />{prompt ? (lang === "zh" ? prompt.zh : prompt.en) : ib.prompt}</p>
                                      <p className="text-sm text-foreground">{ib.answer}</p>
                                    </div>
                                  );
                                })}
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {selectedSexuality.filter(s => s !== "prefer_not_to_say").map(s => {
                                    const opt = SEXUALITY_OPTIONS.find(o => o.key === s);
                                    return opt ? <span key={s} className="inline-flex items-center px-2.5 py-1 rounded-full bg-neon-lavender/10 text-neon-lavender text-xs font-medium">{lang === "zh" ? opt.zh : opt.en}</span> : null;
                                  })}
                                  {selectedInterests.map(key => {
                                    const item = INTEREST_OPTIONS.find(i => i.key === key);
                                    return item ? <span key={key} className="px-2.5 py-1 rounded-full bg-muted text-xs text-muted-foreground font-medium">{lang === "zh" ? item.zh : key}</span> : null;
                                  })}
                                </div>
                                <div className="p-3 rounded-xl bg-muted/50">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2"><span className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> {t("dating.photo_clarity")}</span><span className="font-medium">85%</span></div>
                                  <div className="h-2 rounded-full bg-background overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-neon-coral to-neon-cyan" style={{ width: "85%" }} /></div>
                                  <p className="text-[10px] text-muted-foreground mt-1.5">{lang === "zh" ? "你嘅相片會模糊處理" : "Your photo will be blurred"}</p>
                                </div>
                                <div className="flex gap-3 mt-4">
                                  <div className="flex-1 h-12 rounded-xl border border-border flex items-center justify-center text-base text-muted-foreground"><X className="w-5 h-5 mr-2" />{t("dating.skip")}</div>
                                  <div className="flex-1 h-12 rounded-xl bg-neon-coral/20 flex items-center justify-center text-base text-neon-coral"><Zap className="w-5 h-5 mr-2" />{t("dating.vibe_check")}</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav — hidden when in chat */}
      {!activeChatId && (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Home className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.feed")}</span></a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral"><HeartHandshake className="w-5 h-5" /><span className="text-[10px] font-medium">{t("feed.nav.dating")}</span></a>
          <a href="/tools" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Wrench className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.tools")}</span></a>
          <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><User className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.profile")}</span></a>
        </div>
      </div>
      )}
    </div>
  );
}
