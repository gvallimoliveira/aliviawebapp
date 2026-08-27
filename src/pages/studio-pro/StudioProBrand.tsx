import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronDown,
  Download,
  FileText,
  FolderPlus,
  Images,
  Loader2,
  Save,
  Settings2,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRODUCT } from "./product";
import { useStudioAccess } from "./useStudioAccess";
import StudioProCreate from "./StudioProCreate";
import type { ComposedBlock } from "@/studio-core";
import BrandColorFields from "./BrandColorFields";
import { DEFAULT_COLOR_KIT, readColorKit, writeColorKit, type BrandColorKit } from "./brandColors";
import { readAudiences, writeAudiences, type BrandAudience } from "./audiences";

/**
 * ESPAÇO DE UMA MARCA
 *
 * A marca ativa vive na URL (`/studio-pro/app/marca/:brandId`) e a aba no
 * query param `?aba=` — persiste ao minimizar ou trocar de app. Toda consulta
 * de artes é filtrada por `brand_id`: material de marcas diferentes nunca se
 * mistura. Dentro da marca, pastas (`folder`) organizam por cliente/tema.
 */

type Brand = {
  id: string;
  name: string;
  niche: string | null;
  tone: string | null;
  logo_url: string | null;
  colors: Record<string, string> | null;
  description: string | null;
  source_url: string | null;
  instagram_handle: string | null;
  topics: string[] | null;
  content_source: string | null;
  audiences: unknown;
  positioning: string | null;
  strategy_notes: string | null;
  /** Assinatura (logo + nome) em todas as artes desta marca. */
  signature_enabled: boolean | null;
};

type Creation = {
  id: string;
  headline: string | null;
  caption: string | null;
  thumb: string | null;
  format: string | null;
  folder: string;
  created_at: string;
  is_favorite: boolean;
  png_path: string | null;
  composition: unknown;
};


type Tab = "criar" | "artes" | "ajustes";

