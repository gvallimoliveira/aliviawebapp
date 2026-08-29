import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
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
import BrandAssetsFields, { type BrandDoc } from "./BrandAssetsFields";
import { DEFAULT_COLOR_KIT, readColorKit, writeColorKit, type BrandColorKit } from "./brandColors";
import { matrixAudiences, readAudiences, writeAudiences, type BrandAudience } from "./audiences";
import { NICHE_PRESETS, type NichePreset } from "./nichePresets";
import BrandQuestionnaireCard from "./BrandQuestionnaireCard";
import StudioArtEditor from "./StudioArtEditor";
import {
  answeredCount,
  formatBriefAnswers,
  readBriefAnswers,
  type BriefAnswers,
} from "./brandQuestionnaire";

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
  /** Respostas do questionário de marca (caminho de quem não tem manual). */
  brief_answers?: unknown;
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
  /** Receita da arte: seed, público, objetivo e texto exato (edição pela galeria). */
  seed: string;
  segment: string | null;
  angle: string | null;
  block_kind: string | null;
  text_edits: unknown;
};


type Tab = "criar" | "artes" | "ajustes";

/** Campo de lista (uma por linha) com digitação livre: só normaliza ao sair. */
const AudienceListField = ({
  label,
  value,
  onCommit,
}: {
  label: string;
  value: string[];
  onCommit: (lines: string[]) => void;
}) => {
  const joined = value.join("\n");
  const [text, setText] = useState(joined);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(joined);
  }, [joined, focused]);

  return (
    <div>
      <Label className="text-[11px]">{label}</Label>
      <Textarea
        rows={8}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          setFocused(false);
          const lines = text
            .split("\n")
            .map((t) => t.trim())
            .filter(Boolean);
          setText(lines.join("\n"));
          onCommit(lines);
        }}
      />
    </div>
  );
};

/**
 * Etapa recolhível dos ajustes. O fluxo passa a ser numerado (matéria-prima →
 * visual → mensagem → públicos), e cada etapa mostra se já está preenchida.
 */
