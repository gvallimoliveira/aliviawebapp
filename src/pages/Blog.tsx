import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { setSeo, setBlogListJsonLd, SEO_CONSTANTS } from "@/lib/seo";
import { availableBlogIntents } from "@/lib/blogStructure";

interface BlogPost {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string | null;
  excerpt_pt: string | null;
  excerpt_en: string | null;
  cover_image_url: string | null;
  tags: string[];
  published_at: string | null;
  author_name: string;
}

const Blog = () => {
  const { language, t } = useLanguage();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSeo({
      title: language === "pt"
        ? "Blog Aliv.iA | Avaliação fisioterapêutica, carreira e reabilitação"
        : "Blog | Aliv.iA — Articles about pain and physiotherapy",
      description: language === "pt"
        ? "Explore avaliação fisioterapêutica, valor da consulta particular, desenvolvimento profissional e reabilitação nos artigos do Aliv.iA."
        : "Articles about musculoskeletal pain, physiotherapy, exercises and wellness. Expert tips to take care of your health.",
      url: `${SEO_CONSTANTS.SITE_URL}/blog`,
      type: "website",
    });
  }, [language]);

  useEffect(() => {
    const fetchPosts = async () => {
      const { data } = await supabase
        .from("blog_posts")
        .select("id, slug, title_pt, title_en, excerpt_pt, excerpt_en, cover_image_url, tags, published_at, author_name")
        .eq("published", true)
        .order("published_at", { ascending: false });
      const fetched = (data as BlogPost[]) || [];
      setPosts(fetched);
      setLoading(false);

      if (fetched.length > 0) {
        setBlogListJsonLd(
          fetched.map((p) => ({
            title: p.title_pt,
            url: `${SEO_CONSTANTS.SITE_URL}/blog/${p.slug}`,
            image: p.cover_image_url || undefined,
            date: p.published_at || undefined,
          }))
        );
      }
    };
    fetchPosts();
  }, []);

  const getTitle = (p: BlogPost) => (language === "en" && p.title_en) ? p.title_en : p.title_pt;
  const getExcerpt = (p: BlogPost) => (language === "en" && p.excerpt_en) ? p.excerpt_en : p.excerpt_pt;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container py-12 max-w-4xl">
        <h1 className="text-3xl font-bold text-foreground mb-2">{t("blog.title")}</h1>
        <p className="text-muted-foreground mb-8">{t("blog.subtitle")}</p>

        {language === "pt" && availableBlogIntents(posts).length > 0 && <nav aria-label="Perguntas de carreira e prática clínica" className="border-y border-border py-5 mb-8">
          <h2 className="text-lg font-semibold mb-4">Carreira e prática clínica</h2>
          <ul className="grid gap-5 md:grid-cols-3">{availableBlogIntents(posts).map(intent => <li key={intent.slug}>
            <Link to={`/blog/${intent.slug}`} className="text-primary font-medium hover:underline">{intent.question}</Link>
            <p className="text-sm text-muted-foreground mt-1">{intent.context}</p>
          </li>)}</ul>
        </nav>}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{t("blog.no_posts")}</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group rounded-xl border border-border bg-card overflow-hidden transition-shadow hover:shadow-lg"
              >
                {post.cover_image_url && (
                  <img
                    src={post.cover_image_url}
                    alt={getTitle(post)}
                    className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                )}
                <div className="p-5">
                  <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {getTitle(post)}
                  </h2>
                  {getExcerpt(post) && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{getExcerpt(post)}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(post.published_at).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US")}
                      </span>
                    )}
                    <span>{post.author_name}</span>
                  </div>
                  {post.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
