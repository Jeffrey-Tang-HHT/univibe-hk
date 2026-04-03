import AnimatedSection from "./AnimatedSection";
import { Heart, MessageCircle, Eye, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function DatingSection() {
  const { t } = useLanguage();

  const steps = [
    {
      step: "01",
      icon: MessageCircle,
      title: t("dating.step1.title"),
      description: t("dating.step1.desc"),
      color: "text-neon-coral",
    },
    {
      step: "02",
      icon: Eye,
      title: t("dating.step2.title"),
      description: t("dating.step2.desc"),
      color: "text-neon-lavender",
    },
    {
      step: "03",
      icon: Heart,
      title: t("dating.step3.title"),
      description: t("dating.step3.desc"),
      color: "text-neon-cyan",
    },
    {
      step: "04",
      icon: Users,
      title: t("dating.step4.title"),
      description: t("dating.step4.desc"),
      color: "text-neon-emerald",
    },
  ];

  return (
    <section className="py-24 relative" id="dating">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 right-0 w-[400px] h-[400px] rounded-full bg-neon-coral/[0.04] dark:bg-neon-coral/[0.03] blur-[120px]" />
      </div>

      <div className="container relative z-10">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-lavender/20 bg-neon-lavender/[0.06] text-neon-lavender text-xs font-medium mb-4">
            <Heart className="w-3 h-3" />
            {t("dating.badge")}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t("dating.title1")} <span className="text-neon-lavender">{t("dating.title2")}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
            {t("dating.subtitle")}
          </p>
        </AnimatedSection>

        <div className="max-w-3xl mx-auto space-y-4">
          {steps.map((step, i) => (
            <AnimatedSection key={step.step} delay={i * 0.1}>
              <div className="glass-card rounded-xl p-6 flex items-start gap-5 group transition-all duration-300 hover:-translate-y-0.5">
                <div className="flex-shrink-0">
                  <span className={`font-mono text-xs font-medium ${step.color} opacity-60`}>
                    {step.step}
                  </span>
                  <div className={`w-10 h-10 rounded-lg ${step.color.replace("text-", "bg-")}/[0.08] flex items-center justify-center mt-1`}>
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base mb-1.5">
                    {step.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
