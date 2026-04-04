import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, LogOut, User, Globe, Moon, Sun, Home, HeartHandshake, Wrench,
  Mail, School, BookOpen, MapPin, Heart, Brain, Calendar, Edit3, Save, X, Camera
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { getUser, updateStoredUser, updateProfile, type User as UserType } from "@/lib/auth";

const SCHOOLS = ["HKU", "CUHK", "HKUST", "PolyU", "CityU", "HKBU", "LU", "EdUHK", "Others"];
const FACULTIES = ["建築 Architecture", "文學 Arts", "商學 Business", "牙醫 Dentistry", "教育 Education", "工程 Engineering", "法律 Law", "醫學 Medicine", "理學 Science", "社會科學 Social Sciences", "創意媒體 Creative Media", "設計 Design", "新聞 Journalism", "翻譯 Translation", "其他 Others"];
const MBTI_TYPES = ["INTJ", "INTP", "ENTJ", "ENTP", "INFJ", "INFP", "ENFJ", "ENFP", "ISTJ", "ISFJ", "ESTJ", "ESFJ", "ISTP", "ISFP", "ESTP", "ESFP"];
const GENDERS = [
  { value: "male", labelZh: "♂ 男", labelEn: "♂ Male" },
  { value: "female", labelZh: "♀ 女", labelEn: "♀ Female" },
  { value: "nonbinary", labelZh: "⚧ 非二元", labelEn: "⚧ Non-binary" },
];
const SEXUALITIES = [
  { value: "straight", zh: "異性戀", en: "Straight" },
  { value: "gay", zh: "男同性戀", en: "Gay" },
  { value: "lesbian", zh: "女同性戀", en: "Lesbian" },
  { value: "bisexual", zh: "雙性戀", en: "Bisexual" },
  { value: "pansexual", zh: "泛性戀", en: "Pansexual" },
  { value: "asexual", zh: "無性戀", en: "Asexual" },
  { value: "queer", zh: "酷兒", en: "Queer" },
  { value: "unsure", zh: "未確定", en: "Unsure" },
];
const DISTRICTS = [
  "中西區", "灣仔區", "東區", "南區", "油尖旺區", "深水埗區", "九龍城區",
  "黃大仙區", "觀塘區", "葵青區", "荃灣區", "屯門區", "元朗區", "北區",
  "大埔區", "沙田區", "西貢區", "離島區"
];
const RELIGIONS = [
  { value: "none", zh: "無宗教", en: "None" },
  { value: "christian", zh: "基督教", en: "Christian" },
  { value: "catholic", zh: "天主教", en: "Catholic" },
  { value: "buddhist", zh: "佛教", en: "Buddhist" },
  { value: "taoist", zh: "道教", en: "Taoist" },
  { value: "islam", zh: "伊斯蘭教", en: "Islam" },
  { value: "hindu", zh: "印度教", en: "Hindu" },
  { value: "spiritual", zh: "有靈性信仰", en: "Spiritual" },
  { value: "other", zh: "其他", en: "Other" },
  { value: "private", zh: "不願透露", en: "Prefer not to say" },
];
const RELATIONSHIP_TYPES = [
  { value: "long", zh: "長期關係", en: "Long-term" },
  { value: "short", zh: "短期關係", en: "Short-term" },
  { value: "casual", zh: "隨意交往", en: "Casual" },
  { value: "friends", zh: "先做朋友", en: "Friends first" },
  { value: "unsure", zh: "未確定", en: "Unsure" },
];
const INTERESTS = [
  { key: "music", emoji: "🎵", zh: "音樂", en: "Music" },
  { key: "movies", emoji: "🎬", zh: "電影", en: "Movies" },
  { key: "gaming", emoji: "🎮", zh: "遊戲", en: "Gaming" },
  { key: "sports", emoji: "⚽", zh: "運動", en: "Sports" },
  { key: "travel", emoji: "✈️", zh: "旅行", en: "Travel" },
  { key: "food", emoji: "🍜", zh: "美食", en: "Food" },
  { key: "reading", emoji: "📚", zh: "閱讀", en: "Reading" },
  { key: "art", emoji: "🎨", zh: "藝術", en: "Art" },
  { key: "photography", emoji: "📷", zh: "攝影", en: "Photography" },
  { key: "fitness", emoji: "💪", zh: "健身", en: "Fitness" },
  { key: "coding", emoji: "💻", zh: "編程", en: "Coding" },
  { key: "anime", emoji: "🌸", zh: "動漫", en: "Anime" },
  { key: "kpop", emoji: "🎤", zh: "K-Pop", en: "K-Pop" },
  { key: "hiking", emoji: "🥾", zh: "行山", en: "Hiking" },
  { key: "cooking", emoji: "🍳", zh: "烹飪", en: "Cooking" },
  { key: "pets", emoji: "🐾", zh: "寵物", en: "Pets" },
];

