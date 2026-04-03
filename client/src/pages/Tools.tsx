import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, Calculator, Clock, CalendarDays, BookOpen, Timer,
  DollarSign, MapPin, GraduationCap, Brain, Notebook, FileText,
  LogOut, User, Globe, Moon, Sun, Home, HeartHandshake, Wrench, X,
  Play, Pause, RotateCcw, Plus, Trash2, Check, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

type ActiveTool = null | "gpa" | "pomodoro" | "deadline" | "exam" | "expense" | "notes";

// ==================== GPA CALCULATOR ====================
function GPACalculator({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [courses, setCourses] = useState([
    { name: "", credits: 3, grade: "A" },
    { name: "", credits: 3, grade: "A" },
    { name: "", credits: 3, grade: "A" },
  ]);

  const gradePoints: Record<string, number> = {
    "A+": 4.3, "A": 4.0, "A-": 3.7,
    "B+": 3.3, "B": 3.0, "B-": 2.7,
    "C+": 2.3, "C": 2.0, "C-": 1.7,
    "D+": 1.3, "D": 1.0, "F": 0,
  };

  const gpa = () => {
    const totalCredits = courses.reduce((sum, c) => sum + c.credits, 0);
    if (totalCredits === 0) return 0;
    const totalPoints = courses.reduce((sum, c) => sum + c.credits * (gradePoints[c.grade] || 0), 0);
    return totalPoints / totalCredits;
  };

  const addCourse = () => setCourses([...courses, { name: "", credits: 3, grade: "A" }]);
  const removeCourse = (i: number) => setCourses(courses.filter((_, idx) => idx !== i));
  const updateCourse = (i: number, field: string, value: any) => {
    const updated = [...courses];
    (updated[i] as any)[field] = value;
    setCourses(updated);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">{lang === "zh" ? "GPA 計算器" : "GPA Calculator"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>

      {/* GPA Display */}
      <div className="text-center mb-6 p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20">
        <div className="text-4xl font-bold text-rose-500">{gpa().toFixed(2)}</div>
        <div className="text-sm text-muted-foreground mt-1">GPA / 4.3</div>
      </div>

      {/* Courses */}
      <div className="space-y-3 mb-4">
        {courses.map((course, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={lang === "zh" ? `科目 ${i + 1}` : `Course ${i + 1}`}
              value={course.name}
              onChange={e => updateCourse(i, "name", e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-rose-400 outline-none"
            />
            <select
              value={course.credits}
              onChange={e => updateCourse(i, "credits", Number(e.target.value))}
              className="w-16 h-9 px-2 rounded-lg bg-background border border-border text-sm text-foreground focus:border-rose-400 outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={course.grade}
              onChange={e => updateCourse(i, "grade", e.target.value)}
              className="w-16 h-9 px-2 rounded-lg bg-background border border-border text-sm text-foreground focus:border-rose-400 outline-none"
            >
              {Object.keys(gradePoints).map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {courses.length > 1 && (
              <button onClick={() => removeCourse(i)} className="text-muted-foreground hover:text-red-400">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <button onClick={addCourse} className="flex items-center gap-2 text-sm text-rose-400 hover:text-rose-300">
        <Plus className="w-4 h-4" /> {lang === "zh" ? "新增科目" : "Add Course"}
      </button>
    </div>
  );
}

// ==================== POMODORO TIMER ====================
function PomodoroTimer({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<"work" | "break">("work");
  const [sessions, setSessions] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => setTimeLeft(t => t - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
      if (mode === "work") {
        setSessions(s => s + 1);
        setMode("break");
        setTimeLeft(5 * 60);
        toast.success(lang === "zh" ? "休息時間！" : "Break time!");
      } else {
        setMode("work");
        setTimeLeft(25 * 60);
        toast.success(lang === "zh" ? "繼續專注！" : "Back to focus!");
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, timeLeft]);

  const reset = () => { setIsRunning(false); setTimeLeft(mode === "work" ? 25 * 60 : 5 * 60); };
  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = mode === "work" ? (1 - timeLeft / (25 * 60)) * 100 : (1 - timeLeft / (5 * 60)) * 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">{lang === "zh" ? "番茄鐘" : "Pomodoro Timer"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>

      <div className="text-center">
        <div className={`inline-block px-4 py-1 rounded-full text-xs font-medium mb-4 ${mode === "work" ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"}`}>
          {mode === "work" ? (lang === "zh" ? "專注時間" : "Focus") : (lang === "zh" ? "休息時間" : "Break")}
        </div>

        {/* Circular progress */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor"
              className={mode === "work" ? "text-rose-500" : "text-emerald-500"}
              strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 90}`}
              strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-5xl font-bold text-foreground tabular-nums">
              {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <button onClick={reset} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${mode === "work" ? "bg-rose-500 hover:bg-rose-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
          </button>
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <span className="text-xs font-bold text-foreground">{sessions}</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{lang === "zh" ? `已完成 ${sessions} 個番茄鐘` : `${sessions} sessions completed`}</p>
      </div>
    </div>
  );
}

// ==================== DEADLINE TRACKER ====================
function DeadlineTracker({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [deadlines, setDeadlines] = useState([
    { id: "1", title: lang === "zh" ? "COMP3230 Assignment 3" : "COMP3230 Assignment 3", date: "2026-04-15", done: false },
    { id: "2", title: lang === "zh" ? "ENGL1010 Essay" : "ENGL1010 Essay", date: "2026-04-20", done: false },
    { id: "3", title: lang === "zh" ? "MATH2011 Midterm" : "MATH2011 Midterm", date: "2026-04-25", done: false },
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  const addDeadline = () => {
    if (!newTitle || !newDate) return;
    setDeadlines([...deadlines, { id: `d_${Date.now()}`, title: newTitle, date: newDate, done: false }]);
    setNewTitle("");
    setNewDate("");
  };

  const toggleDone = (id: string) => setDeadlines(deadlines.map(d => d.id === id ? { ...d, done: !d.done } : d));
  const removeDeadline = (id: string) => setDeadlines(deadlines.filter(d => d.id !== id));

  const daysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const sorted = [...deadlines].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">{lang === "zh" ? "Deadline 追蹤器" : "Deadline Tracker"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>

      {/* Add new */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={lang === "zh" ? "新增 deadline..." : "Add deadline..."}
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-rose-400 outline-none"
          onKeyDown={e => e.key === "Enter" && addDeadline()}
        />
        <input
          type="date"
          value={newDate}
          onChange={e => setNewDate(e.target.value)}
          className="h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:border-rose-400 outline-none"
        />
        <button onClick={addDeadline} className="h-9 w-9 rounded-lg bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {sorted.map(d => {
          const days = daysUntil(d.date);
          const urgent = days <= 3 && days >= 0;
          const overdue = days < 0;
          return (
            <div key={d.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${d.done ? "bg-muted/50 border-border opacity-60" : urgent ? "bg-red-500/5 border-red-500/30" : "bg-card border-border"}`}>
              <button onClick={() => toggleDone(d.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${d.done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground"}`}>
                {d.done && <Check className="w-3 h-3 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${d.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{d.title}</p>
                <p className="text-xs text-muted-foreground">{d.date}</p>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded-full ${overdue ? "bg-red-500/10 text-red-500" : urgent ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"}`}>
                {overdue ? (lang === "zh" ? "已過期" : "Overdue") : days === 0 ? (lang === "zh" ? "今日" : "Today") : `${days}d`}
              </div>
              <button onClick={() => removeDeadline(d.id)} className="text-muted-foreground hover:text-red-400 flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">{lang === "zh" ? "暫無 deadline 🎉" : "No deadlines 🎉"}</p>
        )}
      </div>
    </div>
  );
}

// ==================== EXPENSE TRACKER ====================
function ExpenseTracker({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [expenses, setExpenses] = useState([
    { id: "1", item: lang === "zh" ? "午餐" : "Lunch", amount: 48, category: "food" },
    { id: "2", item: lang === "zh" ? "八達通增值" : "Octopus top-up", amount: 100, category: "transport" },
    { id: "3", item: lang === "zh" ? "咖啡" : "Coffee", amount: 38, category: "food" },
  ]);
  const [newItem, setNewItem] = useState("");
  const [newAmount, setNewAmount] = useState("");

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const addExpense = () => {
    if (!newItem || !newAmount) return;
    setExpenses([{ id: `e_${Date.now()}`, item: newItem, amount: Number(newAmount), category: "other" }, ...expenses]);
    setNewItem("");
    setNewAmount("");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">{lang === "zh" ? "消費記錄" : "Expense Tracker"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>

      <div className="text-center mb-4 p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/20">
        <div className="text-sm text-muted-foreground">{lang === "zh" ? "今日總支出" : "Today's Total"}</div>
        <div className="text-3xl font-bold text-rose-500">HK${total}</div>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="text" placeholder={lang === "zh" ? "項目" : "Item"} value={newItem} onChange={e => setNewItem(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-rose-400 outline-none"
          onKeyDown={e => e.key === "Enter" && addExpense()}
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <input type="number" placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)}
            className="w-24 h-9 pl-7 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:border-rose-400 outline-none"
            onKeyDown={e => e.key === "Enter" && addExpense()}
          />
        </div>
        <button onClick={addExpense} className="h-9 w-9 rounded-lg bg-rose-500 text-white flex items-center justify-center hover:bg-rose-600">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {expenses.map(e => (
          <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
            <span className="text-sm text-foreground">{e.item}</span>
            <span className="text-sm font-medium text-rose-500">-HK${e.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== MAIN TOOLS PAGE ====================
export default function Tools() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const { user, isLoggedIn, logout: doLogout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [, setLocation] = useLocation();

  if (!isLoggedIn) {
    setLocation("/login");
    return null;
  }

  const tools = [
    { key: "gpa" as ActiveTool, icon: Calculator, label: lang === "zh" ? "GPA 計算器" : "GPA Calculator", desc: lang === "zh" ? "計算你的學期 GPA" : "Calculate your semester GPA", color: "from-rose-500 to-pink-500" },
    { key: "pomodoro" as ActiveTool, icon: Timer, label: lang === "zh" ? "番茄鐘" : "Pomodoro Timer", desc: lang === "zh" ? "25分鐘專注，5分鐘休息" : "25min focus, 5min break", color: "from-orange-500 to-amber-500" },
    { key: "deadline" as ActiveTool, icon: CalendarDays, label: lang === "zh" ? "Deadline 追蹤器" : "Deadline Tracker", desc: lang === "zh" ? "追蹤作業和考試日期" : "Track assignment & exam dates", color: "from-blue-500 to-cyan-500" },
    { key: "expense" as ActiveTool, icon: DollarSign, label: lang === "zh" ? "消費記錄" : "Expense Tracker", desc: lang === "zh" ? "記錄每日支出" : "Track daily expenses", color: "from-emerald-500 to-teal-500" },
  ];

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
            <a href="/dating" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm">
              <HeartHandshake className="w-4 h-4" /> {t("feed.nav.dating")}
            </a>
            <a href="/tools" className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-neon-coral/10 text-neon-coral font-medium text-sm">
              <Wrench className="w-4 h-4" /> {t("feed.nav.tools")}
            </a>
            <a href="/profile" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-sm">
              <User className="w-4 h-4" /> {t("feed.nav.profile")}
            </a>
          </nav>
          <div className="space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2 px-2">
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={() => setLang(lang === "zh" ? "en" : "zh")}><Globe className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground" onClick={toggleTheme}>{theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</Button>
            </div>
            <button onClick={() => { doLogout(); setLocation("/"); }} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm w-full">
              <LogOut className="w-4 h-4" /> {t("feed.nav.logout")}
            </button>
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
            <AnimatePresence mode="wait">
              {activeTool === null ? (
                <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="text-xl font-bold text-foreground mb-1">{lang === "zh" ? "校園工具" : "Campus Tools"}</h2>
                  <p className="text-sm text-muted-foreground mb-6">{lang === "zh" ? "實用工具幫你更有效率" : "Useful tools to boost your productivity"}</p>

                  <div className="grid grid-cols-2 gap-3">
                    {tools.map((tool, i) => {
                      const Icon = tool.icon;
                      return (
                        <motion.button
                          key={tool.key}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => setActiveTool(tool.key)}
                          className="p-5 rounded-xl border border-border bg-card hover:border-rose-500/30 hover:shadow-lg hover:shadow-rose-500/5 transition-all text-left group"
                        >
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-foreground text-sm mb-1">{tool.label}</h3>
                          <p className="text-xs text-muted-foreground">{tool.desc}</p>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="tool" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  {activeTool === "gpa" && <GPACalculator lang={lang} onClose={() => setActiveTool(null)} />}
                  {activeTool === "pomodoro" && <PomodoroTimer lang={lang} onClose={() => setActiveTool(null)} />}
                  {activeTool === "deadline" && <DeadlineTracker lang={lang} onClose={() => setActiveTool(null)} />}
                  {activeTool === "expense" && <ExpenseTracker lang={lang} onClose={() => setActiveTool(null)} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-40">
        <div className="flex items-center justify-around py-2">
          <a href="/feed" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><Home className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.feed")}</span></a>
          <a href="/dating" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><HeartHandshake className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.dating")}</span></a>
          <a href="/tools" className="flex flex-col items-center gap-0.5 px-3 py-1 text-neon-coral"><Wrench className="w-5 h-5" /><span className="text-[10px] font-medium">{t("feed.nav.tools")}</span></a>
          <a href="/profile" className="flex flex-col items-center gap-0.5 px-3 py-1 text-muted-foreground"><User className="w-5 h-5" /><span className="text-[10px]">{t("feed.nav.profile")}</span></a>
        </div>
      </div>
    </div>
  );
}
