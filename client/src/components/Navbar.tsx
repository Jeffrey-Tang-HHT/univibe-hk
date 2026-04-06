import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X, Shield, Moon, Sun, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useLanguage();
  const { isLoggedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.dating"), href: "#dating" },
    { label: t("nav.campus"), href: "#campus" },
    { label: t("nav.pricing"), href: "#pricing" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-16 lg:h-18">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-neon-coral flex items-center justify-center transition-shadow">
            <Shield className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            UniGo<span className="text-neon-coral"> HK</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA + controls */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
            title={lang === "zh" ? "Switch to English" : "切換至中文"}
          >
            <Globe className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground hover:text-foreground"
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {isLoggedIn ? (
            <Button
              size="sm"
              className="bg-neon-coral hover:bg-neon-coral/90 text-white font-medium"
              onClick={() => setLocation("/feed")}
            >
              {t("feed.nav.feed")}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setLocation("/login")}
              >
                {t("nav.login")}
              </Button>
              <Button
                size="sm"
                className="bg-neon-coral hover:bg-neon-coral/90 text-white font-medium"
                onClick={() => setLocation("/login")}
              >
                {t("nav.waitlist")}
              </Button>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground"
            onClick={() => setLang(lang === "zh" ? "en" : "zh")}
          >
            <Globe className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 text-muted-foreground"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <button
            className="text-foreground p-1"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/50 overflow-hidden"
          >
            <div className="container py-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground py-2 transition-colors"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex gap-3 pt-2">
                {isLoggedIn ? (
                  <Button
                    size="sm"
                    className="bg-neon-coral hover:bg-neon-coral/90 text-white flex-1"
                    onClick={() => { setMobileOpen(false); setLocation("/feed"); }}
                  >
                    {t("feed.nav.feed")}
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground flex-1"
                      onClick={() => { setMobileOpen(false); setLocation("/login"); }}
                    >
                      {t("nav.login")}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-neon-coral hover:bg-neon-coral/90 text-white flex-1"
                      onClick={() => { setMobileOpen(false); setLocation("/login"); }}
                    >
                      {t("nav.waitlist")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
