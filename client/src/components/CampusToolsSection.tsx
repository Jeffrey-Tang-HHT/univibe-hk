import AnimatedSection from "./AnimatedSection";
import { Star, ShoppingBag, Calendar, Wrench } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function CampusToolsSection() {
  const { t } = useLanguage();

  const tools = [
    {
      icon: Star,
      title: t("campus.rate.title"),
      description: t("campus.rate.desc"),
      color: "text-neon-coral",
      bgColor: "bg-neon-coral/[0.06]",
    },
    {
      icon: ShoppingBag,
      title: t("campus.market.title"),
      description: t("campus.market.desc"),
      color: "text-neon-cyan",
      bgColor: "bg-neon-cyan/[0.06]",
    },
    {
      icon: Calendar,
      title: t("campus.timetable.title"),
      description: t("campus.timetable.desc"),
      color: "text-neon-lavender",
      bgColor: "bg-neon-lavender/[0.06]",
    },
  ];

  return (
    <section className="py-24 relative" id="campus">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container">
        <AnimatedSection className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-emerald/20 bg-neon-emerald/[0.06] text-neon-emerald text-xs font-medium mb-4">
            <Wrench className="w-3 h-3" />
            {t("campus.badge")}
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            {t("campus.title1")} <span className="text-neon-emerald">{t("campus.title2")}</span>
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-base leading-relaxed">
            {t("campus.subtitle")}
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {tools.map((tool, i) => (
            <AnimatedSection key={tool.title} delay={i * 0.1}>
              <div className="glass-card rounded-xl p-6 h-full text-center group transition-all duration-300 hover:-translate-y-1">
                <div className={`w-12 h-12 rounded-xl ${tool.bgColor} flex items-center justify-center mx-auto mb-5 transition-transform group-hover:scale-110`}>
                  <tool.icon className={`w-6 h-6 ${tool.color}`} />
                </div>
                <h3 className="font-display font-semibold text-base mb-2">
                  {tool.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {tool.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
