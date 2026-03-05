import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar } from "lucide-react";
import { setSeo, setBlogPostJsonLd, SEO_CONSTANTS } from "@/lib/seo";

interface Post {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string | null;
  content_pt: string;
  content_en: string | null;
  excerpt_pt: string | null;
  excerpt_en: string | null;
  cover_image_url: string | null;
  tags: string[];
  published_at: string | null;
  author_name: string;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { language, t } = useLanguage();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      setPost(data as Post | null);
      setLoading(false);
    };
    fetchPost();
  }, [slug]);

  useEffect(() => {
    if (!post) return;
    const title = (language === "en" && post.title_en) ? post.title_en : post.title_pt;
    const excerpt = (language === "en" && post.excerpt_en) ? post.excerpt_en : (post.excerpt_pt || title);
    const url = `${SEO_CONSTANTS.SITE_URL}/blog/${post.slug}`;

    setSeo({
      title: `${title} | Aliv.iA Blog`,
      description: excerpt,
      url,
      image: post.cover_image_url || undefined,
      type: "article",
      publishedAt: post.published_at || undefined,
      author: post.author_name,
      tags: post.tags,
    });

    setBlogPostJsonLd({
      title,
      description: excerpt,
      url,
      image: post.cover_image_url || undefined,
      publishedAt: post.published_at || undefined,
      author: post.author_name,
      tags: post.tags,
    });
  }, [post, language]);

  const getTitle = (p: Post) => (language === "en" && p.title_en) ? p.title_en : p.title_pt;
  const getContent = (p: Post) => (language === "en" && p.content_en) ? p.content_en : p.content_pt;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">404</h1>
          <p className="text-muted-foreground mb-6">
            {language === "pt" ? "Artigo não encontrado." : "Article not found."}
          </p>
          <Link to="/blog" className="text-primary hover:underline">{t("blog.back")}</Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <article className="container py-10 max-w-3xl">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {t("blog.back")}
        </Link>

        {post.cover_image_url && (
          <img
            src={post.cover_image_url}
            alt={getTitle(post)}
            className="w-full rounded-xl mb-6 max-h-[400px] object-cover"
          />
        )}

        <h1 className="text-3xl font-bold text-foreground mb-3">{getTitle(post)}</h1>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {t("blog.published_at")} {new Date(post.published_at).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US")}
            </span>
          )}
          <span>{t("blog.by")} {post.author_name}</span>
        </div>

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        <div
          className="prose prose-neutral dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: getContent(post) }}
        />
      </article>
      <Footer />
    </div>
  );
};

export default BlogPost;
