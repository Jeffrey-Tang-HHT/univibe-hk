import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, Users, Heart, Zap, Target, Globe } from "lucide-react";

export default function About() {
  const { t } = useLanguage();

  const values = [
    { icon: Shield, color: "text-neon-coral", bg: "bg-neon-coral/[0.06]", title: t("about.value1.title"), desc: t("about.value1.desc") },
    { icon: Users, color: "text-neon-cyan", bg: "bg-neon-cyan/[0.06]", title: t("about.value2.title"), desc: t("about.value2.desc") },
    { icon: Heart, color: "text-neon-lavender", bg: "bg-neon-lavender/[0.06]", title: t("about.value3.title"), desc: t("about.value3.desc") },
    { icon: Zap, color: "text-neon-emerald", bg: "bg-neon-emerald/[0.06]", title: t("about.value4.title"), desc: t("about.value4.desc") },
  ];

  const team = [
    { name: t("about.team1.name"), role: t("about.team1.role"), icon: Target },
    { name: t("about.team2.name"), role: t("about.team2.role"), icon: Globe },
    { name: t("about.team3.name"), role: t("about.team3.role"), icon: Zap },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-coral/20 bg-neon-coral/[0.06] text-neon-coral text-xs font-medium mb-4">
              <Shield className="w-3 h-3" />
              {t("about.badge")}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              {t("about.title1")} <span className="text-neon-coral">{t("about.title2")}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              {t("about.subtitle")}
            </p>
          </AnimatedSection>

          {/* Mission */}
          <AnimatedSection className="max-w-3xl mx-auto mb-20">
            <div className="glass-card rounded-2xl p-8 sm:p-10 text-center">
              <h2 className="font-display text-2xl font-bold mb-4">{t("about.mission.title")}</h2>
              <p className="text-muted-foreground leading-relaxed text-base">
                {t("about.mission.desc")}
              </p>
            </div>
          </AnimatedSection>

          {/* Values */}
          <AnimatedSection className="mb-20">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">{t("about.values.title")}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
              {values.map((v, i) => (
                <AnimatedSection key={v.title} delay={i * 0.1}>
                  <div className="glass-card rounded-xl p-6 text-center h-full">
                    <div className={`w-12 h-12 rounded-xl ${v.bg} flex items-center justify-center mx-auto mb-4`}>
                      <v.icon className={`w-6 h-6 ${v.color}`} />
                    </div>
                    <h3 className="font-display font-semibold text-base mb-2">{v.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>

          {/* Team */}
          <AnimatedSection className="mb-16">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">{t("about.team.title")}</h2>
            <div className="grid sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
              {team.map((m, i) => (
                <AnimatedSection key={m.name} delay={i * 0.1}>
                  <div className="glass-card rounded-xl p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-neon-coral/[0.08] flex items-center justify-center mx-auto mb-4">
                      <m.icon className="w-7 h-7 text-neon-coral" />
                    </div>
                    <h3 className="font-display font-semibold text-base mb-1">{m.name}</h3>
                    <p className="text-sm text-muted-foreground">{m.role}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </main>
      <Footer />
    </div>
  );
}
