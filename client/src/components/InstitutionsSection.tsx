import AnimatedSection from "./AnimatedSection";
import { useLanguage } from "@/contexts/LanguageContext";

const institutions = [
  "HKU", "CUHK", "HKUST", "PolyU", "CityU", "HKBU", "LingU", "EdUHK",
  "HKU SPACE", "HKCC", "CUSCS", "VTC", "SPEED", "LIFE", "OUHK",
];

export default function InstitutionsSection() {
  const { lang } = useLanguage();

  return (
    <section className="py-16 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <AnimatedSection className="text-center mb-8">
        <p className="text-sm text-muted-foreground font-medium">
          {lang === "zh" ? (
            <>支援全港超過 <span className="text-neon-cyan">20+</span> 間院校</>
          ) : (
            <>Supporting <span className="text-neon-cyan">20+</span> institutions across Hong Kong</>
          )}
        </p>
      </AnimatedSection>

      {/* Scrolling marquee */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

        <div className="flex animate-marquee">
          {[...institutions, ...institutions].map((inst, i) => (
            <div
              key={`${inst}-${i}`}
              className="flex-shrink-0 mx-4 px-5 py-2.5 rounded-lg border border-border/40 bg-secondary/30 text-sm text-muted-foreground font-medium whitespace-nowrap"
            >
              {inst}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
          width: max-content;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
