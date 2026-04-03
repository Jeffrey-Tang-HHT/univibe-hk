import AnimatedSection from "./AnimatedSection";
import { Button } from "@/components/ui/button";
import { Check, Zap, Building, Megaphone } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLocation } from "wouter";

export default function PricingSection() {
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  const freeFeatures = [
    t("pricing.free.f1"),
    t("pricing.free.f2"),
    t("pricing.free.f3"),
    t("pricing.free.f4"),
    t("pricing.free.f5"),
    t("pricing.free.f6"),
    t("pricing.free.f7"),
  ];

  const proFeatures = [
    t("pricing.pro.f1"),
    t("pricing.pro.f2"),
    t("pricing.pro.f3"),
    t("pricing.pro.f4"),
    t("pricing.pro.f5"),
    t("pricing.pro.f6"),
  ];

  const b2bCards = [
    {
      icon: Building,
      title: t("pricing.recruiter.title"),
      description: t("pricing.recruiter.desc"),
      price: t("pricing.recruiter.price"),
      color: "text-neon-cyan",
      bgColor: "bg-neon-cyan/[0.06]",
    },
    {
      icon: Megaphone,
      title: t("pricing.ads.title"),
      description: t("pricing.ads.desc"),
      price: t("pricing.ads.price"),
      color: "text-neon-lavender",
      bgColor: "bg-neon-lavender/[0.06]",
    },
  ];

  return (
    <section className="py-24 relative" id="pricing">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-neon-lavender/[0.04] dark:bg-neon-lavender/[0.03] blur-[120px]" />
      </div>

      <div className="container relative z-10">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-coral/20 bg-neon-coral/[0.06] text-neon-coral text-xs font-medium mb-4">
            <Zap className="w-3 h-3" />
            {t("pricing.badge")}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t("pricing.title1")} <span className="text-neon-coral">{t("pricing.title2")}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
            {t("pricing.subtitle")}
          </p>
        </AnimatedSection>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto mb-16">
          {/* Free tier */}
          <AnimatedSection>
            <div className="glass-card rounded-xl p-6 h-full">
              <h3 className="font-display font-semibold text-lg mb-1">{t("pricing.free")}</h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="font-display text-3xl font-bold">{t("pricing.free.price")}</span>
                <span className="text-sm text-muted-foreground">{t("pricing.free.period")}</span>
              </div>
              <ul className="space-y-3 mb-6">
                {freeFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-neon-emerald flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full border-border/60 text-foreground hover:bg-secondary"
                onClick={() => setLocation("/login")}
              >
                {t("pricing.free.cta")}
              </Button>
            </div>
          </AnimatedSection>

          {/* Pro tier */}
          <AnimatedSection delay={0.1}>
            <div className="glass-card rounded-xl p-6 h-full border-neon-coral/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 px-3 py-1 bg-neon-coral text-white text-xs font-medium rounded-bl-lg">
                {t("pricing.pro.popular")}
              </div>
              <h3 className="font-display font-semibold text-lg mb-1">
                {t("pricing.pro")} <span className="text-neon-coral">+</span>
              </h3>
              <div className="flex items-baseline gap-1 mb-5">
                <span className="font-display text-3xl font-bold text-neon-coral">{t("pricing.pro.price")}</span>
                <span className="text-sm text-muted-foreground">{t("pricing.pro.period")}</span>
              </div>
              <ul className="space-y-3 mb-6">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-neon-coral flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-neon-coral hover:bg-neon-coral/90 text-white font-medium neon-glow-coral"
                onClick={() => setLocation("/login")}
              >
                {t("pricing.pro.cta")}
              </Button>
            </div>
          </AnimatedSection>
        </div>

        {/* B2B section */}
        <AnimatedSection className="text-center mb-8">
          <h3 className="font-display text-xl font-semibold mb-2">{t("pricing.b2b.title")}</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {t("pricing.b2b.subtitle")}
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
          {b2bCards.map((card, i) => (
            <AnimatedSection key={card.title} delay={i * 0.1}>
              <div className="glass-card rounded-xl p-6 flex items-start gap-4">
                <div className={`w-10 h-10 rounded-lg ${card.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <div>
                  <h4 className="font-display font-semibold text-base mb-1">{card.title}</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                    {card.description}
                  </p>
                  <span className={`text-xs font-mono font-medium ${card.color}`}>
                    {card.price}
                  </span>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
