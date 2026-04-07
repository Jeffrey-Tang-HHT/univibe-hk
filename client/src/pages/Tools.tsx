import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Shield, Calculator, Clock, CalendarDays, BookOpen, Timer,
  DollarSign, MapPin, GraduationCap, Brain, Notebook, FileText,
  LogOut, User, Globe, Moon, Sun, Home, HeartHandshake, Wrench, X,
  Play, Pause, RotateCcw, Plus, Trash2, Check, ChevronDown, ChevronLeft, ChevronRight,
  Users, Target, Star, Minus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

type ActiveTool = null | "gpa" | "pomodoro" | "deadline" | "exam" | "expense" | "notes" | "splitbill" | "gpasim" | "coursereview";

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
      <div className="text-center mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20">
        <div className="text-4xl font-bold text-primary">{gpa().toFixed(2)}</div>
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
              className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/70 outline-none"
            />
            <select
              value={course.credits}
              onChange={e => updateCourse(i, "credits", Number(e.target.value))}
              className="w-16 h-9 px-2 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary/70 outline-none"
            >
              {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select
              value={course.grade}
              onChange={e => updateCourse(i, "grade", e.target.value)}
              className="w-16 h-9 px-2 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary/70 outline-none"
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

      <button onClick={addCourse} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80">
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
        <div className={`inline-block px-4 py-1 rounded-full text-xs font-medium mb-4 ${mode === "work" ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-500"}`}>
          {mode === "work" ? (lang === "zh" ? "專注時間" : "Focus") : (lang === "zh" ? "休息時間" : "Break")}
        </div>

        {/* Circular progress */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          <svg className="w-48 h-48 -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
            <circle cx="100" cy="100" r="90" fill="none" stroke="currentColor"
              className={mode === "work" ? "text-primary" : "text-emerald-500"}
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
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white ${mode === "work" ? "bg-primary hover:bg-primary/90" : "bg-emerald-500 hover:bg-emerald-600"}`}
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

// ==================== DEADLINE TRACKER (Calendar) ====================
function DeadlineTracker({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [deadlines, setDeadlines] = useState([
    { id: "1", title: "COMP3230 Assignment 3", date: "2026-04-15", done: false },
    { id: "2", title: "ENGL1010 Essay", date: "2026-04-20", done: false },
    { id: "3", title: "MATH2011 Midterm", date: "2026-04-25", done: false },
  ]);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() }; });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const addDeadline = () => {
    if (!newTitle || !newDate) return;
    setDeadlines([...deadlines, { id: `d_${Date.now()}`, title: newTitle, date: newDate, done: false }]);
    setNewTitle("");
    setNewDate("");
    setShowAdd(false);
  };
  const toggleDone = (id: string) => setDeadlines(deadlines.map(d => d.id === id ? { ...d, done: !d.done } : d));
  const removeDeadline = (id: string) => setDeadlines(deadlines.filter(d => d.id !== id));

  const daysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Calendar helpers
  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date(); const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const monthNames = lang === "zh"
    ? ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"]
    : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayLabels = lang === "zh" ? ["日", "一", "二", "三", "四", "五", "六"] : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  const prevMonth = () => setViewMonth(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { year: v.year, month: v.month - 1 });
  const nextMonth = () => setViewMonth(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { year: v.year, month: v.month + 1 });
  const goToday = () => { setViewMonth({ year: today.getFullYear(), month: today.getMonth() }); setSelectedDate(todayStr); };

  const dateKey = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const deadlinesByDate: Record<string, typeof deadlines> = {};
  deadlines.forEach(d => { if (!deadlinesByDate[d.date]) deadlinesByDate[d.date] = []; deadlinesByDate[d.date].push(d); });

  const selectedDeadlines = selectedDate ? (deadlinesByDate[selectedDate] || []) : [];

  // Upcoming list (next 14 days, undone)
  const upcoming = [...deadlines].filter(d => !d.done && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 14).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-foreground text-lg">{lang === "zh" ? "Deadline 追蹤器" : "Deadline Tracker"}</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => { setShowAdd(!showAdd); if (!showAdd && selectedDate) setNewDate(selectedDate); }} className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90"><Plus className="w-4 h-4" /></button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="mb-4 p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
          <input type="text" placeholder={lang === "zh" ? "Deadline 名稱..." : "Deadline name..."} value={newTitle} onChange={e => setNewTitle(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/70 outline-none"
            onKeyDown={e => e.key === "Enter" && addDeadline()} autoFocus />
          <div className="flex gap-2">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary/70 outline-none" />
            <button onClick={addDeadline} disabled={!newTitle || !newDate}
              className="px-4 h-9 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-40">{lang === "zh" ? "新增" : "Add"}</button>
            <button onClick={() => setShowAdd(false)} className="px-3 h-9 rounded-lg bg-muted text-muted-foreground text-sm hover:text-foreground">{lang === "zh" ? "取消" : "Cancel"}</button>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-xl border border-border bg-card p-3 mb-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={goToday} className="text-sm font-bold text-foreground hover:text-primary transition-colors">{monthNames[month]} {year}</button>
          <button onClick={nextMonth} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayLabels.map(d => <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>)}
        </div>
        {/* Days */}
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dk = dateKey(day);
            const isToday = dk === todayStr;
            const isSelected = dk === selectedDate;
            const dls = deadlinesByDate[dk] || [];
            const hasDone = dls.some(d => d.done);
            const hasUndone = dls.some(d => !d.done);
            const hasOverdue = dls.some(d => !d.done && daysUntil(d.date) < 0);
            const hasUrgent = dls.some(d => !d.done && daysUntil(d.date) >= 0 && daysUntil(d.date) <= 3);
            return (
              <button key={day} onClick={() => setSelectedDate(dk === selectedDate ? null : dk)}
                className={`relative flex flex-col items-center justify-center h-10 rounded-lg text-xs font-medium transition-all
                  ${isSelected ? "bg-primary text-white" : isToday ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-muted"}`}>
                {day}
                {dls.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {hasUndone && <span className={`w-1.5 h-1.5 rounded-full ${hasOverdue ? "bg-red-500" : hasUrgent ? "bg-orange-400" : isSelected ? "bg-white" : "bg-primary"}`} />}
                    {hasDone && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white/50" : "bg-emerald-500"}`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date deadlines */}
      {selectedDate && (
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-muted-foreground mb-2">{selectedDate}</h4>
          {selectedDeadlines.length > 0 ? (
            <div className="space-y-1.5">
              {selectedDeadlines.map(d => {
                const days = daysUntil(d.date);
                const overdue = days < 0;
                return (
                  <div key={d.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all ${d.done ? "bg-muted/50 border-border opacity-60" : overdue ? "bg-red-500/5 border-red-500/30" : "bg-card border-border"}`}>
                    <button onClick={() => toggleDone(d.id)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${d.done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground"}`}>
                      {d.done && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <span className={`flex-1 text-sm truncate ${d.done ? "line-through text-muted-foreground" : "text-foreground font-medium"}`}>{d.title}</span>
                    <button onClick={() => removeDeadline(d.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-3 text-center">{lang === "zh" ? "當日無 deadline" : "No deadlines this day"}</p>
          )}
        </div>
      )}

      {/* Upcoming */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground mb-2">{lang === "zh" ? "即將到期" : "Upcoming"}</h4>
        {upcoming.length > 0 ? (
          <div className="space-y-1.5">
            {upcoming.map(d => {
              const days = daysUntil(d.date);
              const urgent = days <= 3;
              return (
                <div key={d.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${urgent ? "bg-red-500/5 border-red-500/20" : "bg-card border-border"}`}>
                  <button onClick={() => toggleDone(d.id)} className="w-5 h-5 rounded-full border-2 border-muted-foreground flex items-center justify-center flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{d.title}</p>
                    <p className="text-[10px] text-muted-foreground">{d.date}</p>
                  </div>
                  <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${urgent ? "bg-red-500/10 text-red-500" : "bg-muted text-muted-foreground"}`}>
                    {days === 0 ? (lang === "zh" ? "今日" : "Today") : `${days}d`}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-muted-foreground text-xs py-4">{lang === "zh" ? "暫無即將到期嘅 deadline 🎉" : "No upcoming deadlines 🎉"}</p>
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

      <div className="text-center mb-4 p-4 rounded-xl bg-primary/10 border border-primary/20">
        <div className="text-sm text-muted-foreground">{lang === "zh" ? "今日總支出" : "Today's Total"}</div>
        <div className="text-3xl font-bold text-primary">HK${total}</div>
      </div>

      <div className="flex gap-2 mb-4">
        <input type="text" placeholder={lang === "zh" ? "項目" : "Item"} value={newItem} onChange={e => setNewItem(e.target.value)}
          className="flex-1 h-9 px-3 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/70 outline-none"
          onKeyDown={e => e.key === "Enter" && addExpense()}
        />
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
          <input type="number" placeholder="0" value={newAmount} onChange={e => setNewAmount(e.target.value)}
            className="w-24 h-9 pl-7 pr-3 rounded-lg bg-background border border-border text-sm text-foreground focus:border-primary/70 outline-none"
            onKeyDown={e => e.key === "Enter" && addExpense()}
          />
        </div>
        <button onClick={addExpense} className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {expenses.map(e => (
          <div key={e.id} className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
            <span className="text-sm text-foreground">{e.item}</span>
            <span className="text-sm font-medium text-primary">-HK${e.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== SPLIT BILL CALCULATOR ====================
function SplitBillCalculator({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [total, setTotal] = useState("");
  const [tip, setTip] = useState("10");
  const [people, setPeople] = useState([
    { id: "1", name: lang === "zh" ? "我" : "Me", share: "equal" as "equal" | "custom", customAmount: "" },
    { id: "2", name: lang === "zh" ? "朋友 A" : "Friend A", share: "equal" as "equal" | "custom", customAmount: "" },
    { id: "3", name: lang === "zh" ? "朋友 B" : "Friend B", share: "equal" as "equal" | "custom", customAmount: "" },
  ]);
  const [items, setItems] = useState<{ id: string; name: string; price: string; paidBy: string[] }[]>([]);
  const [mode, setMode] = useState<"equal" | "items">("equal");

  const totalNum = parseFloat(total) || 0;
  const tipNum = parseFloat(tip) || 0;
  const totalWithTip = totalNum * (1 + tipNum / 100);

  const addPerson = () => setPeople([...people, { id: `p_${Date.now()}`, name: `${lang === "zh" ? "朋友" : "Friend"} ${String.fromCharCode(64 + people.length)}`, share: "equal", customAmount: "" }]);
  const removePerson = (id: string) => { if (people.length > 2) setPeople(people.filter(p => p.id !== id)); };
  const updatePerson = (id: string, field: string, value: any) => setPeople(people.map(p => p.id === id ? { ...p, [field]: value } : p));

  const addItem = () => setItems([...items, { id: `i_${Date.now()}`, name: "", price: "", paidBy: people.map(p => p.id) }]);
  const removeItem = (id: string) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id: string, field: string, value: any) => setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  const toggleItemPayer = (itemId: string, personId: string) => {
    setItems(items.map(i => {
      if (i.id !== itemId) return i;
      const paidBy = i.paidBy.includes(personId) ? i.paidBy.filter(p => p !== personId) : [...i.paidBy, personId];
      return { ...i, paidBy: paidBy.length > 0 ? paidBy : i.paidBy };
    }));
  };

  const getPersonTotal = (personId: string) => {
    if (mode === "equal") {
      const customPeople = people.filter(p => p.share === "custom" && parseFloat(p.customAmount) > 0);
      const customTotal = customPeople.reduce((s, p) => s + (parseFloat(p.customAmount) || 0), 0);
      const person = people.find(p => p.id === personId);
      if (person?.share === "custom") return parseFloat(person.customAmount) || 0;
      const equalCount = people.filter(p => p.share === "equal").length;
      return equalCount > 0 ? (totalWithTip - customTotal) / equalCount : 0;
    } else {
      let personTotal = 0;
      items.forEach(item => {
        if (item.paidBy.includes(personId)) {
          personTotal += (parseFloat(item.price) || 0) / item.paidBy.length;
        }
      });
      const tipShare = personTotal * (tipNum / 100);
      return personTotal + tipShare;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">{lang === "zh" ? "AA制計算器" : "Split Bill"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setMode("equal")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === "equal" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
          {lang === "zh" ? "平均分" : "Equal Split"}
        </button>
        <button onClick={() => setMode("items")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${mode === "items" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
          {lang === "zh" ? "逐項分" : "By Item"}
        </button>
      </div>

      {/* Total */}
      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "總金額 (HK$)" : "Total (HK$)"}</label>
        <input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="0.00"
          className="w-full h-11 px-4 rounded-xl bg-background border border-border text-lg font-bold text-foreground placeholder:text-muted-foreground focus:border-primary/70 outline-none" />
      </div>

      {/* Tip */}
      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "加一 / 小費 %" : "Tip %"}</label>
        <div className="flex gap-2">
          {["0", "10", "15", "custom"].map(t => (
            <button key={t} onClick={() => { if (t !== "custom") setTip(t); }}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${tip === t ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {t === "custom" ? (lang === "zh" ? "自訂" : "Custom") : `${t}%`}
            </button>
          ))}
          <input type="number" value={tip} onChange={e => setTip(e.target.value)} min="0" max="100"
            className="w-16 h-9 px-2 rounded-lg bg-background border border-border text-sm text-center text-foreground focus:border-primary/70 outline-none" />
        </div>
      </div>

      {mode === "items" && (
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-foreground">{lang === "zh" ? "項目" : "Items"}</label>
            <button onClick={addItem} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"><Plus className="w-3 h-3" />{lang === "zh" ? "新增" : "Add"}</button>
          </div>
          {items.map(item => (
            <div key={item.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
              <div className="flex gap-2">
                <input type="text" placeholder={lang === "zh" ? "名稱" : "Name"} value={item.name} onChange={e => updateItem(item.id, "name", e.target.value)}
                  className="flex-1 h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none" />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <input type="number" value={item.price} onChange={e => updateItem(item.id, "price", e.target.value)} placeholder="0"
                    className="w-20 h-8 pl-5 pr-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none" />
                </div>
                <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex flex-wrap gap-1">
                {people.map(p => (
                  <button key={p.id} onClick={() => toggleItemPayer(item.id, p.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${item.paidBy.includes(p.id) ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {items.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">{lang === "zh" ? "新增項目嚟分帳" : "Add items to split"}</p>}
        </div>
      )}

      {/* People */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-foreground">{lang === "zh" ? `${people.length} 人` : `${people.length} people`}</label>
          <button onClick={addPerson} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"><Plus className="w-3 h-3" />{lang === "zh" ? "加人" : "Add"}</button>
        </div>
        <div className="space-y-2">
          {people.map(p => (
            <div key={p.id} className="flex items-center gap-2 p-3 rounded-xl border border-border bg-card">
              <input type="text" value={p.name} onChange={e => updatePerson(p.id, "name", e.target.value)}
                className="flex-1 h-7 px-2 bg-transparent text-sm text-foreground outline-none" />
              {mode === "equal" && (
                <button onClick={() => updatePerson(p.id, "share", p.share === "equal" ? "custom" : "equal")}
                  className={`px-2 py-1 rounded-lg text-[10px] font-medium ${p.share === "custom" ? "bg-orange-500/10 text-orange-500" : "bg-muted text-muted-foreground"}`}>
                  {p.share === "custom" ? (lang === "zh" ? "自訂" : "Custom") : (lang === "zh" ? "平均" : "Equal")}
                </button>
              )}
              {mode === "equal" && p.share === "custom" && (
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                  <input type="number" value={p.customAmount} onChange={e => updatePerson(p.id, "customAmount", e.target.value)} placeholder="0"
                    className="w-20 h-7 pl-5 pr-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none" />
                </div>
              )}
              <span className="text-sm font-bold text-primary min-w-[70px] text-right">${getPersonTotal(p.id).toFixed(1)}</span>
              {people.length > 2 && <button onClick={() => removePerson(p.id)} className="text-muted-foreground hover:text-red-400"><Minus className="w-3.5 h-3.5" /></button>}
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      {totalNum > 0 && (
        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 space-y-1">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">{lang === "zh" ? "小計" : "Subtotal"}</span><span className="text-foreground">HK${totalNum.toFixed(2)}</span></div>
          {tipNum > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">{lang === "zh" ? "加一" : "Tip"} ({tipNum}%)</span><span className="text-foreground">HK${(totalNum * tipNum / 100).toFixed(2)}</span></div>}
          <div className="flex justify-between text-sm font-bold pt-1 border-t border-primary/20"><span className="text-foreground">{lang === "zh" ? "總計" : "Total"}</span><span className="text-primary">HK${totalWithTip.toFixed(2)}</span></div>
        </div>
      )}
    </div>
  );
}

// ==================== GPA GOAL SIMULATOR ====================
function GPAGoalSimulator({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [currentGPA, setCurrentGPA] = useState("3.2");
  const [completedCredits, setCompletedCredits] = useState("60");
  const [targetGPA, setTargetGPA] = useState("3.5");
  const [remainingCourses, setRemainingCourses] = useState([
    { id: "1", name: lang === "zh" ? "科目 A" : "Course A", credits: 3 },
    { id: "2", name: lang === "zh" ? "科目 B" : "Course B", credits: 3 },
    { id: "3", name: lang === "zh" ? "科目 C" : "Course C", credits: 3 },
    { id: "4", name: lang === "zh" ? "科目 D" : "Course D", credits: 3 },
  ]);

  const gradeScale = [
    { grade: "A+", gp: 4.3 }, { grade: "A", gp: 4.0 }, { grade: "A-", gp: 3.7 },
    { grade: "B+", gp: 3.3 }, { grade: "B", gp: 3.0 }, { grade: "B-", gp: 2.7 },
    { grade: "C+", gp: 2.3 }, { grade: "C", gp: 2.0 }, { grade: "C-", gp: 1.7 },
    { grade: "D", gp: 1.0 }, { grade: "F", gp: 0 },
  ];

  const cGPA = parseFloat(currentGPA) || 0;
  const cCredits = parseInt(completedCredits) || 0;
  const tGPA = parseFloat(targetGPA) || 0;
  const remainCredits = remainingCourses.reduce((s, c) => s + c.credits, 0);
  const totalCredits = cCredits + remainCredits;

  // Required average GPA for remaining courses
  const requiredAvg = totalCredits > 0 && remainCredits > 0
    ? (tGPA * totalCredits - cGPA * cCredits) / remainCredits
    : 0;

  const addCourse = () => setRemainingCourses([...remainingCourses, { id: `rc_${Date.now()}`, name: "", credits: 3 }]);
  const removeCourse = (id: string) => { if (remainingCourses.length > 1) setRemainingCourses(remainingCourses.filter(c => c.id !== id)); };

  const isAchievable = requiredAvg <= 4.3 && requiredAvg >= 0;
  const requiredGrade = gradeScale.find(g => g.gp >= requiredAvg) || gradeScale[gradeScale.length - 1];

  // Simulate different scenarios
  const scenarios = [
    { label: lang === "zh" ? "全 A" : "All A's", gp: 4.0 },
    { label: lang === "zh" ? "全 B+" : "All B+'s", gp: 3.3 },
    { label: lang === "zh" ? "全 B" : "All B's", gp: 3.0 },
    { label: lang === "zh" ? "全 C+" : "All C+'s", gp: 2.3 },
  ].map(s => ({
    ...s,
    result: totalCredits > 0 ? (cGPA * cCredits + s.gp * remainCredits) / totalCredits : 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">{lang === "zh" ? "GPA 目標模擬器" : "GPA Goal Simulator"}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
      </div>

      {/* Current stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "目前 GPA" : "Current GPA"}</label>
          <input type="number" step="0.01" min="0" max="4.3" value={currentGPA} onChange={e => setCurrentGPA(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm font-bold text-foreground focus:border-primary/70 outline-none" />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "已修學分" : "Completed Credits"}</label>
          <input type="number" min="0" value={completedCredits} onChange={e => setCompletedCredits(e.target.value)}
            className="w-full h-10 px-3 rounded-xl bg-background border border-border text-sm font-bold text-foreground focus:border-primary/70 outline-none" />
        </div>
      </div>

      {/* Target */}
      <div className="mb-4">
        <label className="block text-xs text-muted-foreground mb-1">{lang === "zh" ? "目標 GPA" : "Target GPA"}</label>
        <div className="flex gap-2">
          {["3.0", "3.3", "3.5", "3.7", "4.0"].map(g => (
            <button key={g} onClick={() => setTargetGPA(g)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${targetGPA === g ? "bg-primary text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
              {g}
            </button>
          ))}
        </div>
        <input type="number" step="0.1" min="0" max="4.3" value={targetGPA} onChange={e => setTargetGPA(e.target.value)}
          className="w-full h-9 px-3 rounded-xl bg-background border border-border text-sm text-foreground focus:border-primary/70 outline-none mt-2" />
      </div>

      {/* Remaining courses */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-foreground">{lang === "zh" ? `剩餘科目 (${remainCredits} 學分)` : `Remaining (${remainCredits} credits)`}</label>
          <button onClick={addCourse} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3" />{lang === "zh" ? "新增" : "Add"}</button>
        </div>
        <div className="space-y-1.5">
          {remainingCourses.map(c => (
            <div key={c.id} className="flex items-center gap-2">
              <input type="text" value={c.name} onChange={e => setRemainingCourses(prev => prev.map(p => p.id === c.id ? { ...p, name: e.target.value } : p))}
                placeholder={lang === "zh" ? "科目名" : "Course"} className="flex-1 h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none" />
              <select value={c.credits} onChange={e => setRemainingCourses(prev => prev.map(p => p.id === c.id ? { ...p, credits: Number(e.target.value) } : p))}
                className="w-16 h-8 px-1 rounded-lg bg-background border border-border text-xs text-foreground outline-none">
                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} cr</option>)}
              </select>
              {remainingCourses.length > 1 && <button onClick={() => removeCourse(c.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="w-3 h-3" /></button>}
            </div>
          ))}
        </div>
      </div>

      {/* Result */}
      <div className={`p-4 rounded-xl border ${isAchievable ? "bg-neon-emerald/5 border-neon-emerald/20" : "bg-red-500/5 border-red-500/20"} mb-4`}>
        <p className="text-xs text-muted-foreground mb-1">{lang === "zh" ? "要達到目標，你需要平均" : "To reach your goal, you need an average of"}</p>
        <div className="flex items-center gap-2">
          <span className={`text-3xl font-bold ${isAchievable ? "text-neon-emerald" : "text-red-500"}`}>{requiredAvg.toFixed(2)}</span>
          <span className={`text-sm font-medium ${isAchievable ? "text-neon-emerald" : "text-red-500"}`}>
            ({isAchievable ? `≥ ${requiredGrade.grade}` : (lang === "zh" ? "唔可能 😅" : "Not possible 😅")})
          </span>
        </div>
        {isAchievable && requiredAvg > 3.7 && <p className="text-xs text-orange-500 mt-1">{lang === "zh" ? "⚠️ 需要非常高嘅成績，加油！" : "⚠️ Needs very high grades — you got this!"}</p>}
      </div>

      {/* Scenarios */}
      <div className="p-4 rounded-xl border border-border bg-card">
        <p className="text-xs font-medium text-foreground mb-3">{lang === "zh" ? "如果你之後..." : "If you get..."}</p>
        <div className="space-y-2">
          {scenarios.map(s => {
            const meetsTarget = s.result >= tGPA;
            return (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${meetsTarget ? "bg-neon-emerald" : "bg-orange-400"}`} style={{ width: `${Math.min((s.result / 4.3) * 100, 100)}%` }} /></div>
                  <span className={`text-xs font-bold min-w-[40px] text-right ${meetsTarget ? "text-neon-emerald" : "text-muted-foreground"}`}>{s.result.toFixed(2)}</span>
                  {meetsTarget && <Check className="w-3 h-3 text-neon-emerald" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== COURSE REVIEW ====================
const HK_COURSES_DATA = [
  { code: "COMP3230", name: "Operating Systems", school: "HKU", faculty: "Engineering" },
  { code: "ENGL1010", name: "English for Arts Students", school: "HKU", faculty: "Arts" },
  { code: "MATH2011", name: "Advanced Calculus", school: "CUHK", faculty: "Science" },
  { code: "FINA2010", name: "Financial Management", school: "CUHK", faculty: "Business" },
  { code: "COMP1001", name: "Introduction to Computing", school: "PolyU", faculty: "Engineering" },
  { code: "GE1501", name: "Chinese Culture", school: "CityU", faculty: "Arts" },
  { code: "MGMT2110", name: "Organizational Behaviour", school: "HKUST", faculty: "Business" },
  { code: "PSYC1001", name: "Introduction to Psychology", school: "HKU", faculty: "Social Sciences" },
];

function CourseReview({ lang, onClose }: { lang: string; onClose: () => void }) {
  const [reviews, setReviews] = useState<{ id: string; courseCode: string; courseName: string; school: string; professor: string; rating: number; difficulty: number; workload: number; content: string; grade: string; semester: string; created: number }[]>(() => {
    try { return JSON.parse(localStorage.getItem("unigo-course-reviews") || "[]"); } catch { return []; }
  });
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSchool, setFilterSchool] = useState("all");

  // Form state
  const [fCourseCode, setFCourseCode] = useState("");
  const [fCourseName, setFCourseName] = useState("");
  const [fSchool, setFSchool] = useState("HKU");
  const [fProfessor, setFProfessor] = useState("");
  const [fRating, setFRating] = useState(4);
  const [fDifficulty, setFDifficulty] = useState(3);
  const [fWorkload, setFWorkload] = useState(3);
  const [fContent, setFContent] = useState("");
  const [fGrade, setFGrade] = useState("A-");
  const [fSemester, setFSemester] = useState("2025-26 Sem 2");

  // Seed reviews
  const allReviews = [
    { id: "s1", courseCode: "COMP3230", courseName: "Operating Systems", school: "HKU", professor: "Prof. Chan", rating: 4, difficulty: 4, workload: 5, content: "好難但學到好多嘢，assignment 超重但 final 唔太難", grade: "B+", semester: "2025-26 Sem 1", created: Date.now() - 86400000 * 5 },
    { id: "s2", courseCode: "FINA2010", courseName: "Financial Management", school: "CUHK", professor: "Dr. Wong", rating: 5, difficulty: 2, workload: 3, content: "Professor 教得好好，notes 好清楚，考試 open book", grade: "A", semester: "2025-26 Sem 1", created: Date.now() - 86400000 * 3 },
    { id: "s3", courseCode: "PSYC1001", courseName: "Intro to Psychology", school: "HKU", professor: "Dr. Lee", rating: 4, difficulty: 2, workload: 2, content: "GE 之選！Content 好有趣，workload 少", grade: "A-", semester: "2025-26 Sem 2", created: Date.now() - 86400000 },
    { id: "s4", courseCode: "COMP1001", courseName: "Intro to Computing", school: "PolyU", professor: "Prof. Ng", rating: 3, difficulty: 3, workload: 4, content: "Group project 佔 40%，要揀隊友小心啲", grade: "B", semester: "2024-25 Sem 2", created: Date.now() - 86400000 * 10 },
    { id: "s5", courseCode: "MGMT2110", courseName: "Organizational Behaviour", school: "HKUST", professor: "Prof. Li", rating: 5, difficulty: 1, workload: 2, content: "最輕鬆嘅 business core，老師好 nice", grade: "A", semester: "2025-26 Sem 1", created: Date.now() - 86400000 * 7 },
    ...reviews,
  ];

  const schools = ["all", "HKU", "CUHK", "HKUST", "PolyU", "CityU", "HKBU", "LU", "EdUHK"];
  const filtered = allReviews.filter(r => {
    if (filterSchool !== "all" && r.school !== filterSchool) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return r.courseCode.toLowerCase().includes(q) || r.courseName.toLowerCase().includes(q) || r.professor.toLowerCase().includes(q);
    }
    return true;
  });

  const submitReview = () => {
    if (!fCourseCode || !fContent) { toast.error(lang === "zh" ? "請填寫科目代碼和評語" : "Please fill in course code and review"); return; }
    const newReview = { id: `r_${Date.now()}`, courseCode: fCourseCode.toUpperCase(), courseName: fCourseName, school: fSchool, professor: fProfessor, rating: fRating, difficulty: fDifficulty, workload: fWorkload, content: fContent, grade: fGrade, semester: fSemester, created: Date.now() };
    const updated = [newReview, ...reviews];
    setReviews(updated);
    localStorage.setItem("unigo-course-reviews", JSON.stringify(updated));
    setShowAdd(false);
    setFCourseCode(""); setFCourseName(""); setFProfessor(""); setFContent("");
    toast.success(lang === "zh" ? "評價已發布！" : "Review posted!");
  };

  const StarRating = ({ value, onChange, size = "w-5 h-5" }: { value: number; onChange?: (v: number) => void; size?: string }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} onClick={() => onChange?.(i)} className={onChange ? "cursor-pointer" : "cursor-default"}>
          <Star className={`${size} ${i <= value ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
        </button>
      ))}
    </div>
  );

  const DifficultyBar = ({ value, label }: { value: number; label: string }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-muted-foreground w-12">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${value <= 2 ? "bg-neon-emerald" : value <= 3 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${(value / 5) * 100}%` }} />
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{value}/5</span>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-foreground text-lg">{lang === "zh" ? "課程評價" : "Course Reviews"}</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowAdd(!showAdd)} className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90"><Plus className="w-4 h-4" /></button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          placeholder={lang === "zh" ? "搜尋科目 / 教授..." : "Search course / professor..."}
          className="w-full h-9 pl-3 pr-3 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/70 outline-none" />
      </div>

      {/* School filter */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
        {schools.map(s => (
          <button key={s} onClick={() => setFilterSchool(s)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${filterSchool === s ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
            {s === "all" ? (lang === "zh" ? "全部" : "All") : s}
          </button>
        ))}
      </div>

      {/* Add review form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 mb-4 space-y-3">
              <h4 className="text-sm font-bold text-foreground">{lang === "zh" ? "新增評價" : "Add Review"}</h4>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" value={fCourseCode} onChange={e => setFCourseCode(e.target.value)} placeholder="e.g. COMP3230"
                  className="h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none" />
                <select value={fSchool} onChange={e => setFSchool(e.target.value)}
                  className="h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none">
                  {["HKU", "CUHK", "HKUST", "PolyU", "CityU", "HKBU", "LU", "EdUHK"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <input type="text" value={fCourseName} onChange={e => setFCourseName(e.target.value)} placeholder={lang === "zh" ? "科目名稱" : "Course name"}
                className="w-full h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none" />
              <input type="text" value={fProfessor} onChange={e => setFProfessor(e.target.value)} placeholder={lang === "zh" ? "教授名" : "Professor name"}
                className="w-full h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none" />
              <div className="grid grid-cols-3 gap-3">
                <div><p className="text-[10px] text-muted-foreground mb-1">{lang === "zh" ? "推薦度" : "Rating"}</p><StarRating value={fRating} onChange={setFRating} size="w-4 h-4" /></div>
                <div><p className="text-[10px] text-muted-foreground mb-1">{lang === "zh" ? "難度" : "Difficulty"}</p><StarRating value={fDifficulty} onChange={setFDifficulty} size="w-4 h-4" /></div>
                <div><p className="text-[10px] text-muted-foreground mb-1">{lang === "zh" ? "工作量" : "Workload"}</p><StarRating value={fWorkload} onChange={setFWorkload} size="w-4 h-4" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={fGrade} onChange={e => setFGrade(e.target.value)}
                  className="h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none">
                  {["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"].map(g => <option key={g}>{g}</option>)}
                </select>
                <select value={fSemester} onChange={e => setFSemester(e.target.value)}
                  className="h-8 px-2 rounded-lg bg-background border border-border text-xs text-foreground outline-none">
                  {["2025-26 Sem 2", "2025-26 Sem 1", "2024-25 Sem 2", "2024-25 Sem 1"].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <textarea value={fContent} onChange={e => setFContent(e.target.value)} placeholder={lang === "zh" ? "你對呢科嘅評價..." : "Your review..."}
                rows={3} className="w-full px-2 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none resize-none" />
              <div className="flex gap-2">
                <button onClick={submitReview} className="flex-1 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90">{lang === "zh" ? "發布" : "Post"}</button>
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-xs hover:text-foreground">{lang === "zh" ? "取消" : "Cancel"}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reviews list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">{lang === "zh" ? "暫無評價" : "No reviews found"}</p>
        ) : filtered.map(r => (
          <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{r.courseCode}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">{r.school}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-neon-emerald/10 text-neon-emerald">{r.grade}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{r.courseName}{r.professor ? ` · ${r.professor}` : ""}</p>
              </div>
              <StarRating value={r.rating} size="w-3.5 h-3.5" />
            </div>
            <p className="text-xs text-foreground leading-relaxed mb-2">{r.content}</p>
            <div className="space-y-1">
              <DifficultyBar value={r.difficulty} label={lang === "zh" ? "難度" : "Diff"} />
              <DifficultyBar value={r.workload} label={lang === "zh" ? "工作量" : "Work"} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">{r.semester}</p>
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
    { key: "gpa" as ActiveTool, icon: Calculator, label: lang === "zh" ? "GPA 計算器" : "GPA Calculator", desc: lang === "zh" ? "計算你的學期 GPA" : "Calculate your semester GPA", color: "from-primary to-primary" },
    { key: "gpasim" as ActiveTool, icon: Target, label: lang === "zh" ? "GPA 目標模擬" : "GPA Goal Sim", desc: lang === "zh" ? "睇吓要幾高分先達標" : "What grades do I need?", color: "from-violet-500 to-purple-500" },
    { key: "coursereview" as ActiveTool, icon: Star, label: lang === "zh" ? "課程評價" : "Course Reviews", desc: lang === "zh" ? "睇同學對科目嘅評價" : "Rate & review courses", color: "from-yellow-500 to-orange-400" },
    { key: "splitbill" as ActiveTool, icon: Users, label: lang === "zh" ? "AA制計算器" : "Split Bill", desc: lang === "zh" ? "食飯夾錢分帳" : "Split bills with friends", color: "from-pink-500 to-rose-500" },
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
              UniGo<span className="text-neon-coral"> HK</span>
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
              <span className="font-display text-base font-bold text-foreground">UniGo<span className="text-neon-coral"> HK</span></span>
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
                          className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all text-left group"
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
                  {activeTool === "gpasim" && <GPAGoalSimulator lang={lang} onClose={() => setActiveTool(null)} />}
                  {activeTool === "coursereview" && <CourseReview lang={lang} onClose={() => setActiveTool(null)} />}
                  {activeTool === "splitbill" && <SplitBillCalculator lang={lang} onClose={() => setActiveTool(null)} />}
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
