import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar } from "lucide-react";
import { setSeo, setBlogPostJsonLd, SEO_CONSTANTS } from "@/lib/seo";
import { structureBlogContent, relatedBlogPosts } from "@/lib/blogStructure";
import BlogShareBar from "@/components/blog/BlogShareBar";
import BlogPostCta from "@/components/blog/BlogPostCta";

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
  const [publishedPosts, setPublishedPosts] = useState<Post[]>([]);
  const contentLanguage = language === "en" && post?.content_en ? "en" : "pt";
  const structured = useMemo(() => structureBlogContent(
    post ? (contentLanguage === "en" ? post.content_en || post.content_pt : post.content_pt) : ""
  ), [post, contentLanguage]);
  const related = post ? relatedBlogPosts(post, publishedPosts) : [];

  useEffect(() => {
    const fetchPost = async () => {
      if (!slug) return;
      setLoading(true);
      setPost(null);
      const { data } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();
      if (!active) return;
      setPost(data as Post | null);
      setLoading(false);
    };
    let active = true;
    fetchPost();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    let active = true;
    supabase.from("blog_posts").select("id, slug, title_pt, title_en, tags")
      .eq("published", true).order("published_at", { ascending: false })
      .then(({ data }) => { if (active) setPublishedPosts((data || []) as Post[]); });
    return () => { active = false; };
  }, []);

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
      language: contentLanguage === "en" ? "en" : "pt-BR",
      articleBody: structured.text,
      sections: structured.sections,
    });
  }, [post, language, contentLanguage, structured]);

  const getTitle = (p: Post) => (language === "en" && p.title_en) ? p.title_en : p.title_pt;

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
      <main className="container py-10 max-w-3xl">
      <article lang={contentLanguage === "en" ? "en" : "pt-BR"}>
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
            <time dateTime={post.published_at} className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {t("blog.published_at")} {new Date(post.published_at).toLocaleDateString(language === "pt" ? "pt-BR" : "en-US")}
            </time>
          )}
          <span>{t("blog.by")} {post.author_name}</span>
        </div>

        <BlogShareBar url={`${SEO_CONSTANTS.SITE_URL}/blog/${post.slug}`} title={getTitle(post)} className="mb-6" />

        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="secondary">{tag}</Badge>
            ))}
          </div>
        )}

        {structured.sections.length > 1 && (
          <nav aria-label={language === "en" ? "In this article" : language === "es" ? "En este artículo" : "Neste artigo"} className="border-y border-border py-5 mb-8">
            <h2 className="font-semibold mb-3">{language === "en" ? "In this article" : language === "es" ? "En este artículo" : "Neste artigo"}</h2>
            <ul className="space-y-2 text-sm">
              {structured.sections.map(section => <li key={section.id} className={section.level === 3 ? "pl-4" : ""}>
                <a href={`#${section.id}`} className="text-primary hover:underline">{section.title}</a>
              </li>)}
            </ul>
          </nav>
        )}

        <div
          className="prose prose-neutral dark:prose-invert max-w-none [&_h2]:scroll-mt-28 [&_h3]:scroll-mt-28"
          dangerouslySetInnerHTML={{ __html: structured.html }}
        />
        <BlogShareBar url={`${SEO_CONSTANTS.SITE_URL}/blog/${post.slug}`} title={getTitle(post)} className="mt-10 border-t border-border pt-6" />
        <BlogPostCta tags={post.tags || []} />
      </article>
      {related.length > 0 && <nav aria-label={language === "en" ? "Related articles" : language === "es" ? "Artículos relacionados" : "Artigos relacionados"} className="border-t border-border mt-10 pt-6">
        <h2 className="text-xl font-semibold mb-4">{language === "en" ? "Related articles" : language === "es" ? "Artículos relacionados" : "Artigos relacionados"}</h2>
        <ul className="space-y-3">{related.map(p => <li key={p.slug}><Link to={`/blog/${p.slug}`} className="text-primary hover:underline">{getTitle(p)}</Link></li>)}</ul>
      </nav>}
      </main>
      <Footer />
    </div>
  );
};

export default BlogPost;
