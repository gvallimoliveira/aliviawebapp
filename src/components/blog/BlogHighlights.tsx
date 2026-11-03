import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { estimateReadingMinutes } from "@/lib/blogShare";

export type BlogAudience = "professional" | "clinic" | "patient" | "academic";

/** Curated picks per audience; missing/unpublished slugs fall back to the latest posts. */
const PICKS: Record<BlogAudience, string[]> = {
  professional: [
    "consulta-particular-fisioterapia-como-justificar-valor",
    "controle-de-carga-fisioterapia-evitar-recidiva-pse-monitoramento",
    "raciocinio-clinico-fisioterapia-recem-formado-do-diagnostico-a-alta",
  ],
  clinic: [
    "gestao-clinica-fisioterapia-padronizar-atendimento-reduzir-abandono",
    "6-degraus-reabilitacao-steps",
    "como-o-aliv-ia-otimiza-a-avaliacao-do-profissional-descubra-o-poder-da-ia-na-fisioterapia",
  ],
  patient: [
    "dor-lombar-com-componente-radicular-o-que-e-e-como-tratar-a-ciatalgia",
    "ciclo-difi-dor-cronica",
    "pos-operatorios-e-a-ferramenta-aliv-ia-o-guia-para-sua-recuperacao-segura",
  ],
  academic: [
    "raciocinio-clinico-fisioterapia-recem-formado-do-diagnostico-a-alta",
    "como-o-aliv-ia-acelera-o-desenvolvimento-do-fisioterapeuta-recem-formado",
    "6-degraus-reabilitacao-steps",
  ],
};

interface Row {
  slug: string;
  title_pt: string;
  title_en: string | null;
  content_pt: string;
  tags: string[];
  published_at: string | null;
}

const COPY = {
  pt: { eyebrow: "Do blog", title: "Leituras que fazem sentido para você", all: "Ver todos os artigos", min: "min de leitura" },
  en: { eyebrow: "From the blog", title: "Reads picked for you", all: "See all articles", min: "min read" },
  es: { eyebrow: "Del blog", title: "Lecturas pensadas para ti", all: "Ver todos los artículos", min: "min de lectura" },
};

const BlogHighlights = ({ audience }: { audience: BlogAudience }) => {
  const { language } = useLanguage();
  const c = COPY[(language as keyof typeof COPY) ?? "pt"] ?? COPY.pt;
  const [posts, setPosts] = useState<Row[]>([]);

  useEffect(() => {
    let active = true;
    supabase
      .from("blog_posts")
      .select("slug, title_pt, title_en, content_pt, tags, published_at")
      .eq("published", true)
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const all = (data || []) as Row[];
        const picks = PICKS[audience];
        const chosen = picks.map((s) => all.find((p) => p.slug === s)).filter(Boolean) as Row[];
        for (const p of all) {
          if (chosen.length >= 3) break;
          if (!chosen.includes(p)) chosen.push(p);
        }
        setPosts(chosen.slice(0, 3));
      });
    return () => { active = false; };
  }, [audience]);

  if (posts.length === 0) return null;

  return (
    <section aria-labelledby={`blog-highlights-${audience}`} className="relative z-10 container py-14">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
            <BookOpen className="h-3.5 w-3.5" /> {c.eyebrow}
          </p>
          <h2 id={`blog-highlights-${audience}`} className="text-xl font-semibold text-foreground md:text-2xl">{c.title}</h2>
        </div>
        <Link to="/blog" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-primary">
          {c.all} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ul className="grid gap-4 md:grid-cols-3">
        {posts.map((p) => (
          <li key={p.slug}>
            <Link
              to={`/blog/${p.slug}`}
              className="group flex h-full flex-col rounded-2xl border border-border/60 bg-card/60 p-5 transition-colors hover:border-primary/40 hover:bg-card"
            >
              {p.tags?.[0] && <span className="mb-3 text-xs font-medium text-primary">{p.tags[0].charAt(0).toUpperCase() + p.tags[0].slice(1)}</span>}
              <span className="flex-1 font-medium leading-snug text-foreground group-hover:text-primary">
                {language === "en" && p.title_en ? p.title_en : p.title_pt}
              </span>
              <span className="mt-4 text-xs text-muted-foreground">{estimateReadingMinutes(p.content_pt)} {c.min}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default BlogHighlights;
