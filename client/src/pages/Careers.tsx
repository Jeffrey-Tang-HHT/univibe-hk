import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { Briefcase, MapPin, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Careers() {
  const { t } = useLanguage();

  const openings = [
    {
      title: t("careers.job1.title"),
      type: t("careers.job1.type"),
      location: t("careers.job1.location"),
      desc: t("careers.job1.desc"),
      color: "text-neon-coral",
      bgColor: "bg-neon-coral/[0.06]",
    },
    {
      title: t("careers.job2.title"),
      type: t("careers.job2.type"),
      location: t("careers.job2.location"),
      desc: t("careers.job2.desc"),
      color: "text-neon-cyan",
      bgColor: "bg-neon-cyan/[0.06]",
    },
    {
      title: t("careers.job3.title"),
      type: t("careers.job3.type"),
      location: t("careers.job3.location"),
      desc: t("careers.job3.desc"),
      color: "text-neon-lavender",
      bgColor: "bg-neon-lavender/[0.06]",
    },
  ];

  const perks = [
    t("careers.perk1"),
    t("careers.perk2"),
    t("careers.perk3"),
    t("careers.perk4"),
    t("careers.perk5"),
    t("careers.perk6"),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-lavender/20 bg-neon-lavender/[0.06] text-neon-lavender text-xs font-medium mb-4">
              <Briefcase className="w-3 h-3" />
              {t("careers.badge")}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              {t("careers.title1")} <span className="text-neon-lavender">{t("careers.title2")}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              {t("careers.subtitle")}
            </p>
          </AnimatedSection>

          {/* Perks */}
          <AnimatedSection className="max-w-3xl mx-auto mb-16">
            <div className="glass-card rounded-2xl p-8">
              <h2 className="font-display text-xl font-bold mb-5 text-center">{t("careers.perks.title")}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {perks.map((perk) => (
                  <div key={perk} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-neon-coral flex-shrink-0" />
                    {perk}
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Openings */}
          <AnimatedSection className="mb-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">{t("careers.openings.title")}</h2>
          </AnimatedSection>

          <div className="space-y-4 max-w-3xl mx-auto">
            {openings.map((job, i) => (
              <AnimatedSection key={job.title} delay={i * 0.1}>
                <div className="glass-card rounded-xl p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-display font-semibold text-lg mb-2">{job.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {job.type}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {job.location}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{job.desc}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="self-start border-border/60 text-foreground hover:bg-secondary"
                    >
                      {t("careers.apply")} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center mt-12">
            <p className="text-sm text-muted-foreground">
              {t("careers.contact")} <a href="mailto:careers@unigohk.com" className="text-neon-coral hover:underline">careers@unigohk.com</a>
            </p>
          </AnimatedSection>
        </div>
      </main>
      <Footer />
    </div>
  );
}