const StudioProBrand = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { access, loading: accessLoading } = useStudioAccess();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("aba") as Tab) || "criar";
  const folder = params.get("pasta") || "Todas";

  const [brands, setBrands] = useState<Brand[]>([]);
  const [creations, setCreations] = useState<Creation[]>([]);
  /** URLs assinadas dos PNGs salvos (prévia nítida na galeria). */
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    niche: "",
    tone: "",
    logo_url: "",
    description: "",
    source_url: "",
    instagram_handle: "",
    keywords: "",
    positioning: "",
    strategy_notes: "",
  });
  /** Nichos da marca — cada um alimenta uma aba de conteúdo no editor. */
  const [audiences, setAudiences] = useState<BrandAudience[]>([]);
  const [interpreting, setInterpreting] = useState(false);
  const [colorKit, setColorKit] = useState<BrandColorKit>(DEFAULT_COLOR_KIT);
  /** Assinatura da marca nas artes — ajuste global desta marca. */
  const [signatureEnabled, setSignatureEnabled] = useState(true);

  const brand = brands.find((b) => b.id === brandId) ?? null;

  useEffect(() => {
    if (!authLoading && !user) navigate(`${PRODUCT.base}/entrar`, { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    document.title = brand ? `${brand.name} — ${PRODUCT.name}` : `${PRODUCT.name}`;
  }, [brand]);

  const ART_FIELDS = "id, headline, caption, thumb, format, folder, created_at, is_favorite, png_path, composition";

  /**
   * Atualiza somente a lista de artes — sem tocar em `loading`. Isso é o que
   * roda depois de salvar uma arte: o editor continua montado e a versão em
   * tela não é sorteada de novo.
   */
  const loadCreations = useCallback(async () => {
    if (!user || !brandId) return;
    const { data, error } = await supabase
      .from("studio_creations")
      .select(ART_FIELDS)
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[studio-pro] creations", error);
      return;
    }
    setCreations((data as unknown as Creation[]) ?? []);
  }, [user, brandId]);

  /**
   * Prévia em alta resolução: a galeria mostra o PNG de publicação guardado no
   * bucket privado (URL assinada), e só cai na miniatura quando ele não existe.
   */
  useEffect(() => {
    const paths = creations.map((c) => c.png_path).filter((p): p is string => !!p);
    if (paths.length === 0) return;
    let alive = true;
    (async () => {
      const { data, error } = await supabase.storage.from("studio-art").createSignedUrls(paths, 3600);
      if (error || !data || !alive) return;
      const next: Record<string, string> = {};
      data.forEach((row, i) => {
        if (row.signedUrl) next[paths[i]] = row.signedUrl;
      });
      setPreviews((prev) => ({ ...prev, ...next }));
    })();
    return () => {
      alive = false;
    };
  }, [creations]);

  const load = useCallback(async () => {
    if (!user || !brandId) return;
    setLoading(true);
    const [{ data: brandRows, error: brandError }, { data: artRows, error: artError }] = await Promise.all([
      supabase.from("studio_brands").select("*").order("created_at", { ascending: false }),
      // Isolamento: só artes desta marca.
      supabase
        .from("studio_creations")
        .select(ART_FIELDS)
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false }),
    ]);
    if (brandError) console.error("[studio-pro] brands", brandError);
    if (artError) console.error("[studio-pro] creations", artError);
    setBrands((brandRows as Brand[]) ?? []);
    setCreations((artRows as unknown as Creation[]) ?? []);
    setLoading(false);
  }, [user, brandId]);


  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name,
        niche: brand.niche ?? "",
        tone: brand.tone ?? "",
        logo_url: brand.logo_url ?? "",
        description: brand.description ?? "",
        source_url: brand.source_url ?? "",
        instagram_handle: brand.instagram_handle ?? "",
        keywords: (brand.topics ?? []).join(", "),
        positioning: brand.positioning ?? "",
        strategy_notes: brand.strategy_notes ?? "",
      });
      setAudiences(readAudiences(brand.audiences));
      setColorKit(readColorKit(brand.colors));
      setSignatureEnabled(brand.signature_enabled !== false);
    }
  }, [brand?.id]);

  const folders = useMemo(() => {
    const set = new Set<string>(["Geral"]);
    creations.forEach((c) => set.add(c.folder || "Geral"));
    return Array.from(set);
  }, [creations]);

  const shown = folder === "Todas" ? creations : creations.filter((c) => (c.folder || "Geral") === folder);

  const setTab = (next: Tab) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("aba", next);
    setParams(nextParams, { replace: true });
  };

  const setFolder = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next === "Todas") nextParams.delete("pasta");
    else nextParams.set("pasta", next);
    setParams(nextParams, { replace: true });
  };

  const saveBrand = async () => {
    if (!brandId) return;
    if (!form.name.trim()) {
      toast.error("A marca precisa de um nome.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("studio_brands")
      .update({
        name: form.name.trim(),
        niche: form.niche.trim() || null,
        tone: form.tone.trim() || null,
        logo_url: form.logo_url.trim() || null,
        description: form.description.trim() || null,
        source_url: form.source_url.trim() || null,
        instagram_handle: form.instagram_handle.trim() || null,
        topics: form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        colors: writeColorKit(colorKit),
        positioning: form.positioning.trim() || null,
        strategy_notes: form.strategy_notes.trim() || null,
        audiences: writeAudiences(audiences),
        signature_enabled: signatureEnabled,
      })
      .eq("id", brandId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Kit de marca atualizado.");
    void load();
  };

  /**
   * Interpretação por IA: lê o kit (nome, nicho, descrição, palavras-chave) e
   * devolve posicionamento, nichos com dores/desejos/provas e estratégia.
   * Salva no banco e recarrega — o usuário revisa e ajusta depois.
   */
  const interpretBrand = async () => {
    if (!brandId) return;
    if (!form.description.trim() && !form.niche.trim()) {
      toast.error("Descreva a marca ou informe o nicho antes de interpretar.");
      return;
    }
    setInterpreting(true);
    try {
      // Salva o kit atual primeiro para a IA ler o texto mais recente.
      await saveBrand();
      const { data, error } = await supabase.functions.invoke("studio-brand-interpret", {
        body: { brandId },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) {
        toast.error((data as { error: string }).error);
        return;
      }
      toast.success("Marca interpretada. Revise os públicos abaixo.");
      void load();
    } catch (err) {
      console.error("[studio-pro] interpret", err);
      toast.error("Não foi possível interpretar a marca agora.");
    } finally {
      setInterpreting(false);
    }
  };

  const updateAudience = (index: number, patch: Partial<BrandAudience>) =>
    setAudiences((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  const addAudience = () =>
    setAudiences((prev) => [...prev, { id: `publico-${prev.length + 1}`, label: "" }]);

  const removeAudience = (index: number) =>
    setAudiences((prev) => prev.filter((_, i) => i !== index));


  const moveArt = async (id: string, target: string) => {
    const { error } = await supabase.from("studio_creations").update({ folder: target }).eq("id", id);
    if (error) {
      toast.error("Não foi possível mover a arte.");
      return;
    }
    setCreations((prev) => prev.map((c) => (c.id === id ? { ...c, folder: target } : c)));
  };

  const removeArt = async (id: string) => {
    const { error } = await supabase.from("studio_creations").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    setCreations((prev) => prev.filter((c) => c.id !== id));
  };

  /** Favorito = referência de estilo para as próximas artes desta marca. */
  const toggleFavorite = async (art: Creation) => {
    const next = !art.is_favorite;
    const { error } = await supabase.from("studio_creations").update({ is_favorite: next }).eq("id", art.id);
    if (error) {
      toast.error("Não foi possível favoritar.");
      return;
    }
    setCreations((prev) => prev.map((c) => (c.id === art.id ? { ...c, is_favorite: next } : c)));
    toast.success(next ? "Favoritada — vira referência das próximas artes." : "Removida das referências.");
  };

  /** Baixa o PNG guardado no momento em que a arte foi salva. */
  const downloadArt = async (art: Creation) => {
    if (!art.png_path) {
      toast.error("Esta arte foi salva antes do PNG guardado. Gere e salve novamente.");
      return;
    }
    const { data, error } = await supabase.storage.from("studio-art").download(art.png_path);
    if (error || !data) {
      toast.error("Não foi possível baixar o PNG.");
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = art.png_path.split("/").pop() ?? "arte.png";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const downloadCaption = (art: Creation) => {
    if (!art.caption) {
      toast.error("Esta arte não tem legenda salva.");
      return;
    }
    const blob = new Blob([art.caption], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(art.headline ?? "legenda").slice(0, 40).replace(/\s+/g, "-").toLowerCase()}.txt`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  const copyCaption = async (art: Creation) => {
    if (!art.caption) return;
    try {
      await navigator.clipboard.writeText(art.caption);
      toast.success("Legenda copiada");
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  /** Receitas dos favoritos desta marca, usadas como linhagem no editor. */
  const inspirations = useMemo(
    () =>
      creations
        .filter((c) => c.is_favorite && Array.isArray(c.composition) && (c.composition as unknown[]).length > 0)
        .slice(0, 12)
        .map((c) => c.composition as ComposedBlock[]),
    [creations],
  );


  const newFolder = async () => {
    const name = window.prompt("Nome da nova pasta");
    if (!name?.trim()) return;
    setFolder(name.trim());
    toast.info("Pasta criada. Mova artes para ela pelo menu de cada arte.");
  };

  if (authLoading || accessLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!brand) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Marca não encontrada.</p>
        <Button asChild className="rounded-full">
          <Link to={`${PRODUCT.base}/app`}>Voltar para minhas marcas</Link>
        </Button>
      </main>
    );
  }

  const accent = brand.colors?.primary ?? "hsl(var(--primary))";

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb + troca de marca */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`${PRODUCT.base}/app`} className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Marcas
          </Link>
          <span>›</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ background: accent }}
                />
                {brand.name}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {brands.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => navigate(`${PRODUCT.base}/app/marca/${b.id}?aba=${tab}`)}
                >
                  <span
                    className="mr-2 h-3 w-3 rounded-full border border-border"
                    style={{ background: b.colors?.primary ?? "hsl(var(--primary))" }}
                  />
                  {b.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span>›</span>
          <span>{tab === "criar" ? "Criar" : tab === "artes" ? "Artes" : "Ajustes"}</span>
        </div>

        {/* Abas */}
        <div className="mt-4 flex gap-2">
          {([
            { id: "criar" as Tab, label: "Criar", icon: Sparkles },
            { id: "artes" as Tab, label: "Artes", icon: Images },
            { id: "ajustes" as Tab, label: "Ajustes da marca", icon: Settings2 },
          ]).map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setTab(id)}
            >
              <Icon className="mr-1.5 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {tab === "criar" && (
          <StudioProCreate
            brand={brand}
            folder={folder}
            watermark={access.watermark}
            inspirations={inspirations}
            // VIP recebe a página inteira; planos e acessos concedidos recebem
            // lotes de 6 artes por geração, para render a cota em variedade.
            maxArts={access.unlimited ? Infinity : 6}
            // Só a lista de artes é recarregada: a versão em tela não muda.
            onSaved={() => void loadCreations()}
          />
        )}


        {tab === "artes" && (
          <section
            className="mt-5 rounded-3xl border border-border bg-card p-6"
            style={{ borderTopColor: accent, borderTopWidth: 3 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {["Todas", ...folders].map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={folder === f ? "secondary" : "ghost"}
                    className="h-8 rounded-full text-xs"
                    onClick={() => setFolder(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="rounded-full" onClick={newFolder}>
                <FolderPlus className="mr-1.5 h-4 w-4" />
                Nova pasta
              </Button>
            </div>

            {shown.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhuma arte nesta pasta ainda. As artes geradas para <strong>{brand.name}</strong> ficam
                aqui — separadas das outras marcas.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {shown.map((art) => (
                  <li key={art.id} className="overflow-hidden rounded-2xl border border-border bg-muted/40">
                    {(() => {
                      // Prefere o PNG de publicação; a miniatura é só fallback.
                      const src = (art.png_path && previews[art.png_path]) || art.thumb;
                      const ratio = art.format === "9x16" ? "aspect-[9/16]" : "aspect-square";
                      if (!src)
                        return (
                          <div className="flex aspect-[4/5] w-full items-center justify-center text-xs text-muted-foreground">
                            sem miniatura
                          </div>
                        );
                      return (
                        <img
                          src={src}
                          alt={art.headline ?? "arte"}
                          loading="lazy"
                          className={`${ratio} w-full bg-background object-contain`}
                        />
                      );
                    })()}
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-semibold">{art.headline ?? "Sem título"}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {art.folder || "Geral"} · {art.format ?? "post"}
                        {art.is_favorite && " · referência"}
                      </p>
                      {/* PNG e legenda ficam guardados na arte salva. */}
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full px-2 text-[11px]"
                          onClick={() => downloadArt(art)}
                          title="Baixar PNG em alta"
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          PNG
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full px-2 text-[11px]"
                          onClick={() => downloadCaption(art)}
                          title="Baixar legenda (.txt)"
                        >
                          <FileText className="mr-1 h-3.5 w-3.5" />
                          Legenda
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 rounded-full px-2 text-[11px]"
                          onClick={() => copyCaption(art)}
                        >
                          Copiar
                        </Button>
                        <Button
                          size="sm"
                          variant={art.is_favorite ? "secondary" : "ghost"}
                          className="h-7 w-7 p-0"
                          onClick={() => toggleFavorite(art)}
                          title={art.is_favorite ? "Remover das referências" : "Usar como referência criativa"}
                        >
                          <Star className={`h-3.5 w-3.5 ${art.is_favorite ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                      <div className="mt-1 flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                              Mover
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {folders.map((f) => (
                              <DropdownMenuItem key={f} onClick={() => moveArt(art.id, f)}>
                                {f}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => removeArt(art.id)}
                          title="Remover arte"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "ajustes" && (
          <section className="mt-5 grid gap-3 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="edit-name">Nome da marca</Label>
              <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-niche">Nicho</Label>
              <Input id="edit-niche" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-site">Site</Label>
              <Input
                id="edit-site"
                placeholder="https://aliviawebapp.com.br"
                value={form.source_url}
                onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-instagram">Instagram</Label>
              <Input
                id="edit-instagram"
                placeholder="@aliviawebapp"
                value={form.instagram_handle}
                onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-keywords">Palavras-chave</Label>
              <Input
                id="edit-keywords"
                placeholder="separe por vírgula"
                value={form.keywords}
                onChange={(e) => setForm({ ...form, keywords: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edit-description">Descrição da marca</Label>
              <Textarea
                id="edit-description"
                rows={3}
                placeholder="O que a marca faz, para quem e o que a diferencia."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <BrandColorFields idPrefix="edit" kit={colorKit} onChange={setColorKit} />
            {brand.content_source === "alivia" && (
              <p className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground sm:col-span-2">
                Esta marca usa o acervo editorial oficial do Aliv.iA. Na aba <strong>Criar</strong> você
                escolhe o público (Paciente, Profissional, Clínica ou Estudante) e as artes saem com a
                mensagem real de cada landing.
              </p>
            )}

            {/* ---------- Interpretação do produto: 360° + nichos ---------- */}
            <div className="sm:col-span-2 rounded-2xl border border-border bg-background/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Interpretação do produto</h3>
                  <p className="text-xs text-muted-foreground">
                    Os públicos viram abas na aba Criar. A visão 360° interpola todos eles.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={interpretBrand}
                  disabled={interpreting || saving}
                >
                  {interpreting ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-1.5 h-4 w-4" />
                  )}
                  Interpretar com IA
                </Button>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <Label htmlFor="edit-positioning">Posicionamento 360°</Label>
                  <Textarea
                    id="edit-positioning"
                    rows={3}
                    placeholder="O que o produto é como um todo, atravessando todos os públicos."
                    value={form.positioning}
                    onChange={(e) => setForm({ ...form, positioning: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-strategy">Notas de estratégia</Label>
                  <Textarea
                    id="edit-strategy"
                    rows={3}
                    placeholder="Como informar, gerar desejo e vender para esta marca."
                    value={form.strategy_notes}
                    onChange={(e) => setForm({ ...form, strategy_notes: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {audiences.map((a, i) => (
                  <div key={`${a.id}-${i}`} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`Nome do público ${i + 1}`}
                        placeholder="Nome do público (ex.: Clínica)"
                        value={a.label}
                        onChange={(e) => updateAudience(i, { label: e.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover público"
                        onClick={() => removeAudience(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      placeholder="Quem é e em que momento chega"
                      value={a.description ?? ""}
                      onChange={(e) => updateAudience(i, { description: e.target.value })}
                    />
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {([
                        ["pains", "Dores (uma por linha)"],
                        ["desires", "Desejos (uma por linha)"],
                        ["proof", "Soluções que ofereço (uma por linha)"],
                      ] as const).map(([field, label]) => (
                        <div key={field}>
                          <Label className="text-[11px]">{label}</Label>
                          <Textarea
                            rows={3}
                            value={(a[field] ?? []).join("\n")}
                            onChange={(e) =>
                              updateAudience(i, {
                                [field]: e.target.value
                                  .split("\n")
                                  .map((t) => t.trim())
                                  .filter(Boolean),
                              } as Partial<BrandAudience>)
                            }
                          />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2">
                      <Label htmlFor={`edit-cta-${a.id}`} className="text-[11px]">
                        Objetivo / CTA deste público
                      </Label>
                      <Input
                        id={`edit-cta-${a.id}`}
                        placeholder="Ex.: Fazer minha avaliação, Testar o painel profissional"
                        value={a.cta ?? ""}
                        onChange={(e) => updateAudience(i, { cta: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="rounded-full" onClick={addAudience}>
                  <FolderPlus className="mr-1.5 h-4 w-4" />
                  Adicionar público
                </Button>
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="edit-tone">Tom de voz</Label>
              <Textarea
                id="edit-tone"
                rows={2}
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edit-logo">URL do logo</Label>
              <Input
                id="edit-logo"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              />
            </div>

            {/* Proteção do material: toda arte sai assinada com a marca. */}
            <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background p-4 sm:col-span-2">
              <div>
                <Label htmlFor="edit-signature" className="text-sm font-semibold">
                  Assinatura da marca nos conteúdos
                </Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aplica o logo e o nome desta marca discretamente no canto de todas as artes geradas — evita
                  print e cópia sem crédito. Desligue só se você for assinar manualmente.
                </p>
              </div>
              <Switch id="edit-signature" checked={signatureEnabled} onCheckedChange={setSignatureEnabled} />
            </div>
            <Button onClick={saveBrand} disabled={saving} className="rounded-full sm:col-span-2">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Salvar alterações
            </Button>
            {access.isVip && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Acesso VIP: nível agência, até {access.brandLimit} marcas, sem cota.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
};

export default StudioProBrand;
