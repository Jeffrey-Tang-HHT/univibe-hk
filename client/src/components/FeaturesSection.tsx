import AnimatedSection from "./AnimatedSection";
import { MessageSquare, Brain, MapPin, Briefcase, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FeaturesSection() {
  const { t } = useLanguage();

  const features = [
    {
      icon: MessageSquare,
      title: t("features.jupas.title"),
      description: t("features.jupas.desc"),
      color: "text-neon-coral",
      bgColor: "bg-neon-coral/[0.06]",
    },
    {
      icon: Brain,
      title: t("features.mbti.title"),
      description: t("features.mbti.desc"),
      color: "text-neon-cyan",
      bgColor: "bg-neon-cyan/[0.06]",
    },
    {
      icon: MapPin,
      title: t("features.missed.title"),
      description: t("features.missed.desc"),
      color: "text-neon-lavender",
      bgColor: "bg-neon-lavender/[0.06]",
    },
    {
      icon: Briefcase,
      title: t("features.salary.title"),
      description: t("features.salary.desc"),
      color: "text-neon-emerald",
      bgColor: "bg-neon-emerald/[0.06]",
    },
  ];

  return (
    <section className="py-24 relative" id="features">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-coral/20 bg-neon-coral/[0.06] text-neon-coral text-xs font-medium mb-4">
            <Sparkles className="w-3 h-3" />
            {t("features.badge")}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t("features.title1")} <span className="text-neon-coral">{t("features.title2")}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
            {t("features.subtitle")}
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {features.map((feature, i) => (
            <AnimatedSection key={feature.title} delay={i * 0.08}>
              <div className="glass-card rounded-xl p-6 h-full group transition-all duration-300 hover:-translate-y-1">
                <div className={`w-10 h-10 rounded-lg ${feature.bgColor} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="font-display font-semibold text-base mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
