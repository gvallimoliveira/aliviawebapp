import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Trash2, Plus, Pencil, Loader2, X, BookOpen, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BlogPost {
  id: string;
  slug: string;
  title_pt: string;
  title_en: string | null;
  content_pt: string;
  content_en: string | null;
  excerpt_pt: string | null;
  excerpt_en: string | null;
  cover_image_url: string | null;
  author_name: string;
  tags: string[];
  published: boolean;
  published_at: string | null;
  created_at: string;
}

const slugify = (text: string) =>
  text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const BlogManagement = ({ language }: { language: string }) => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiKeywords, setAiKeywords] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [form, setForm] = useState({
    title_pt: "", title_en: "", content_pt: "", content_en: "",
    excerpt_pt: "", excerpt_en: "", slug: "", tags: "", author_name: "Aliv.iA",
    published: false,
  });

  const t = (key: string) => {
    const labels: Record<string, Record<string, string>> = {
      pt: {
        title: "Gerenciar Blog", new: "Novo Artigo", edit: "Editar", delete: "Excluir",
        publish: "Publicar", unpublish: "Despublicar", draft: "Rascunho", published: "Publicado",
        title_pt: "Título (PT)", title_en: "Título (EN)", content_pt: "Conteúdo (PT)",
        content_en: "Conteúdo (EN)", excerpt_pt: "Resumo (PT)", excerpt_en: "Resumo (EN)",
        slug: "Slug (URL)", tags: "Tags (separadas por vírgula)", cover: "Imagem de capa",
        save: "Salvar", cancel: "Cancelar", saved: "Artigo salvo!", deleted: "Artigo excluído.",
        confirm_delete: "Excluir este artigo?", author: "Autor", no_posts: "Nenhum artigo.",
        ai_generate: "Gerar com IA", ai_topic: "Tema do artigo", ai_topic_placeholder: "Ex: dor no ombro",
        ai_keywords: "Palavras-chave SEO", ai_keywords_placeholder: "Ex: dor no ombro, fisioterapia, tratamento",
        ai_btn: "Gerar Rascunho", ai_generating: "Gerando artigo...", ai_title: "Gerar Artigo com IA",
        ai_desc: "A IA criará um rascunho completo otimizado para SEO e conversão.",
      },
      en: {
        title: "Manage Blog", new: "New Article", edit: "Edit", delete: "Delete",
        publish: "Publish", unpublish: "Unpublish", draft: "Draft", published: "Published",
        title_pt: "Title (PT)", title_en: "Title (EN)", content_pt: "Content (PT)",
        content_en: "Content (EN)", excerpt_pt: "Excerpt (PT)", excerpt_en: "Excerpt (EN)",
        slug: "Slug (URL)", tags: "Tags (comma-separated)", cover: "Cover image",
        save: "Save", cancel: "Cancel", saved: "Article saved!", deleted: "Article deleted.",
        confirm_delete: "Delete this article?", author: "Author", no_posts: "No articles.",
        ai_generate: "Generate with AI", ai_topic: "Article topic", ai_topic_placeholder: "E.g.: shoulder pain",
        ai_keywords: "SEO Keywords", ai_keywords_placeholder: "E.g.: shoulder pain, physiotherapy, treatment",
        ai_btn: "Generate Draft", ai_generating: "Generating article...", ai_title: "Generate Article with AI",
        ai_desc: "AI will create a complete draft optimized for SEO and conversion.",
      },
    };
    return labels[language]?.[key] || labels.en[key] || key;
  };

  const fetchPosts = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    setPosts((data as BlogPost[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchPosts(); }, []);

  const openNew = () => {
    setIsNew(true);
    setEditing(null);
    setForm({ title_pt: "", title_en: "", content_pt: "", content_en: "", excerpt_pt: "", excerpt_en: "", slug: "", tags: "", author_name: "Aliv.iA", published: false });
    setImageFile(null);
  };

  const openEdit = (post: BlogPost) => {
    setIsNew(false);
    setEditing(post);
    setForm({
      title_pt: post.title_pt, title_en: post.title_en || "", content_pt: post.content_pt,
      content_en: post.content_en || "", excerpt_pt: post.excerpt_pt || "",
      excerpt_en: post.excerpt_en || "", slug: post.slug, tags: post.tags?.join(", ") || "",
      author_name: post.author_name, published: post.published,
    });
    setImageFile(null);
  };

  const closeForm = () => { setEditing(null); setIsNew(false); };

  const handleAiGenerate = async () => {
    if (!aiTopic.trim()) return;
    setAiGenerating(true);
    try {
      const keywords = aiKeywords.split(",").map((k) => k.trim()).filter(Boolean);
      const { data, error } = await supabase.functions.invoke("generate-blog-article", {
        body: { topic: aiTopic, keywords },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsNew(true);
      setEditing(null);
      setForm({
        title_pt: data.title_pt || "",
        title_en: data.title_en || "",
        content_pt: data.content_pt || "",
        content_en: data.content_en || "",
        excerpt_pt: data.excerpt_pt || "",
        excerpt_en: data.excerpt_en || "",
        slug: slugify(data.title_pt || aiTopic),
        tags: (data.tags || []).join(", "),
        author_name: "Aliv.iA",
        published: false,
      });
      setAiDialogOpen(false);
      setAiTopic("");
      setAiKeywords("");
      toast({ description: language === "pt" ? "Rascunho gerado! Revise antes de salvar." : "Draft generated! Review before saving." });
    } catch (e: any) {
      console.error("AI generation error:", e);
      toast({ title: "Erro", description: e.message || "Falha ao gerar artigo", variant: "destructive" });
    } finally {
      setAiGenerating(false);
    }
  };

  const handleTitleChange = (val: string) => {
    setForm((f) => ({ ...f, title_pt: val, slug: isNew ? slugify(val) : f.slug }));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return editing?.cover_image_url || null;
    const ext = imageFile.name.split(".").pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("blog-images").upload(path, imageFile);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("blog-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.title_pt.trim() || !form.content_pt.trim()) return;
    setSaving(true);
    const coverUrl = await uploadImage();
    const tags = form.tags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      title_pt: form.title_pt, title_en: form.title_en || null,
      content_pt: form.content_pt, content_en: form.content_en || null,
      excerpt_pt: form.excerpt_pt || null, excerpt_en: form.excerpt_en || null,
      slug: form.slug || slugify(form.title_pt), tags, author_name: form.author_name,
      published: form.published, cover_image_url: coverUrl,
      published_at: form.published ? (editing?.published_at || new Date().toISOString()) : null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (isNew) {
      ({ error } = await supabase.from("blog_posts").insert(payload));
    } else if (editing) {
      ({ error } = await supabase.from("blog_posts").update(payload).eq("id", editing.id));
    }
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ description: t("saved") }); closeForm(); fetchPosts(); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t("confirm_delete"))) return;
    await supabase.from("blog_posts").delete().eq("id", id);
    toast({ description: t("deleted") });
    fetchPosts();
  };

  const togglePublish = async (post: BlogPost) => {
    const newPub = !post.published;
    await supabase.from("blog_posts").update({
      published: newPub,
      published_at: newPub ? (post.published_at || new Date().toISOString()) : post.published_at,
    }).eq("id", post.id);
    fetchPosts();
  };

  const showForm = isNew || editing;

  return (
    <Card className="mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("title")}</CardTitle>
        </div>
        {!showForm && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setAiDialogOpen(true)} className="gap-1.5">
              <Sparkles className="h-4 w-4" /> {t("ai_generate")}
            </Button>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" /> {t("new")}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {showForm ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("title_pt")} *</Label>
                <Input value={form.title_pt} onChange={(e) => handleTitleChange(e.target.value)} />
              </div>
              <div>
                <Label>{t("title_en")}</Label>
                <Input value={form.title_en} onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t("slug")}</Label>
              <Input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>{t("excerpt_pt")}</Label>
                <Textarea rows={2} value={form.excerpt_pt} onChange={(e) => setForm((f) => ({ ...f, excerpt_pt: e.target.value }))} />
              </div>
              <div>
                <Label>{t("excerpt_en")}</Label>
                <Textarea rows={2} value={form.excerpt_en} onChange={(e) => setForm((f) => ({ ...f, excerpt_en: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>{t("content_pt")} *</Label>
              <Textarea rows={10} value={form.content_pt} onChange={(e) => setForm((f) => ({ ...f, content_pt: e.target.value }))} />
            </div>
            <div>
              <Label>{t("content_en")}</Label>
              <Textarea rows={10} value={form.content_en} onChange={(e) => setForm((f) => ({ ...f, content_en: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>{t("tags")}</Label>
                <Input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} />
              </div>
              <div>
                <Label>{t("author")}</Label>
                <Input value={form.author_name} onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))} />
              </div>
              <div>
                <Label>{t("cover")}</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.published} onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))} />
              <Label>{form.published ? t("published") : t("draft")}</Label>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={saving || !form.title_pt.trim() || !form.content_pt.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {t("save")}
              </Button>
              <Button variant="ghost" onClick={closeForm}>
                <X className="h-4 w-4 mr-1" /> {t("cancel")}
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : posts.length === 0 ? (
          <p className="text-muted-foreground text-center py-6">{t("no_posts")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("title_pt")}</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Tags</TableHead>
                <TableHead className="w-[140px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title_pt}</TableCell>
                  <TableCell>
                    <Badge variant={post.published ? "default" : "secondary"} className="cursor-pointer" onClick={() => togglePublish(post)}>
                      {post.published ? t("published") : t("draft")}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                    {post.tags?.join(", ") || "—"}
                  </TableCell>
                  <TableCell className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(post)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(post.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> {t("ai_title")}
            </DialogTitle>
            <DialogDescription>{t("ai_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>{t("ai_topic")} *</Label>
              <Input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder={t("ai_topic_placeholder")}
                disabled={aiGenerating}
              />
            </div>
            <div>
              <Label>{t("ai_keywords")}</Label>
              <Input
                value={aiKeywords}
                onChange={(e) => setAiKeywords(e.target.value)}
                placeholder={t("ai_keywords_placeholder")}
                disabled={aiGenerating}
              />
            </div>
            <Button
              onClick={handleAiGenerate}
              disabled={aiGenerating || !aiTopic.trim()}
              className="w-full gap-2"
            >
              {aiGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> {t("ai_generating")}
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> {t("ai_btn")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default BlogManagement;
