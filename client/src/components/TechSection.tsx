import AnimatedSection from "./AnimatedSection";
import { Server, Bot, Ban, Code2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function TechSection() {
  const { t } = useLanguage();

  const techItems = [
    {
      icon: Code2,
      title: t("tech.stack.title"),
      description: t("tech.stack.desc"),
      color: "text-neon-cyan",
      bgColor: "bg-neon-cyan/[0.06]",
    },
    {
      icon: Bot,
      title: t("tech.ai.title"),
      description: t("tech.ai.desc"),
      color: "text-neon-coral",
      bgColor: "bg-neon-coral/[0.06]",
    },
    {
      icon: Ban,
      title: t("tech.ban.title"),
      description: t("tech.ban.desc"),
      color: "text-neon-lavender",
      bgColor: "bg-neon-lavender/[0.06]",
    },
    {
      icon: Server,
      title: t("tech.infra.title"),
      description: t("tech.infra.desc"),
      color: "text-neon-emerald",
      bgColor: "bg-neon-emerald/[0.06]",
    },
  ];

  return (
    <section className="py-24 relative" id="tech">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-cyan/20 bg-neon-cyan/[0.06] text-neon-cyan text-xs font-medium mb-4">
            <Server className="w-3 h-3" />
            {t("tech.badge")}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t("tech.title1")} <span className="text-neon-cyan">{t("tech.title2")}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
            {t("tech.subtitle")}
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
          {techItems.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 0.08}>
              <div className="glass-card rounded-xl p-6 h-full flex items-start gap-4 group transition-all duration-300 hover:-translate-y-0.5">
                <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-base mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
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
