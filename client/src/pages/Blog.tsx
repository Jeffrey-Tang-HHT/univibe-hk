import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnimatedSection from "@/components/AnimatedSection";
import { useLanguage } from "@/contexts/LanguageContext";
import { BookOpen, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Blog() {
  const { t } = useLanguage();

  const posts = [
    {
      tag: t("blog.post1.tag"),
      title: t("blog.post1.title"),
      excerpt: t("blog.post1.excerpt"),
      date: t("blog.post1.date"),
      color: "text-neon-coral",
      bgColor: "bg-neon-coral/[0.06]",
      borderColor: "border-neon-coral/20",
    },
    {
      tag: t("blog.post2.tag"),
      title: t("blog.post2.title"),
      excerpt: t("blog.post2.excerpt"),
      date: t("blog.post2.date"),
      color: "text-neon-cyan",
      bgColor: "bg-neon-cyan/[0.06]",
      borderColor: "border-neon-cyan/20",
    },
    {
      tag: t("blog.post3.tag"),
      title: t("blog.post3.title"),
      excerpt: t("blog.post3.excerpt"),
      date: t("blog.post3.date"),
      color: "text-neon-lavender",
      bgColor: "bg-neon-lavender/[0.06]",
      borderColor: "border-neon-lavender/20",
    },
    {
      tag: t("blog.post4.tag"),
      title: t("blog.post4.title"),
      excerpt: t("blog.post4.excerpt"),
      date: t("blog.post4.date"),
      color: "text-neon-emerald",
      bgColor: "bg-neon-emerald/[0.06]",
      borderColor: "border-neon-emerald/20",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 pt-24 pb-16">
        <div className="container">
          <AnimatedSection className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-cyan/20 bg-neon-cyan/[0.06] text-neon-cyan text-xs font-medium mb-4">
              <BookOpen className="w-3 h-3" />
              {t("blog.badge")}
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              {t("blog.title1")} <span className="text-neon-cyan">{t("blog.title2")}</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg leading-relaxed">
              {t("blog.subtitle")}
            </p>
          </AnimatedSection>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {posts.map((post, i) => (
              <AnimatedSection key={post.title} delay={i * 0.1}>
                <div className="glass-card rounded-xl p-6 h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${post.color} ${post.bgColor} border ${post.borderColor}`}>
                      {post.tag}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                  </div>
                  <h3 className="font-display font-semibold text-lg mb-3 leading-snug">{post.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">{post.excerpt}</p>
                  <Button variant="ghost" size="sm" className="mt-4 self-start text-muted-foreground hover:text-foreground p-0 h-auto">
                    {t("blog.read_more")} <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
