import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Users, Heart } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";

export default function HeroSection() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-neon-coral/[0.06] dark:bg-neon-coral/[0.04] blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-neon-cyan/[0.06] dark:bg-neon-cyan/[0.04] blur-[120px] animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] rounded-full bg-neon-lavender/[0.04] dark:bg-neon-lavender/[0.03] blur-[100px] animate-pulse" style={{ animationDelay: "4s" }} />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="container relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon-coral/20 bg-neon-coral/[0.06] text-neon-coral text-sm font-medium mb-8"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            {t("hero.badge")}
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6"
          >
            {t("hero.title1")}{" "}
            <span className="text-neon-coral">{t("hero.title2")}</span>
            <br />
            <span className="text-neon-cyan">{t("hero.title3")}</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed"
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button
              size="lg"
              className="bg-neon-coral hover:bg-neon-coral/90 text-white font-semibold px-8 h-12 text-base neon-glow-coral transition-all"
              onClick={() => setLocation("/login")}
            >
              {t("hero.cta.waitlist")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border/60 text-foreground hover:bg-secondary h-12 px-8 text-base"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              {t("hero.cta.explore")}
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex items-center justify-center gap-8 sm:gap-12 mt-16 pt-8 border-t border-border/30"
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-neon-coral mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-display font-bold text-xl">20+</span>
              </div>
              <span className="text-xs text-muted-foreground">{t("hero.stat.institutions")}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-neon-cyan mb-1">
                <Users className="w-4 h-4" />
                <span className="font-display font-bold text-xl">100K+</span>
              </div>
              <span className="text-xs text-muted-foreground">{t("hero.stat.users")}</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-neon-lavender mb-1">
                <Heart className="w-4 h-4" />
                <span className="font-display font-bold text-xl">3</span>
              </div>
              <span className="text-xs text-muted-foreground">{t("hero.stat.privacy")}</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