export default function Profile() {
  const { user, isLoggedIn, logout: doLogout, refreshUser } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile form state
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [sexuality, setSexuality] = useState("");
  const [school, setSchool] = useState("");
  const [faculty, setFaculty] = useState("");
  const [district, setDistrict] = useState("");
  const [mbti, setMbti] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [relationshipType, setRelationshipType] = useState("");
  const [religion, setReligion] = useState("");
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      const stored = getUser() as any;
      // FIX: handle both display_name and displayName keys
      setDisplayName(stored?.display_name || stored?.displayName || user.username || "");
      setGender(stored?.gender || "");
      setSexuality(stored?.sexuality || "");
      setSchool(stored?.school || "");
      setFaculty(stored?.faculty || "");
      setDistrict(stored?.district || "");
      setMbti(stored?.mbti || "");
      setAge(stored?.age?.toString() || "");
      setBio(stored?.bio || "");
      setRelationshipType(stored?.relationship_type || "");
      setReligion(stored?.religion || "");
      setInterests(stored?.interests || []);
    }
  }, [user]);

  if (!isLoggedIn) {
    setLocation("/login");
    return null;
  }

  const handleSave = async () => {
    setSaving(true);

    const updates: Record<string, any> = {
      display_name: displayName,
      gender,
      sexuality,
      school,
      faculty,
      district,
      mbti,
      age: age ? parseInt(age) : null,
      bio,
      relationship_type: relationshipType,
      religion,
      interests,
    };

    try {
      // FIX: Use the centralized updateProfile from auth.ts
      const result = await updateProfile(updates);

      if (result) {
        // API succeeded — localStorage already updated by updateProfile()
        toast.success(lang === "zh" ? "個人資料已更新！" : "Profile updated!");
      } else {
        // API failed — save locally as fallback
        updateStoredUser(updates as any);
        toast.success(lang === "zh" ? "個人資料已本地儲存！" : "Profile saved locally!");
      }
    } catch {
      // Network error — save locally as fallback
      updateStoredUser(updates as any);
      toast.success(lang === "zh" ? "個人資料已本地儲存！" : "Profile saved locally!");
    }

    refreshUser();
    setEditing(false);
    setSaving(false);
  };

  const toggleInterest = (key: string) => {
    setInterests(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const selectClass = "w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 outline-none transition-all";
  const inputClass = selectClass;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-card/50 p-4">
          <a href="/" className="flex items-center gap-2.5 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-4.5 h-4.5 text-white" /></div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">UniVibe<span className="text-neon-coral"> HK</span></span>
          </a>
          <nav className="flex-1 space-y-1">
            <a href="/feed" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><Home className="w-4 h-4" /> {t("feed.nav.feed")}</a>
            <a href="/dating" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><HeartHandshake className="w-4 h-4" /> {t("feed.nav.dating")}</a>
            <a href="/tools" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm"><Wrench className="w-4 h-4" /> {t("feed.nav.tools")}</a>
            <a href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neon-coral/10 text-neon-coral font-medium text-sm"><User className="w-4 h-4" /> {t("feed.nav.profile")}</a>
          </nav>
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2 px-2">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}><Globe className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            </div>
            <button onClick={() => { doLogout(); setLocation("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm w-full"><LogOut className="w-4 h-4" /> {t("feed.nav.logout")}</button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-h-screen pb-20 lg:pb-0">
          {/* Mobile top bar */}
          <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-white" /></div>
              <span className="font-display text-base font-bold text-foreground">UniVibe<span className="text-neon-coral"> HK</span></span>
            </a>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}><Globe className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto px-4 py-6">
            {/* Profile Header */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
              <div className="relative inline-block mb-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                  {(displayName || user?.username || "U").charAt(0).toUpperCase()}
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground">{displayName || user?.username}</h2>
              <p className="text-sm text-muted-foreground">@{user?.username}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Mail className="w-3 h-3" /> {user?.email}
              </p>
              {!editing && (
                <button onClick={() => setEditing(true)} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 transition-colors">
                  <Edit3 className="w-4 h-4" /> {lang === "zh" ? "編輯個人資料" : "Edit Profile"}
                </button>
              )}
            </motion.div>

            {/* Profile Info / Edit Form */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-card p-5"
            >
              {editing ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-foreground">{lang === "zh" ? "編輯資料" : "Edit Profile"}</h3>
                    <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
                  </div>

                  {/* Display Name */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "顯示名稱" : "Display Name"}</label>
                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputClass} maxLength={30} />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{lang === "zh" ? "性別" : "Gender"}</label>
                    <div className="flex gap-2">
                      {GENDERS.map(g => (
                        <button key={g.value} onClick={() => setGender(g.value)}
                          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${gender === g.value ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                        >{lang === "zh" ? g.labelZh : g.labelEn}</button>
                      ))}
                    </div>
                  </div>

                  {/* Sexuality */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "性取向" : "Sexuality"}</label>
                    <select value={sexuality} onChange={e => setSexuality(e.target.value)} className={selectClass}>
                      <option value="">{lang === "zh" ? "選擇..." : "Select..."}</option>
                      {SEXUALITIES.map(s => <option key={s.value} value={s.value}>{lang === "zh" ? s.zh : s.en}</option>)}
                    </select>
                  </div>

                  {/* Age */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "年齡" : "Age"}</label>
                    <input type="number" value={age} onChange={e => setAge(e.target.value)} min={16} max={40} className={inputClass} placeholder="e.g. 21" />
                  </div>

                  {/* School */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "院校" : "School"}</label>
                    <select value={school} onChange={e => setSchool(e.target.value)} className={selectClass}>
                      <option value="">{lang === "zh" ? "選擇院校..." : "Select school..."}</option>
                      {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Faculty */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "學院" : "Faculty"}</label>
                    <select value={faculty} onChange={e => setFaculty(e.target.value)} className={selectClass}>
                      <option value="">{lang === "zh" ? "選擇學院..." : "Select faculty..."}</option>
                      {FACULTIES.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>

                  {/* District */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "地區" : "District"}</label>
                    <select value={district} onChange={e => setDistrict(e.target.value)} className={selectClass}>
                      <option value="">{lang === "zh" ? "選擇地區..." : "Select district..."}</option>
                      {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>

                  {/* MBTI */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">MBTI</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {MBTI_TYPES.map(m => (
                        <button key={m} onClick={() => setMbti(m)}
                          className={`py-1.5 rounded-lg text-xs font-medium transition-all ${mbti === m ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                        >{m}</button>
                      ))}
                    </div>
                  </div>

                  {/* Relationship Type */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "關係類型" : "Relationship Type"}</label>
                    <select value={relationshipType} onChange={e => setRelationshipType(e.target.value)} className={selectClass}>
                      <option value="">{lang === "zh" ? "選擇..." : "Select..."}</option>
                      {RELATIONSHIP_TYPES.map(r => <option key={r.value} value={r.value}>{lang === "zh" ? r.zh : r.en}</option>)}
                    </select>
                  </div>

                  {/* Religion */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "宗教" : "Religion"}</label>
                    <select value={religion} onChange={e => setReligion(e.target.value)} className={selectClass}>
                      <option value="">{lang === "zh" ? "選擇..." : "Select..."}</option>
                      {RELIGIONS.map(r => <option key={r.value} value={r.value}>{lang === "zh" ? r.zh : r.en}</option>)}
                    </select>
                  </div>

                  {/* Bio */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "個人簡介" : "Bio"}</label>
                    <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={200}
                      className="w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none focus:border-rose-400 focus:ring-2 focus:ring-rose-400/20 outline-none"
                      placeholder={lang === "zh" ? "介紹一下你自己..." : "Tell us about yourself..."}
                    />
                    <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
                  </div>

                  {/* Interests */}
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1.5">{lang === "zh" ? "興趣" : "Interests"}</label>
                    <div className="flex flex-wrap gap-2">
                      {INTERESTS.map(item => (
                        <button key={item.key} onClick={() => toggleInterest(item.key)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${interests.includes(item.key) ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                        >{item.emoji} {lang === "zh" ? item.zh : item.en}</button>
                      ))}
                    </div>
                  </div>

                  {/* Save */}
                  <button onClick={handleSave} disabled={saving}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 shadow-lg shadow-rose-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" /> {saving ? (lang === "zh" ? "儲存中..." : "Saving...") : (lang === "zh" ? "儲存" : "Save")}
                  </button>
                </div>
              ) : (
                /* View mode */
                <div className="space-y-4">
                  <h3 className="font-bold text-foreground mb-3">{lang === "zh" ? "個人資料" : "Profile Info"}</h3>
                  
                  {[
                    { icon: User, label: lang === "zh" ? "性別" : "Gender", value: gender ? GENDERS.find(g => g.value === gender)?.[lang === "zh" ? "labelZh" : "labelEn"] : "" },
                    { icon: Heart, label: lang === "zh" ? "性取向" : "Sexuality", value: sexuality ? SEXUALITIES.find(s => s.value === sexuality)?.[lang === "zh" ? "zh" : "en"] : "" },
                    { icon: Calendar, label: lang === "zh" ? "年齡" : "Age", value: age },
                    { icon: School, label: lang === "zh" ? "院校" : "School", value: school },
                    { icon: BookOpen, label: lang === "zh" ? "學院" : "Faculty", value: faculty },
                    { icon: MapPin, label: lang === "zh" ? "地區" : "District", value: district },
                    { icon: Brain, label: "MBTI", value: mbti },
                    { icon: Heart, label: lang === "zh" ? "關係類型" : "Relationship", value: relationshipType ? RELATIONSHIP_TYPES.find(r => r.value === relationshipType)?.[lang === "zh" ? "zh" : "en"] : "" },
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                        <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-muted-foreground w-20 flex-shrink-0">{item.label}</span>
                        <span className="text-sm text-foreground">{item.value || (lang === "zh" ? "未設定" : "Not set")}</span>
                      </div>
                    );
                  })}

                  {bio && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-1">{lang === "zh" ? "個人簡介" : "Bio"}</p>
                      <p className="text-sm text-foreground">{bio}</p>
                    </div>
                  )}

                  {interests.length > 0 && (
                    <div className="pt-2">
                      <p className="text-xs text-muted-foreground mb-2">{lang === "zh" ? "興趣" : "Interests"}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {interests.map(key => {
                          const item = INTERESTS.find(i => i.key === key);
                          return item ? (
                            <span key={key} className="px-2.5 py-1 rounded-full text-xs bg-rose-500/10 text-rose-500">
                              {item.emoji} {lang === "zh" ? item.zh : item.en}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Danger Zone */}
            {!editing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="mt-4 rounded-xl border border-border bg-card p-5"
              >
                <button onClick={() => { doLogout(); setLocation("/"); }}
                  className="w-full py-3 rounded-xl font-medium text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> {lang === "zh" ? "登出" : "Log Out"}
                </button>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Home className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.feed")}</span></a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><HeartHandshake className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.dating")}</span></a>
          <a href="/tools" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Wrench className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.tools")}</span></a>
          <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral"><User className="w-5 h-5" /><span className="text-[10px] font-medium">{t("feed.nav.profile")}</span></a>
        </div>
      </div>
    </div>
  );
}
