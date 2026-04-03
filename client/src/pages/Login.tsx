import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, ArrowRight, Mail, CheckCircle2, Lock, Sparkles, Globe, Moon, Sun, Loader2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";

type Step = "email" | "verify" | "profile";

const INSTITUTIONS: Record<string, string> = {
  "hku.hk": "HKU",
  "connect.hku.hk": "HKU",
  "cuhk.edu.hk": "CUHK",
  "ust.hk": "HKUST",
  "connect.ust.hk": "HKUST",
  "polyu.edu.hk": "PolyU",
  "cityu.edu.hk": "CityU",
  "hkbu.edu.hk": "HKBU",
  "ln.edu.hk": "LingU",
  "eduhk.hk": "EdUHK",
  "hkuspace.hku.hk": "HKU SPACE",
  "hkcc-polyu.edu.hk": "HKCC",
  "edu.hk": "HK Institution",
};

const TEST_EMAILS: Record<string, string> = { "hokhimtang@gmail.com": "Test Account" };

function detectInstitution(email: string): string | null {
  const testInst = TEST_EMAILS[email.toLowerCase()];
  if (testInst) return testInst;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  for (const [key, val] of Object.entries(INSTITUTIONS)) {
    if (domain.endsWith(key)) return val;
  }
  if (domain.endsWith(".edu.hk")) return "HK Institution";
  return null;
}

export default function Login() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [institution, setInstitution] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const inst = detectInstitution(email);
    if (!inst) {
      toast.error(t("login.error.invalid_email"));
      return;
    }
    setInstitution(inst);
    setLoading(true);

    try {
      const response = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to send verification code");
        toast.error(data.error || "Failed to send verification code");
        setLoading(false);
        return;
      }

      setVerifyToken(data.token);
      setStep("verify");
      toast.success(t("login.toast.code_sent"));

      // Start cooldown for resend
      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Send code error:", err);
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length !== 6) {
      toast.error(t("login.error.invalid_code"));
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), code, token: verifyToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Verification failed");
        toast.error(data.error || "Verification failed");
        setLoading(false);
        return;
      }

      login(email);
      toast.success(t("login.toast.verified"));
      setStep("profile");
      setTimeout(() => setLocation("/feed"), 1500);
    } catch (err) {
      console.error("Verify error:", err);
      setError("Network error. Please try again.");
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (cooldown > 0) return;
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to resend code");
        setLoading(false);
        return;
      }

      setVerifyToken(data.token);
      setCode("");
      toast.success(lang === "zh" ? "驗證碼已重新發送！" : "Verification code resent!");

      setCooldown(60);
      const interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) { clearInterval(interval); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-neon-coral flex items-center justify-center">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            UniVibe<span className="text-neon-coral"> HK</span>
          </span>
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

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-3 mb-10">
            {(["email", "verify", "profile"] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                  step === s ? "bg-neon-coral text-white scale-110 shadow-lg"
                    : (["email", "verify", "profile"].indexOf(step) > i) ? "bg-neon-emerald text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {(["email", "verify", "profile"].indexOf(step) > i) ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                {i < 2 && <div className={`w-12 h-0.5 rounded-full transition-colors duration-300 ${
                  (["email", "verify", "profile"].indexOf(step) > i) ? "bg-neon-emerald" : "bg-border"
                }`} />}
              </div>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Email */}
            {step === "email" && (
              <motion.div key="email" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-neon-coral/10 flex items-center justify-center mx-auto mb-5">
                    <Mail className="w-7 h-7 text-neon-coral" />
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{t("login.email.title")}</h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">{t("login.email.subtitle")}</p>
                </div>

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="you@university.edu.hk"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(""); }}
                    className="h-12 pl-4 pr-4 text-base bg-card border-border focus:border-neon-coral focus:ring-neon-coral/20"
                    required
                    disabled={loading}
                  />

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 bg-neon-coral hover:bg-neon-coral/90 text-white font-medium text-base" disabled={loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {lang === "zh" ? "發送中..." : "Sending..."}</>
                      : <>{t("login.email.cta")} <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </form>

                <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/50">
                  <div className="flex items-start gap-3">
                    <Lock className="w-4 h-4 text-neon-cyan mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">{t("login.email.privacy_note")}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Verify */}
            {step === "verify" && (
              <motion.div key="verify" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-neon-cyan/10 flex items-center justify-center mx-auto mb-5">
                    <Shield className="w-7 h-7 text-neon-cyan" />
                  </div>
                  <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{t("login.verify.title")}</h1>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t("login.verify.subtitle")} <span className="text-foreground font-medium">{email}</span>
                  </p>
                  {institution && (
                    <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-neon-emerald/10 text-neon-emerald text-xs font-medium">
                      <CheckCircle2 className="w-3 h-3" /> {institution} {t("login.verify.detected")}
                    </div>
                  )}
                </div>

                <form onSubmit={handleVerify} className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <input
                        key={i}
                        type="text"
                        maxLength={1}
                        className="w-12 h-14 text-center text-xl font-display font-bold rounded-xl border border-border bg-card text-foreground focus:border-neon-coral focus:ring-2 focus:ring-neon-coral/20 outline-none transition-all"
                        value={code[i] || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          if (val) {
                            const newCode = code.slice(0, i) + val + code.slice(i + 1);
                            setCode(newCode.slice(0, 6));
                            const next = e.target.nextElementSibling as HTMLInputElement;
                            if (next && val) next.focus();
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !code[i]) {
                            const prev = (e.target as HTMLInputElement).previousElementSibling as HTMLInputElement;
                            if (prev) { prev.focus(); setCode(code.slice(0, i - 1) + code.slice(i)); }
                          }
                        }}
                        disabled={loading}
                      />
                    ))}
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 bg-neon-coral hover:bg-neon-coral/90 text-white font-medium text-base" disabled={code.length < 6 || loading}>
                    {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {lang === "zh" ? "驗證中..." : "Verifying..."}</>
                      : <>{t("login.verify.cta")} <ArrowRight className="w-4 h-4 ml-2" /></>}
                  </Button>
                </form>

                <div className="text-center mt-4">
                  <button
                    onClick={handleResendCode}
                    disabled={cooldown > 0 || loading}
                    className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {cooldown > 0
                      ? (lang === "zh" ? `${cooldown} 秒後可重新發送` : `Resend in ${cooldown}s`)
                      : (lang === "zh" ? "重新發送驗證碼" : "Resend verification code")}
                  </button>
                </div>

                <button
                  onClick={() => { setStep("email"); setCode(""); setError(""); }}
                  className="block mx-auto mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {lang === "zh" ? "← 更改電郵地址" : "← Change email address"}
                </button>
              </motion.div>
            )}

            {/* Step 3: Success */}
            {step === "profile" && (
              <motion.div key="profile" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="text-center">
                <div className="w-20 h-20 rounded-full bg-neon-emerald/10 flex items-center justify-center mx-auto mb-6">
                  <Sparkles className="w-9 h-9 text-neon-emerald" />
                </div>
                <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{t("login.success.title")}</h1>
                <p className="text-muted-foreground text-sm mb-2">{t("login.success.subtitle")}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neon-coral/10 text-neon-coral text-sm font-medium">
                  <Shield className="w-3.5 h-3.5" /> {institution}
                </div>
                <div className="mt-6">
                  <div className="w-8 h-8 rounded-full border-2 border-neon-coral border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-muted-foreground mt-3">{t("login.success.redirect")}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
