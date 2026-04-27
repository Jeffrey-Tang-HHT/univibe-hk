import AnimatedSection from "./AnimatedSection";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function CTASection() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  return (
    <section className="py-24 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-neon-coral/[0.05] dark:bg-neon-coral/[0.04] blur-[120px]" />
      </div>

      <div className="container relative z-10">
        <AnimatedSection className="max-w-2xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t("cta.title1")}{" "}
            <span className="text-neon-coral">{t("cta.title2")}</span>
            {t("cta.title3")}
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed mb-8 max-w-md mx-auto">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              className="bg-neon-coral hover:bg-neon-coral/90 text-white font-semibold px-8 h-12 text-base neon-glow-coral transition-all"
              onClick={() => setLocation("/login")}
            >
              {t("cta.waitlist")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-border/60 text-foreground hover:bg-secondary h-12 px-8 text-base"
              onClick={() => toast(t("common.coming_soon"))}
            >
              {t("cta.business")}
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
