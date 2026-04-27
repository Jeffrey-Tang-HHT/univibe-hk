import AnimatedSection from "./AnimatedSection";
import { ShieldCheck, Ghost, Building2, GraduationCap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function VerificationSection() {
  const { t } = useLanguage();

  const privacyModes = [
    {
      icon: Ghost,
      name: t("verification.ghost.name"),
      tag: t("verification.ghost.tag"),
      description: t("verification.ghost.desc"),
      color: "text-neon-lavender",
      borderColor: "border-neon-lavender/20",
      bgColor: "bg-neon-lavender/[0.06]",
    },
    {
      icon: Building2,
      name: t("verification.campus.name"),
      tag: t("verification.campus.tag"),
      description: t("verification.campus.desc"),
      color: "text-neon-cyan",
      borderColor: "border-neon-cyan/20",
      bgColor: "bg-neon-cyan/[0.06]",
    },
    {
      icon: GraduationCap,
      name: t("verification.major.name"),
      tag: t("verification.major.tag"),
      description: t("verification.major.desc"),
      color: "text-neon-coral",
      borderColor: "border-neon-coral/20",
      bgColor: "bg-neon-coral/[0.06]",
    },
  ];

  return (
    <section className="py-24 relative" id="verification">
      <div className="container">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-cyan/20 bg-neon-cyan/[0.06] text-neon-cyan text-xs font-medium mb-4">
            <ShieldCheck className="w-3 h-3" />
            {t("verification.badge")}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t("verification.title1")} <span className="text-neon-cyan">{t("verification.title2")}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
            {t("verification.subtitle")}
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {privacyModes.map((mode, i) => (
            <AnimatedSection key={mode.name} delay={i * 0.1}>
              <div className="glass-card rounded-xl p-6 h-full transition-all duration-300 hover:-translate-y-1">
                <div className={`w-10 h-10 rounded-lg ${mode.bgColor} flex items-center justify-center mb-4`}>
                  <mode.icon className={`w-5 h-5 ${mode.color}`} />
                </div>
                <h3 className="font-display font-semibold text-lg mb-1">{mode.name}</h3>
                <div className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${mode.bgColor} ${mode.color} mb-3`}>
                  {mode.tag}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {mode.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
