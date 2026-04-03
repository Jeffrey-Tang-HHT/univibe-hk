import { Shield } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

export default function Footer() {
  const { t } = useLanguage();

  const productLinks = [
    { label: t("nav.features"), href: "#features" },
    { label: t("nav.dating"), href: "#dating" },
    { label: t("nav.campus"), href: "#campus" },
    { label: t("nav.pricing"), href: "#pricing" },
  ];

  const companyLinks = [
    { label: t("footer.about"), href: "#" },
    { label: t("footer.blog"), href: "#" },
    { label: t("footer.careers"), href: "#" },
    { label: t("footer.press"), href: "#" },
  ];

  const legalLinks = [
    { label: t("footer.privacy"), href: "#" },
    { label: t("footer.terms"), href: "#" },
    { label: t("footer.guidelines"), href: "#" },
  ];

  const footerSections = [
    { title: t("footer.product"), links: productLinks },
    { title: t("footer.company"), links: companyLinks },
    { title: t("footer.legal"), links: legalLinks },
  ];

  return (
    <footer className="border-t border-border/30 py-12">
      <div className="container">
        <div className="grid md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <a href="/" className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-md bg-neon-coral flex items-center justify-center">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display text-base font-bold tracking-tight">
                UniVibe<span className="text-neon-coral"> HK</span>
              </span>
            </a>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
              {t("footer.desc")}
            </p>
          </div>

          {/* Link columns */}
          {footerSections.map((col) => (
            <div key={col.title}>
              <h4 className="font-display font-semibold text-sm mb-3">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => {
                        if (link.href === "#") {
                          e.preventDefault();
                          toast(t("common.coming_soon"));
                        }
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("footer.tagline")}
          </p>
        </div>
      </div>
    </footer>
  );
}
