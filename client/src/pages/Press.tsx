import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { Newspaper, Download, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Press() {
  const { t } = useLanguage();

  const highlights = [
    { stat: "20+", label: t("press.stat1") },
    { stat: "100K+", label: t("press.stat2") },
    { stat: "3", label: t("press.stat3") },
    { stat: "2026", label: t("press.stat4") },
  ];

  const mentions = [
    { source: t("press.mention1.source"), title: t("press.mention1.title"), date: t("press.mention1.date") },
    { source: t("press.mention2.source"), title: t("press.mention2.title"), date: t("press.mention2.date") },
    { source: t("press.mention3.source"), title: t("press.mention3.title"), date: t("press.mention3.date") },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-emerald/20 bg-neon-emerald/[0.06] text-neon-emerald text-xs font-medium mb-4">
              <Newspaper className="w-3 h-3" />
              {t("press.badge")}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              {t("press.title1")} <span className="text-neon-emerald">{t("press.title2")}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              {t("press.subtitle")}
            </p>
          </AnimatedSection>

          {/* Key stats */}
          <AnimatedSection className="mb-16">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {highlights.map((h) => (
                <div key={h.label} className="glass-card rounded-xl p-5 text-center">
                  <div className="font-display text-2xl font-bold text-neon-coral mb-1">{h.stat}</div>
                  <div className="text-xs text-muted-foreground">{h.label}</div>
                </div>
              ))}
            </div>
          </AnimatedSection>

          {/* Press mentions */}
          <AnimatedSection className="mb-16">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">{t("press.mentions.title")}</h2>
            <div className="space-y-4 max-w-3xl mx-auto">
              {mentions.map((m, i) => (
                <AnimatedSection key={m.title} delay={i * 0.1}>
                  <div className="glass-card rounded-xl p-6 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-neon-cyan font-medium">{m.source}</span>
                      <h3 className="font-display font-semibold text-base mt-1">{m.title}</h3>
                      <span className="text-xs text-muted-foreground mt-1 block">{m.date}</span>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>

          {/* Press kit & contact */}
          <AnimatedSection className="max-w-3xl mx-auto">
            <div className="glass-card rounded-2xl p-8 text-center">
              <h2 className="font-display text-xl font-bold mb-3">{t("press.kit.title")}</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                {t("press.kit.desc")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button className="bg-neon-coral hover:bg-neon-coral/90 text-white font-medium">
                  <Download className="w-4 h-4 mr-2" />
                  {t("press.kit.download")}
                </Button>
                <Button variant="outline" className="border-border/60 text-foreground hover:bg-secondary">
                  <Mail className="w-4 h-4 mr-2" />
                  {t("press.kit.contact")}
                </Button>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </main>
      <Footer />
    </div>
  );
}
