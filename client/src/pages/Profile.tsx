import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, LogOut, User, Globe, Moon, Sun, Home, HeartHandshake, Wrench,
  Mail, School, BookOpen, MapPin, Calendar, Edit3, Save, X, Palette, Check
} from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, COLOR_THEMES } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { getUser, updateStoredUser, updateProfile, type User as UserType } from "@/lib/auth";

const SCHOOLS = ["HKU", "CUHK", "HKUST", "PolyU", "CityU", "HKBU", "LU", "EdUHK", "Others"];
const FACULTIES = ["建築 Architecture", "文學 Arts", "商學 Business", "牙醫 Dentistry", "教育 Education", "工程 Engineering", "法律 Law", "醫學 Medicine", "理學 Science", "社會科學 Social Sciences", "創意媒體 Creative Media", "設計 Design", "新聞 Journalism", "翻譯 Translation", "其他 Others"];
const GENDERS = [
  { value: "male", labelZh: "♂ 男", labelEn: "♂ Male" },
  { value: "female", labelZh: "♀ 女", labelEn: "♀ Female" },
  { value: "nonbinary", labelZh: "⚧ 非二元", labelEn: "⚧ Non-binary" },
];
const DISTRICTS = [
  "中西區", "灣仔區", "東區", "南區", "油尖旺區", "深水埗區", "九龍城區",
  "黃大仙區", "觀塘區", "葵青區", "荃灣區", "屯門區", "元朗區", "北區",
  "大埔區", "沙田區", "西貢區", "離島區"
];

export default function Profile() {
  const { user, isLoggedIn, logout: doLogout, refreshUser } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, colorTheme, toggleTheme, setColorTheme } = useTheme();
  const [, setLocation] = useLocation();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile form state (account info only — dating fields are in Dating profile tab)
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState("");
  const [school, setSchool] = useState("");
  const [faculty, setFaculty] = useState("");
  const [district, setDistrict] = useState("");
  const [age, setAge] = useState("");

  useEffect(() => {
    if (user) {
      const stored = getUser() as any;
      // FIX: handle both display_name and displayName keys
      setDisplayName(stored?.display_name || stored?.displayName || user.username || "");
      setGender(stored?.gender || "");
      setSchool(stored?.school || "");
      setFaculty(stored?.faculty || "");
      setDistrict(stored?.district || "");
      setAge(stored?.age?.toString() || "");
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
      school,
      faculty,
      district,
      age: age ? parseInt(age) : null,
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

  const selectClass = "w-full h-10 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:border-primary/70 focus:ring-2 focus:ring-primary/20 outline-none transition-all";
  const inputClass = selectClass;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-card/50 p-4">
          <a href="/" className="flex items-center gap-2.5 mb-8 px-2">
            <div className="w-8 h-8 rounded-lg bg-neon-coral flex items-center justify-center"><Shield className="w-4.5 h-4.5 text-white" /></div>
            <span className="font-display text-lg font-bold tracking-tight text-foreground">UniGo<span className="text-neon-coral"> HK</span></span>
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
              <span className="font-display text-base font-bold text-foreground">UniGo<span className="text-neon-coral"> HK</span></span>
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
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-white text-2xl font-bold">
                  {(displayName || user?.username || "U").charAt(0).toUpperCase()}
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground">{displayName || user?.username}</h2>
              <p className="text-sm text-muted-foreground">@{user?.username}</p>
              <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                <Mail className="w-3 h-3" /> {user?.email}
              </p>
              {!editing && (
                <button onClick={() => setEditing(true)} className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors">
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
                          className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${gender === g.value ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}
                        >{lang === "zh" ? g.labelZh : g.labelEn}</button>
                      ))}
                    </div>
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

                  {/* Dating hint */}
                  <div className="p-3 rounded-xl bg-neon-coral/5 border border-neon-coral/15">
                    <p className="text-xs text-muted-foreground">{lang === "zh" ? "💡 交友相關設定（MBTI、興趣、性取向、簡介等）請到「交友」頁面嘅個人檔案分頁修改" : "💡 Dating settings (MBTI, interests, sexuality, bio, etc.) can be edited in the Dating page → Profile tab"}</p>
                  </div>

                  {/* Save */}
                  <button onClick={handleSave} disabled={saving}
                    className="w-full py-3 rounded-xl font-semibold text-white bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" /> {saving ? (lang === "zh" ? "儲存中..." : "Saving...") : (lang === "zh" ? "儲存" : "Save")}
                  </button>
                </div>
              ) : (
                /* View mode */
                <div className="space-y-4">
                  <h3 className="font-bold text-foreground mb-3">{lang === "zh" ? "帳戶資料" : "Account Info"}</h3>
                  
                  {[
                    { icon: Mail, label: lang === "zh" ? "電郵" : "Email", value: user?.email || "" },
                    { icon: User, label: lang === "zh" ? "性別" : "Gender", value: gender ? GENDERS.find(g => g.value === gender)?.[lang === "zh" ? "labelZh" : "labelEn"] : "" },
                    { icon: Calendar, label: lang === "zh" ? "年齡" : "Age", value: age },
                    { icon: School, label: lang === "zh" ? "院校" : "School", value: school },
                    { icon: BookOpen, label: lang === "zh" ? "學院" : "Faculty", value: faculty },
                    { icon: MapPin, label: lang === "zh" ? "地區" : "District", value: district },
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

                  {/* Link to dating profile */}
                  <a href="/dating" className="block mt-2 p-3 rounded-xl bg-neon-coral/5 border border-neon-coral/15 text-center hover:bg-neon-coral/10 transition-colors">
                    <p className="text-sm font-medium text-neon-coral">{lang === "zh" ? "💕 編輯交友檔案" : "💕 Edit Dating Profile"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{lang === "zh" ? "MBTI、興趣、性取向、簡介、相片等" : "MBTI, interests, sexuality, bio, photos, etc."}</p>
                  </a>
                </div>
              )}
            </motion.div>

            {/* Color Theme Picker */}
            {!editing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="mt-4 rounded-xl border border-border bg-card p-5"
              >
                <h3 className="font-bold text-foreground mb-1 flex items-center gap-2">
                  <Palette className="w-4 h-4 text-primary" /> {lang === "zh" ? "主題色彩" : "Theme Color"}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">{lang === "zh" ? "選擇你喜歡的配色方案" : "Choose your preferred color scheme"}</p>
                <div className="grid grid-cols-3 gap-2">
                  {COLOR_THEMES.map(ct => (
                    <button
                      key={ct.id}
                      onClick={() => setColorTheme(ct.id)}
                      className={`relative flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        colorTheme === ct.id
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                    >
                      <span className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-black/10" style={{ background: ct.preview }} />
                      <span className="truncate">{lang === "zh" ? ct.label.zh : ct.label.en}</span>
                      {colorTheme === ct.id && <Check className="w-3 h-3 text-primary absolute top-1.5 right-1.5" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

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