const BrandSection = ({
  step,
  title,
  hint,
  filled,
  defaultOpen,
  children,
}: {
  step: number;
  title: string;
  hint: string;
  filled?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
          {step}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {filled && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Check className="h-3 w-3" />
                preenchido
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
        </span>
        <ChevronDown
          className={`mt-1 h-4 w-4 shrink-0 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-border p-5">{children}</div>}
    </section>
  );
};

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
  /** Bump força repovoar os campos após uma recarga do banco (ex.: pós-IA). */
  const [hydrateNonce, setHydrateNonce] = useState(0);
  const [colorKit, setColorKit] = useState<BrandColorKit>(DEFAULT_COLOR_KIT);
  /** Assinatura da marca nas artes — ajuste global desta marca. */
  const [signatureEnabled, setSignatureEnabled] = useState(true);
  /** Manual da marca anexado nesta sessão — fonte principal da interpretação. */
  const [doc, setDoc] = useState<BrandDoc | null>(null);
  /** Respostas do questionário de marca — briefing declarado pelo cliente. */
  const [briefAnswers, setBriefAnswers] = useState<BriefAnswers>({});
  const briefFilled = useMemo(() => answeredCount(briefAnswers), [briefAnswers]);

  const brand = brands.find((b) => b.id === brandId) ?? null;

  useEffect(() => {
    if (!authLoading && !user) navigate(`${PRODUCT.base}/entrar`, { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    document.title = brand ? `${brand.name} — ${PRODUCT.name}` : `${PRODUCT.name}`;
  }, [brand]);

  const ART_FIELDS =
    "id, headline, caption, thumb, format, folder, created_at, is_favorite, png_path, composition, seed, segment, angle, block_kind, text_edits";

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

  /**
   * Re-hidratação do formulário. Antes dependia só de `brand?.id`: depois da
   * interpretação por IA o id não muda, então os campos novos só apareciam com
   * F5. Agora qualquer recarga marcada (`hydrateNonce`) repovoa os campos.
   */
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
      setBriefAnswers(readBriefAnswers(brand.brief_answers));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand?.id, hydrateNonce]);

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
        brief_answers: briefAnswers,
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
    const brief = formatBriefAnswers(briefAnswers);
    if (!doc && !brief && !form.description.trim() && !form.niche.trim()) {
      toast.error("Responda o questionário, descreva a marca ou anexe o manual em PDF antes de interpretar.");
      return;
    }
    setInterpreting(true);
    try {
      // Salva o kit atual primeiro para a IA ler o texto mais recente.
      await saveBrand();
      // Cores só são sobrescritas se o usuário ainda está no kit padrão.
      const kitIsDefault =
        colorKit.primary.toUpperCase() === DEFAULT_COLOR_KIT.primary.toUpperCase() &&
        colorKit.primary2.toUpperCase() === DEFAULT_COLOR_KIT.primary2.toUpperCase();
      const { data, error } = await supabase.functions.invoke("studio-brand-interpret", {
        // Com manual anexado, ele manda no kit: cores e tipografia vêm do documento.
        body: {
          brandId,
          applyColors: !!doc || (!!form.source_url.trim() && kitIsDefault),
          doc: doc ? { name: doc.name, mime: doc.mime, base64: doc.base64 } : undefined,
          extra: brief || undefined,
        },
      });

      if (error) throw error;
      if ((data as { error?: string })?.error) {
        toast.error((data as { error: string }).error);
        return;
      }
      toast.success(
        doc
          ? "Manual interpretado: kit, cores e tipografia preenchidos. Revise abaixo."
          : "Marca interpretada. Revise os públicos abaixo.",
      );

      // Espera a recarga e força a re-hidratação: sem isso os campos só
      // apareciam após F5.
      await load();
      setHydrateNonce((n) => n + 1);
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

  /**
   * Aplica um kit de conteúdo de nicho: preenche os campos vazios da marca e
   * substitui a lista de públicos pelos do modelo. Nada é enviado ao servidor
   * até o usuário salvar.
   */
  const applyNichePreset = (preset: NichePreset) => {
    setForm((prev) => ({
      ...prev,
      niche: prev.niche.trim() || preset.niche,
      tone: prev.tone.trim() || preset.tone,
      keywords: prev.keywords.trim() || preset.keywords,
      positioning: prev.positioning.trim() || preset.positioning,
      strategy_notes: prev.strategy_notes.trim() || preset.strategy_notes,
    }));
    setAudiences(preset.audiences.map((a) => ({ ...a })));
    toast.success(`Kit "${preset.label}" aplicado. Ajuste os textos e salve.`);
  };




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

/** Receitas dos favoritos desta marca, usadas como influência (não como padrão fixo) no editor. */
  const inspirations = useMemo(
    () =>
      creations
        .filter((c) => c.is_favorite && Array.isArray(c.composition) && (c.composition as unknown[]).length > 0)
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
            unlimited={access.unlimited}
            photoLimit={access.photoLimit}
            // Só a lista de artes é recarregada: a versão em tela não muda.
            onSaved={() => void loadCreations()}
            // O editor do card manda para cá quando falta público, CTA ou kit.
            onOpenBrandSettings={() => setTab("ajustes")}
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
                      const ratio =
                        art.format === "9x16"
                          ? "aspect-[9/16]"
                          : art.format === "4x5"
                            ? "aspect-[4/5]"
                            : "aspect-square";
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
          <div className="mt-5 space-y-4 pb-24">
            {/* ================= 1. COMECE POR AQUI ================= */}
            <BrandSection
              step={1}
              title="Comece por aqui"
              hint="O que você já tem em mãos: logo, manual da marca — ou o questionário guiado."
              defaultOpen
              filled={!!form.logo_url || !!doc || briefFilled > 0}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-name">Nome da marca</Label>
                  <Input
                    id="edit-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-niche">Nicho</Label>
                  <Input
                    id="edit-niche"
                    value={form.niche}
                    onChange={(e) => setForm({ ...form, niche: e.target.value })}
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
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-site">Site (opcional — a IA lê a página)</Label>
                  <Input
                    id="edit-site"
                    placeholder="https://aliviawebapp.com.br"
                    value={form.source_url}
                    onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                  />
                </div>

                {/* Logo e manual da marca vêm antes de tudo: é a matéria-prima. */}
                <BrandAssetsFields
                  only={["logo", "doc"]}
                  logoUrl={form.logo_url}
                  onLogoChange={(logo_url) => setForm({ ...form, logo_url })}
                  fontKey={colorKit.font}
                  onFontChange={(font) => setColorKit({ ...colorKit, font })}
                  doc={doc}
                  onDocChange={setDoc}
                />

                <div className="sm:col-span-2">
                <BrandQuestionnaireCard
                  answers={briefAnswers}
                  onChange={setBriefAnswers}
                  onSave={saveBrand}
                  onInterpret={interpretBrand}
                  brandName={form.name}
                  saving={saving}
                  interpreting={interpreting}
                />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background p-4 sm:col-span-2">
                  <p className="max-w-md text-xs text-muted-foreground">
                    Com o manual, o questionário ou o site preenchidos, a IA monta as etapas 2, 3 e 4
                    para você revisar.
                  </p>
                  <Button
                    variant="default"
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
              </div>
            </BrandSection>

            {/* ================= 2. IDENTIDADE VISUAL ================= */}
            <BrandSection
              step={2}
              title="Identidade visual"
              hint="Cores, tipografia e assinatura aplicadas em todas as artes."
              defaultOpen={!!brand.positioning}
              filled={!!brand.positioning || !!form.logo_url}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <BrandColorFields idPrefix="edit" kit={colorKit} onChange={setColorKit} />
                <BrandAssetsFields
                  only={["font"]}
                  logoUrl={form.logo_url}
                  onLogoChange={(logo_url) => setForm({ ...form, logo_url })}
                  fontKey={colorKit.font}
                  onFontChange={(font) => setColorKit({ ...colorKit, font })}
                  doc={doc}
                  onDocChange={setDoc}
                />
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background p-4 sm:col-span-2">
                  <div>
                    <Label htmlFor="edit-signature" className="text-sm font-semibold">
                      Assinatura da marca nos conteúdos
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aplica o logo e o nome desta marca discretamente no canto de todas as artes geradas —
                      evita print e cópia sem crédito. Desligue só se você for assinar manualmente.
                    </p>
                  </div>
                  <Switch id="edit-signature" checked={signatureEnabled} onCheckedChange={setSignatureEnabled} />
                </div>
              </div>
            </BrandSection>

            {/* ================= 3. MENSAGEM ================= */}
            <BrandSection
              step={3}
              title="Mensagem"
              hint="O que a marca diz e como fala. Orienta a IA — não aparece dentro da arte."
              defaultOpen={!!brand.positioning}
              filled={!!form.positioning || !!form.tone}
            >
              <div className="grid gap-3 sm:grid-cols-2">
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
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-keywords">Palavras-chave</Label>
                  <Input
                    id="edit-keywords"
                    placeholder="separe por vírgula"
                    value={form.keywords}
                    onChange={(e) => setForm({ ...form, keywords: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-positioning">Posicionamento 360°</Label>
                  <Textarea
                    id="edit-positioning"
                    rows={3}
                    placeholder="O que o produto é como um todo, atravessando todos os públicos."
                    value={form.positioning}
                    onChange={(e) => setForm({ ...form, positioning: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-tone">Tom de voz (diretriz)</Label>
                  <Textarea
                    id="edit-tone"
                    rows={4}
                    value={form.tone}
                    onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Como a marca fala (pode colar o manual inteiro). É orientação para a IA escrever —{" "}
                    <strong>nunca aparece como texto dentro das artes</strong>.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-strategy">Notas de estratégia</Label>
                  <Textarea
                    id="edit-strategy"
                    rows={3}
                    placeholder="Como informar, gerar desejo e vender para esta marca."
                    value={form.strategy_notes}
                    onChange={(e) => setForm({ ...form, strategy_notes: e.target.value })}
                  />
                </div>

                {/* Kits de conteúdo prontos por nicho — ponto de partida editável */}
                <div className="rounded-xl border border-dashed border-border p-3 sm:col-span-2">
                  <p className="text-xs font-medium text-foreground">Começar com um kit de nicho</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Preenche posicionamento, tom e públicos com um modelo pronto. É só um ponto de
                    partida: tudo continua editável e as artes saem do seu kit de marca.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {NICHE_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="rounded-full"
                        title={preset.hint}
                        onClick={() => applyNichePreset(preset)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {brand.content_source === "alivia" && (
                  <p className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground sm:col-span-2">
                    Esta marca usa o acervo editorial oficial do Aliv.iA. Na aba <strong>Criar</strong> você
                    escolhe o público (Paciente, Profissional, Clínica ou Estudante) e as artes saem com a
                    mensagem real de cada landing.
                  </p>
                )}
              </div>
            </BrandSection>

            {/* ================= 4. PÚBLICOS ================= */}
            <BrandSection
              step={4}
              title="Públicos"
              hint="Cada público vira uma aba na criação, com dores, desejos, chamada e CTA próprios."
              defaultOpen={audiences.length > 0}
              filled={audiences.length > 0}
            >
              <div className="space-y-3">
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
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Label htmlFor={`edit-parent-${a.id}`} className="text-[11px] text-muted-foreground">
                        Tipo de público
                      </Label>
                      <select
                        id={`edit-parent-${a.id}`}
                        className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                        value={a.parentId ?? ""}
                        onChange={(e) => updateAudience(i, { parentId: e.target.value || undefined })}
                      >
                        <option value="">Público matriz (conta na métrica oficial)</option>
                        {audiences
                          .filter((p, pi) => pi !== i && !p.parentId && p.label.trim())
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              Sub-nicho de {p.label}
                            </option>
                          ))}
                      </select>
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
                        <AudienceListField
                          key={field}
                          label={label}
                          value={a[field] ?? []}
                          onCommit={(lines) =>
                            updateAudience(i, { [field]: lines } as Partial<BrandAudience>)
                          }
                        />
                      ))}
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`edit-keyword-${a.id}`} className="text-[11px]">
                          Palavra-chave na arte
                        </Label>
                        <Input
                          id={`edit-keyword-${a.id}`}
                          placeholder="Ex.: Dor crônica, Esportista, Geração 60+"
                          value={a.keyword ?? ""}
                          onChange={(e) => updateAudience(i, { keyword: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor={`edit-hook-${a.id}`} className="text-[11px]">
                          Chamada direta (você...)
                        </Label>
                        <Input
                          id={`edit-hook-${a.id}`}
                          placeholder="Ex.: Você que convive com dor crônica há meses"
                          value={a.hook ?? ""}
                          onChange={(e) => updateAudience(i, { hook: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <AudienceListField
                        label="Outras chamadas (uma por linha)"
                        value={a.hooks ?? []}
                        onCommit={(lines) => updateAudience(i, { hooks: lines })}
                      />
                      <div>
                        <Label htmlFor={`edit-cta-${a.id}`} className="text-[11px]">
                          Objetivo / CTA deste público
                        </Label>
                        <Input
                          id={`edit-cta-${a.id}`}
                          placeholder="Ex.: Fazer minha avaliação, Testar o painel profissional"
                          value={a.cta ?? ""}
                          onChange={(e) => updateAudience(i, { cta: e.target.value })}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          O motor alterna entre a chamada principal e as outras para não repetir abertura.
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={addAudience}>
                    <FolderPlus className="mr-1.5 h-4 w-4" />
                    Adicionar público
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Métrica oficial: <strong>{matrixAudiences(audiences).length} públicos matriz</strong>
                    {audiences.length - matrixAudiences(audiences).length > 0
                      ? ` + ${audiences.length - matrixAudiences(audiences).length} sub-nichos (não entram na contagem das artes)`
                      : ""}
                    .
                  </p>
                </div>
              </div>
            </BrandSection>

            {/* Salvar sempre ao alcance, em qualquer etapa. */}
            <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur">
              {access.isVip ? (
                <p className="text-xs text-muted-foreground">
                  Acesso VIP: nível agência, até {access.brandLimit} marcas, sem cota.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Revise as etapas e salve para aplicar nas artes.</p>
              )}
              <Button onClick={saveBrand} disabled={saving} className="rounded-full">
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Salvar alterações
              </Button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
};

export default StudioProBrand;
