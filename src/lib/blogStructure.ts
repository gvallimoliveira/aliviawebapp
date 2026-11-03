import DOMPurify from "dompurify";

export interface BlogSection { id: string; title: string; level: number }

/** Derived presentation only: never writes back to the authored article. */
export function structureBlogContent(content: string) {
  const doc = new DOMParser().parseFromString(DOMPurify.sanitize(content), "text/html");
  const sections: BlogSection[] = [];
  const used = new Set(Array.from(doc.querySelectorAll("[id]")).map(el => el.id));
  doc.querySelectorAll("h2, h3").forEach((heading, index) => {
    const title = heading.textContent?.trim() || "";
    if (!title) return;
    let id = heading.id;
    if (!id) {
      const base = `secao-${index + 1}`;
      id = base;
      let suffix = 2;
      while (used.has(id)) id = `${base}-${suffix++}`;
      heading.id = id;
    }
    used.add(id);
    sections.push({ id, title, level: Number(heading.tagName.slice(1)) });
  });
  return { html: doc.body.innerHTML, text: doc.body.textContent || "", sections };
}

export const BLOG_INTENTS = [
  { question: "Fisioterapia dá dinheiro?", context: "Valor percebido na consulta particular", slug: "consulta-particular-fisioterapia-como-justificar-valor" },
  { question: "Como me tornar um fisioterapeuta de referência?", context: "Segurança e desenvolvimento profissional", slug: "como-o-aliv-ia-acelera-o-desenvolvimento-do-fisioterapeuta-recem-formado" },
  { question: "Como estruturar uma avaliação fisioterapêutica?", context: "Organização da avaliação com apoio do Aliv.iA", slug: "como-o-aliv-ia-otimiza-a-avaliacao-do-profissional-descubra-o-poder-da-ia-na-fisioterapia" },
];

export function availableBlogIntents(posts: { slug: string }[]) {
  const publishedSlugs = new Set(posts.map(p => p.slug));
  return BLOG_INTENTS.filter(intent => publishedSlugs.has(intent.slug));
}

export function relatedBlogPosts<T extends { slug: string; tags: string[] }>(post: T, published: T[]) {
  const normalize = (tags: string[]) => tags.map(tag => tag.toLocaleLowerCase("pt-BR").trim());
  const tags = new Set(normalize(post.tags || []));
  const professionalSlugs = new Set(BLOG_INTENTS.map(intent => intent.slug));
  return published.filter(p => p.slug !== post.slug).map(p => ({
    post: p,
    score: normalize(p.tags || []).filter(tag => tags.has(tag)).length +
      (professionalSlugs.has(post.slug) && professionalSlugs.has(p.slug) ? 2 : 0),
  })).filter(p => p.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(p => p.post);
}