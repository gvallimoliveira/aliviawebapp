/**
 * Experimental, self-contained blog pill for the professional dashboard.
 * To remove: delete this file and its single <BlogPillCard /> line in ProDashboard.tsx.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { estimateReadingMinutes } from "@/lib/blogShare";

const STORAGE_KEY = "alivia:blog-pill:collapsed";
const ROTATE_MS = 12_000;

interface Row { slug: string; title_pt: string; title_en: string | null; content_pt: string }

const COPY = {
  pt: { label: "Pílula clínica", read: (m: number) => `Ler em ${m} min`, show: "Mostrar leitura", hide: "Recolher" },
  en: { label: "Clinical pill", read: (m: number) => `${m} min read`, show: "Show read", hide: "Collapse" },
  es: { label: "Píldora clínica", read: (m: number) => `Leer en ${m} min`, show: "Mostrar lectura", hide: "Contraer" },
};

const BlogPillCard = () => {
  const { language } = useLanguage();
  const c = COPY[language as keyof typeof COPY] ?? COPY.pt;
  const [posts, setPosts] = useState<Row[]>([]);
  const [index, setIndex] = useState(0);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });

  useEffect(() => {
    let active = true;
    supabase
      .from("blog_posts")
      .select("slug, title_pt, title_en, content_pt")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .limit(8)
      .then(({ data }) => {
        if (!active || !data?.length) return;
        setPosts(data as Row[]);
        setIndex(Math.floor(Math.random() * data.length));
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (collapsed || posts.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % posts.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [collapsed, posts.length]);

  const toggle = () => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch { /* noop */ }
      return next;
    });
  };

  if (!posts.length) return null;
  const post = posts[index % posts.length];
  const title = language === "en" && post.title_en ? post.title_en : post.title_pt;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        aria-label={c.show}
      >
        <BookOpen className="h-3.5 w-3.5 text-primary" />
        {c.label}
        <ChevronDown className="h-3 w-3" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-2">
      <BookOpen className="h-4 w-4 text-primary shrink-0" />
      <span className="hidden sm:inline text-[10px] font-semibold uppercase tracking-wide text-primary shrink-0">{c.label}</span>
      <Link
        key={post.slug}
        to={`/blog/${post.slug}`}
        className="flex-1 min-w-0 flex items-center gap-2 group animate-in fade-in duration-500"
      >
        <span className="truncate text-sm text-foreground group-hover:text-primary transition-colors">{title}</span>
        <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-primary">
          {c.read(estimateReadingMinutes(post.content_pt))}
          <ArrowRight className="h-3 w-3" />
        </span>
      </Link>
      <button
        type="button"
        onClick={toggle}
        className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={c.hide}
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default BlogPillCard;
