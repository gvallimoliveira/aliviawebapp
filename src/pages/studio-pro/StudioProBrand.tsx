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
  PencilLine,
  Save,
  Settings2,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import StudioFeedCalendar from "./StudioFeedCalendar";
import { CalendarDays } from "lucide-react";
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
import { useBrandPhotoLimit } from "./useBrandPhotoLimit";
import StudioProCreate from "./StudioProCreate";
import StudioBoundary from "@/pages/studio/StudioBoundary";
import StudioProAuthorial from "./StudioProAuthorial";
import BrandHooksCard from "./BrandHooksCard";
import BrandTextsCard from "./BrandTextsCard";
import type { ComposedBlock } from "@/studio-core";
import BrandColorFields from "./BrandColorFields";
import BrandAssetsFields, { type BrandDoc } from "./BrandAssetsFields";
import { DEFAULT_COLOR_KIT, readColorKit, writeColorKit, type BrandColorKit } from "./brandColors";
import { highlightTermsFor, matrixAudiences, readAudiences, writeAudiences, type BrandAudience } from "./audiences";

/** Sugestão de termos de destaque a partir do nome/palavra-chave do tema. */
const suggestHighlightTerms = (a: BrandAudience): string[] =>
  highlightTermsFor({ ...a, highlightTerms: undefined });
import { NICHE_PRESETS, type NichePreset } from "./nichePresets";
import BrandQuestionnaireCard from "./BrandQuestionnaireCard";
import BrandMembersCard from "./BrandMembersCard";
import { FormatInsightsEditor, KeywordMatrixEditor, ReasoningMatrixEditor } from "./StructuredBrandEditors";
import { isOwnBrand } from "./brandSharing";
import StudioArtEditor from "./StudioArtEditor";
import { isArtSnapshot } from "./artSnapshot";
import { deliver, deliverMany } from "@/pages/studio/exportImage";
import {
  keywordMatrixFromText,
  keywordMatrixToText,
  reasoningMatrixFromText,
  reasoningMatrixToText,
} from "./contentMatrices";

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
  /** Conta que criou a marca — só ela gerencia acessos e exclui. */
  user_id?: string | null;
  name: string;
  niche: string | null;
  tone: string | null;
  logo_url: string | null;
  mark_url: string | null;
  colors: Record<string, string> | null;
  description: string | null;
  source_url: string | null;
  instagram_handle: string | null;
  topics: string[] | null;
  content_source: string | null;
  audiences: unknown;
  positioning: string | null;
  strategy_notes: string | null;
  /** Slogan declarado — assina as artes e habilita o sub-nicho "Slogan em destaque". */
  slogan: string | null;
  /** Assinatura (logo + nome) em todas as artes desta marca. */
  signature_enabled: boolean | null;
  /** Respostas do questionário de marca (caminho de quem não tem manual). */
  brief_answers?: unknown;
  /** Insights de formatos: ideias de arte com o diálogo já pronto (uma por linha). */
  format_insights?: string | null;
  keyword_matrix?: unknown;
  reasoning_matrix?: unknown;
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
  /** Instantâneo da arte pronta; ausente nas artes salvas antes do editor. */
  snapshot: unknown;
};


type Tab = "criar" | "artes" | "calendario" | "ajustes";

/** Quantas linhas a marca já escreveu nos campos de lista do público/tema. */
const listFieldCount = (a: BrandAudience) =>
  (["pains", "desires", "proof", "scenes", "objections", "stakes", "triggers", "hooks"] as const).reduce(
    (n, f) => n + (a[f]?.length ?? 0),
    0,
  );

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

/** Campo de termos com digitação livre: vírgula e ponto e vírgula separam só ao sair. */
const splitHighlightTerms = (text: string): string[] => {
  const seen = new Set<string>();
  const terms: string[] = [];
  text
    .split(/[;,]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .forEach((term) => {
      const key = term.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      terms.push(term);
    });
  return terms;
};

const HighlightTermsField = ({
  id,
  value,
  placeholder,
  onCommit,
}: {
  id: string;
  value: string[];
  placeholder: string;
  onCommit: (terms: string[]) => void;
}) => {
  const joined = value.join(", ");
  const [text, setText] = useState(joined);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(joined);
  }, [joined, focused]);

  return (
    <Input
      id={id}
      placeholder={placeholder}
      value={text}
      onFocus={() => setFocused(true)}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false);
        const terms = splitHighlightTerms(text);
        setText(terms.join(", "));
        onCommit(terms);
      }}
    />
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
    <section className="min-w-0 max-w-full overflow-hidden rounded-3xl border border-border bg-card">
      <button
        type="button"
        className="flex w-full items-start gap-3 p-4 text-left sm:p-5"
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
      {open && <div className="min-w-0 max-w-full border-t border-border p-4 sm:p-5">{children}</div>}
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
  /** Arte da galeria aberta para edição (texto e formato). */
  const [editingArt, setEditingArt] = useState<Creation | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    niche: "",
    tone: "",
    logo_url: "",
    mark_url: "",
    description: "",
    source_url: "",
    instagram_handle: "",
    keywords: "",
    positioning: "",
    strategy_notes: "",
    format_insights: "",
    slogan: "",
    keyword_matrix: "",
    reasoning_matrix: "",
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
  /** Marca compartilhada usa o acervo do plano de quem criou a marca. */
  const photoLimit = useBrandPhotoLimit(brand, access.photoLimit, user?.id);

  useEffect(() => {
    if (!authLoading && !user) navigate(`${PRODUCT.base}/entrar`, { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    document.title = brand ? `${brand.name} — ${PRODUCT.name}` : `${PRODUCT.name}`;
  }, [brand]);

  const ART_FIELDS =
    "id, headline, caption, thumb, format, folder, created_at, is_favorite, png_path, composition, seed, segment, angle, block_kind, text_edits, snapshot";

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
        mark_url: brand.mark_url ?? "",
        description: brand.description ?? "",
        source_url: brand.source_url ?? "",
        instagram_handle: brand.instagram_handle ?? "",
        keywords: (brand.topics ?? []).join(", "),
        positioning: brand.positioning ?? "",
        strategy_notes: brand.strategy_notes ?? "",
        format_insights: brand.format_insights ?? "",
        slogan: brand.slogan ?? "",
        keyword_matrix: keywordMatrixToText(brand.keyword_matrix),
        reasoning_matrix: reasoningMatrixToText(brand.reasoning_matrix),
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
    // Pasta recém-criada (ainda vazia) continua visível para receber artes.
    if (folder !== "Todas") set.add(folder);
    const [first, ...rest] = Array.from(set);
    return [first, ...rest.sort((a, b) => a.localeCompare(b, "pt-BR"))];
  }, [creations, folder]);

  const folderCount = (f: string) =>
    f === "Todas" ? creations.length : creations.filter((c) => (c.folder || "Geral") === f).length;

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
        mark_url: form.mark_url.trim() || null,
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
        format_insights: form.format_insights.trim() || null,
        slogan: form.slogan.trim() || null,
        audiences: writeAudiences(audiences),
        signature_enabled: signatureEnabled,
        brief_answers: briefAnswers,
        keyword_matrix: keywordMatrixFromText(form.keyword_matrix),
        reasoning_matrix: reasoningMatrixFromText(form.reasoning_matrix),
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
      const briefFilled = Number((data as { brief_filled?: number })?.brief_filled ?? 0);
      toast.success(
        doc
          ? briefFilled > 0
            ? `Manual interpretado: kit, cores, tipografia e ${briefFilled} respostas do questionário preenchidas. Revise abaixo.`
            : "Manual interpretado: kit, cores e tipografia preenchidos. Revise abaixo."
          : briefFilled > 0
            ? `Marca interpretada e ${briefFilled} respostas do questionário preenchidas. Revise abaixo.`
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
   * Separação de leitura: públicos (sem grupo editorial) e temas (com grupo).
   * Os índices continuam apontando para o array completo.
   */
  const audienceItems = audiences
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !(a.editorialGroup ?? "").trim());
  const editorialItems = audiences
    .map((a, i) => ({ a, i }))
    .filter(({ a }) => !!(a.editorialGroup ?? "").trim());

  const addEditorialTheme = () =>
    setAudiences((prev) => [
      ...prev,
      {
        id: `tema-${prev.length + 1}`,
        label: "",
        editorialGroup:
          prev.find((p) => p.editorialGroup?.trim())?.editorialGroup?.trim() || "Temas",
      },
    ]);

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

  /**
   * Descobre todos os PNGs de uma criação. Carrossel é salvo como
   * `...-01.png`, `...-02.png` na mesma pasta: listamos a pasta e devolvemos a
   * sequência inteira para baixar slide por slide, como arte individual.
   */
  const slidePathsOf = async (art: Creation): Promise<string[]> => {
    const path = art.png_path as string;
    const match = path.match(/^(.*)-(\d{2})\.png$/);
    if (!match) return [path];
    const folder = path.slice(0, path.lastIndexOf("/"));
    const prefix = `${match[1].split("/").pop()}-`;
    const { data, error } = await supabase.storage.from("studio-art").list(folder, { limit: 200 });
    if (error || !data) return [path];
    const names = data
      .map((f) => f.name)
      .filter((n) => n.startsWith(prefix) && /-\d{2}\.png$/.test(n))
      .sort();
    return names.length > 1 ? names.map((n) => `${folder}/${n}`) : [path];
  };

  /**
   * Baixa o PNG guardado no momento em que a arte foi salva usando exatamente o
   * mesmo caminho de entrega da página de criação: no celular abre o pop-up de
   * compartilhar (Salvar imagem / Instagram); no desktop baixa o arquivo.
   */

  const downloadArt = async (art: Creation) => {
    if (!art.png_path) {
      toast.error("Esta arte foi salva antes do PNG guardado. Gere e salve novamente.");
      return;
    }
    try {
      const paths = await slidePathsOf(art);
      const files: File[] = [];
      for (const path of paths) {
        const { data, error } = await supabase.storage.from("studio-art").download(path);
        if (error || !data) continue;
        files.push(new File([data], path.split("/").pop() ?? "arte.png", { type: "image/png" }));
      }
      if (!files.length) {
        toast.error("Não foi possível baixar o PNG.");
        return;
      }
      const shared = files.length > 1 ? await deliverMany(files) : await deliver(files[0], files[0].name, "image/png");
      const many = files.length > 1 ? ` (${files.length} slides)` : "";
      toast.success(shared ? `Arte pronta para compartilhar${many}` : `Arte exportada em PNG${many}`);
    } catch (err) {
      console.error("[studio-pro] deliver png", err);
      toast.error("Não foi possível baixar o PNG.");
    }
  };


  const downloadCaption = async (art: Creation) => {
    if (!art.caption) {
      toast.error("Esta arte não tem legenda salva.");
      return;
    }
    const blob = new Blob([art.caption], { type: "text/plain;charset=utf-8" });
    const name = `${(art.headline ?? "legenda").slice(0, 40).replace(/\s+/g, "-").toLowerCase()}.txt`;
    try {
      const shared = await deliver(blob, name, "text/plain");
      toast.success(shared ? "Legenda pronta para compartilhar" : "Legenda baixada em .txt");
    } catch {
      toast.error("Não foi possível baixar a legenda.");
    }
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
    const name = window.prompt("Nome da nova pasta (ex.: um tema)");
    if (!name?.trim()) return;
    setFolder(name.trim());
    toast.info("Pasta criada. Mova artes para ela pelo menu de cada arte.");
  };

  /** Nome do tema/público que originou a arte (segmento salvo). */
  const themeOf = (art: { segment: string | null }) => {
    const raw = art.segment ?? "";
    const ids = raw.split(/[,|+]/).map((s) => s.trim()).filter(Boolean);
    const labels = ids.map((id) => audiences.find((a) => a.id === id)?.label).filter(Boolean) as string[];
    return labels.length === 1 ? labels[0] : null;
  };

  /** Move artes que estão em "Geral" para pastas com o nome do tema de cada uma. */
  const organizeByTheme = async () => {
    const targets = creations
      .filter((c) => (c.folder || "Geral") === "Geral")
      .map((c) => ({ id: c.id, theme: themeOf(c) }))
      .filter((t): t is { id: string; theme: string } => !!t.theme);
    if (targets.length === 0) {
      toast.info("Nenhuma arte em Geral com tema identificado.");
      return;
    }
    const byTheme = new Map<string, string[]>();
    targets.forEach((t) => byTheme.set(t.theme, [...(byTheme.get(t.theme) ?? []), t.id]));
    for (const [theme, ids] of byTheme) {
      const { error } = await supabase.from("studio_creations").update({ folder: theme }).in("id", ids);
      if (error) {
        toast.error("Não foi possível organizar todas as artes.");
        return;
      }
    }
    setCreations((prev) =>
      prev.map((c) => {
        const t = targets.find((x) => x.id === c.id);
        return t ? { ...c, folder: t.theme } : c;
      }),
    );
    toast.success(`${targets.length} artes organizadas em ${byTheme.size} pastas por tema.`);
  };

  const renameFolder = async (from: string) => {
    const name = window.prompt("Novo nome da pasta", from)?.trim();
    if (!name || name === from) return;
    const ids = creations.filter((c) => (c.folder || "Geral") === from).map((c) => c.id);
    if (ids.length) {
      const { error } = await supabase.from("studio_creations").update({ folder: name }).in("id", ids);
      if (error) return void toast.error("Não foi possível renomear.");
    }
    setCreations((prev) => prev.map((c) => ((c.folder || "Geral") === from ? { ...c, folder: name } : c)));
    setFolder(name);
  };

  const deleteFolder = async (name: string) => {
    if (!window.confirm(`Excluir a pasta "${name}"? As artes voltam para Geral (nada é apagado).`)) return;
    const ids = creations.filter((c) => c.folder === name).map((c) => c.id);
    if (ids.length) {
      const { error } = await supabase.from("studio_creations").update({ folder: "Geral" }).in("id", ids);
      if (error) return void toast.error("Não foi possível excluir a pasta.");
    }
    setCreations((prev) => prev.map((c) => (c.folder === name ? { ...c, folder: "Geral" } : c)));
    setFolder("Todas");
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

  /**
   * Marca recém-criada, sem nada preenchido: só ela abre a etapa 1 ao entrar.
   * Marcas com qualquer conteúdo abrem com todas as etapas minimizadas.
   */
  const nothingFilled =
    !brand.logo_url &&
    !brand.description &&
    !brand.positioning &&
    !brand.slogan &&
    !brand.format_insights &&
    !brand.keyword_matrix &&
    !brand.reasoning_matrix &&
    !(brand.topics ?? []).length &&
    readAudiences(brand.audiences).length === 0 &&
    answeredCount(readBriefAnswers(brand.brief_answers)) === 0;

  return (
    <main className="min-h-screen overflow-x-hidden bg-background px-5 py-8">
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
          <span>{tab === "criar" ? "Criar" : tab === "artes" ? "Artes" : tab === "calendario" ? "Calendário" : "Ajustes"}</span>
        </div>

        {/* Abas */}
        <div className="mt-4 flex flex-wrap gap-2">
          {([
            { id: "criar" as Tab, label: "Criar", icon: Sparkles },
            { id: "artes" as Tab, label: "Artes", icon: Images },
            { id: "calendario" as Tab, label: "Calendário", icon: CalendarDays },
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

        {/* Marca autoral: o Studio diagrama os textos do autor, não escreve. */}
        {tab === "criar" && brand.content_source === "authorial" && (
          <StudioBoundary context={`autoral:${brand.id}`}>
          <StudioProAuthorial
            brand={brand}
            folder={folder}
            watermark={access.watermark}
            unlimited={access.unlimited}
            photoLimit={photoLimit}
            onSaved={() => void loadCreations()}
            onOpenBrandSettings={() => setTab("ajustes")}
          />
          </StudioBoundary>
        )}

        {tab === "criar" && brand.content_source !== "authorial" && (
          <StudioBoundary context={`criar:${brand.id}`}>
          <StudioProCreate
            brand={brand}
            folder={folder}
            watermark={access.watermark}
            inspirations={inspirations}
            // VIP recebe a página inteira; planos e acessos concedidos recebem
            // lotes de 6 artes por geração, para render a cota em variedade.
            unlimited={access.unlimited}
            photoLimit={photoLimit}
            // Só a lista de artes é recarregada: a versão em tela não muda.
            onSaved={() => void loadCreations()}
            // O editor do card manda para cá quando falta público, CTA ou kit.
            onOpenBrandSettings={() => setTab("ajustes")}
          />
          </StudioBoundary>
        )}


        {tab === "calendario" && (
          <StudioFeedCalendar
            brandId={brand.id}
            creations={creations}
            previews={previews}
            onDownload={(art) => {
              const full = creations.find((c) => c.id === art.id);
              if (full) void downloadArt(full);
            }}
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
                    {f} <span className="ml-1 text-muted-foreground">{folderCount(f)}</span>
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => void organizeByTheme()}>
                  Organizar por tema
                </Button>
                <Button size="sm" variant="outline" className="rounded-full" onClick={newFolder}>
                  <FolderPlus className="mr-1.5 h-4 w-4" />
                  Nova pasta
                </Button>
              </div>
            </div>
            {folder !== "Todas" && folder !== "Geral" && (
              <div className="mt-2 flex gap-1.5">
                <Button size="sm" variant="ghost" className="h-7 rounded-full text-[11px]" onClick={() => void renameFolder(folder)}>
                  Renomear pasta
                </Button>
                <Button size="sm" variant="ghost" className="h-7 rounded-full text-[11px]" onClick={() => void deleteFolder(folder)}>
                  Excluir pasta
                </Button>
              </div>
            )}

            {shown.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhuma arte nesta pasta ainda. As artes geradas para <strong>{brand.name}</strong> ficam
                aqui — separadas das outras marcas.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {shown.map((art) => {
                  /**
                   * Só edita quem tem instantâneo (arte pronta guardada). Artes
                   * anteriores ao editor só têm a receita, e reabrir por receita
                   * devolvia OUTRA arte — por isso a edição fica bloqueada nelas.
                   */
                  const editable = isArtSnapshot(art.snapshot);
                  return (
                  <li key={art.id} className="overflow-hidden rounded-2xl border border-border bg-muted/40">
                    {/* A própria miniatura abre o editor da arte salva (texto + formato). */}
                    <button
                      type="button"
                      className="relative block w-full text-left"
                      disabled={!editable}
                      onClick={() => setEditingArt(art)}
                      title={
                        editable
                          ? "Editar texto e formato desta arte"
                          : "Arte salva antes do editor: gere uma nova versão para poder editar"
                      }
                    >
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
                      {editable && (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-semibold shadow">
                          <PencilLine className="h-3 w-3" />
                          Editar
                        </span>
                      )}
                    </button>
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-semibold">{art.headline ?? "Sem título"}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {art.folder || "Geral"} · {art.format ?? "post"}
                        {art.is_favorite && " · referência"}
                      </p>
                      {/* Ação principal: reabrir a arte salva para reescrever texto e trocar o formato. */}
                      {editable ? (
                        <Button
                          size="sm"
                          className="mt-2 h-8 w-full rounded-full text-[11px]"
                          onClick={() => setEditingArt(art)}
                          title="Editar texto e formato desta arte"
                        >
                          <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                          Editar texto e formato
                        </Button>
                      ) : (
                        <p className="mt-2 rounded-full bg-muted px-3 py-1.5 text-center text-[10px] text-muted-foreground">
                          Salva antes do editor — gere uma nova versão para editar
                        </p>
                      )}

                      {/* PNG e legenda ficam guardados na arte salva. */}
                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full px-2 text-[11px]"
                          onClick={() => void downloadArt(art)}
                          title="Baixar PNG em alta"
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          PNG
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 rounded-full px-2 text-[11px]"
                          onClick={() => void downloadCaption(art)}
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
                  );
                })}
              </ul>
            )}
          </section>
        )}

        {/* Editor de arte salva: texto na própria arte + troca de formato. */}
        {editingArt && brand && (
          <StudioArtEditor
            brand={brand}
            art={editingArt}
            onClose={() => setEditingArt(null)}
            onSaved={() => void loadCreations()}
          />
        )}

        {tab === "ajustes" && (
          <div className="mt-5 space-y-4 pb-24">
            {(() => {
              /* Indicador global: o que já está preenchido e o quanto cada lacuna pesa nas artes. */
              const checks = [
                { label: "Logo e identidade", ok: !!form.logo_url, impact: "assinatura em todas as artes" },
                { label: "Posicionamento e tom", ok: !!form.positioning || !!form.tone, impact: "voz e promessa dos títulos" },
                { label: "Públicos", ok: audienceItems.length > 0, impact: "dores, ganchos e chamadas por público" },
                { label: "Linha editorial", ok: editorialItems.length > 0, impact: "artes focadas em um tema" },
                { label: "Matrizes", ok: !!form.keyword_matrix.trim() && !!form.reasoning_matrix.trim(), impact: "palavras de destaque e progressão do texto" },
                { label: "Insights de formato", ok: !!form.format_insights.trim(), impact: "frases reais da marca nas artes" },
              ];
              const done = checks.filter((c) => c.ok).length;
              const pct = Math.round((done / checks.length) * 100);
              const missing = checks.filter((c) => !c.ok);
              return (
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold text-foreground">Completude da marca</p>
                    <span className="text-xs font-semibold text-primary">{pct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  {missing.length === 0 ? (
                    <p className="mt-2 text-[11px] text-muted-foreground">Tudo preenchido: as artes usam o kit completo.</p>
                  ) : (
                    <ul className="mt-2 space-y-1">
                      {missing.map((c) => (
                        <li key={c.label} className="text-[11px] text-muted-foreground">
                          <span className="font-semibold text-foreground">{c.label}</span> · melhora {c.impact}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
            {/* ================= 1. COMECE POR AQUI ================= */}
            <BrandSection
              step={1}
              title="Comece por aqui"
              hint="O que você já tem em mãos: logo, manual da marca — ou o questionário guiado."
              defaultOpen={nothingFilled}
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
                  only={["logo", "mark", "doc"]}
                  logoUrl={form.logo_url}
                  onLogoChange={(logo_url) => setForm({ ...form, logo_url })}
                  markUrl={form.mark_url}
                  onMarkChange={(mark_url) => setForm({ ...form, mark_url })}
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
              filled={!!form.positioning || !!form.tone}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="edit-slogan">Slogan da marca</Label>
                  <Textarea
                    id="edit-slogan"
                    rows={3}
                    placeholder={'ex.: "Movimento é liberdade."\numa frase por linha'}
                    value={form.slogan}
                    onChange={(e) => setForm({ ...form, slogan: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Pode ter <strong>mais de um slogan</strong> — uma frase por linha (a primeira vira a
                    assinatura das artes). Libera o sub-nicho <strong>Slogan em destaque</strong> no editor.
                  </p>

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

                {/* Curadoria da biblioteca de ganchos (não vale no modo autoral). */}
                {brand.content_source !== "authorial" && (
                  <div className="sm:col-span-2">
                    <BrandHooksCard
                      brandName={brand.name}
                      ingredients={{
                        niche: form.niche || undefined,
                        audience: audiences[0]?.label,
                        pain: audiences[0]?.pains?.[0],
                        desire: audiences[0]?.desires?.[0],
                        offer: form.positioning || undefined,
                        belief: form.strategy_notes || form.positioning || undefined,
                        cta: audiences[0]?.cta,
                      }}
                    />
                  </div>
                )}

                {brand.content_source === "alivia" && (

                  <p className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground sm:col-span-2">
                    Esta marca usa o acervo editorial oficial do Aliv.iA. Na aba <strong>Criar</strong> você
                    escolhe o público (Paciente, Profissional, Clínica ou Estudante) e as artes saem com a
                    mensagem real de cada landing.
                  </p>
                )}

                {/* Marca autoral: o acervo de texto é o próprio conteúdo das artes. */}
                {brand.content_source === "authorial" && (
                  <div className="sm:col-span-2">
                    <BrandTextsCard brandId={brand.id} />
                  </div>
                )}
              </div>
            </BrandSection>

            {/* ================= 4. INSIGHTS DE FORMATOS ================= */}
            <BrandSection
              step={4}
              title="Insights de formatos"
              hint="Ideias de arte com o diálogo já escrito: abertura, falas do meio e fecho."
              filled={!!form.format_insights.trim()}
            >
              <div>
                <Label>Ideias prontas</Label>
                <FormatInsightsEditor value={form.format_insights} onChange={(format_insights) => setForm({ ...form, format_insights })} />
                <p className="mt-1 text-xs text-muted-foreground">
                  É o único campo em que você escreve o <strong>diálogo pronto</strong> da arte. Uma
                  ideia com desenvolvimento também vira lista, história e carrossel. O texto entra na
                  arte como você escreveu — nada é reescrito e não gasta crédito.
                </p>
              </div>
            </BrandSection>

            {/* ================= 5. MATRIZES ================= */}
            <BrandSection
              step={5}
              title="Matrizes de conteúdo"
              hint="Conecta linguagem técnica, percepção do público e raciocínios completos para as artes."
              defaultOpen={false}
              filled={!!form.keyword_matrix.trim() && !!form.reasoning_matrix.trim()}
            >
              <div className="grid gap-4">
                <div>
                  <Label>Matriz de palavras</Label>
                  <KeywordMatrixEditor value={form.keyword_matrix} onChange={(keyword_matrix) => setForm({ ...form, keyword_matrix })} />
                  <p className="mt-1 text-xs text-muted-foreground">Cada relação permanece agrupada em um item próprio.</p>
                </div>
                <div>
                  <Label>Matriz de raciocínio</Label>
                  <ReasoningMatrixEditor value={form.reasoning_matrix} onChange={(reasoning_matrix) => setForm({ ...form, reasoning_matrix })} />
                  <p className="mt-1 text-xs text-muted-foreground">Cada item é uma sequência completa, usada sem misturar temas ou públicos.</p>
                </div>
              </div>
            </BrandSection>

            {/* ================= 6. PÚBLICOS ================= */}
            <BrandSection
              step={6}
              title="Públicos"
              hint="Cada público vira uma aba na criação, com dores, desejos, chamada e CTA próprios."
              filled={audienceItems.length > 0}
            >
              <div className="space-y-3">
                {audienceItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum público ainda. Adicione quem vai ler as artes — ou trabalhe por temas na etapa 7
                    (serviços, diferenciais, produtos).
                  </p>
                )}
                {audienceItems.map(({ a, i }) => (
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
                        className="h-9 rounded-md border border-input bg-background px-2 text-base text-foreground md:text-xs"
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
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        O motor alterna entre a chamada principal e as outras para não repetir abertura.
                      </p>
                    </div>
                    <details className="mt-2 rounded-lg border border-border bg-background">
                      <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-muted-foreground">
                        Campos do raciocínio
                        {listFieldCount(a) > 0
                          ? ` · ${listFieldCount(a)} linha${listFieldCount(a) === 1 ? "" : "s"} preenchida${listFieldCount(a) === 1 ? "" : "s"}`
                          : " (dores, desejos, cenas, objeções…)"}
                      </summary>
                      <div className="grid gap-2 p-3 sm:grid-cols-3">
                        {([
                          ["pains", "Dores (uma por linha)"],
                          ["desires", "Desejos (uma por linha)"],
                          ["proof", "Soluções que ofereço (uma por linha)"],
                          ["scenes", "Cenas do dia a dia (uma por linha)"],
                          ["objections", "Objeções dele (uma por linha)"],
                          ["stakes", "Se não fizer nada… (uma por linha)"],
                          ["triggers", "Momento em que procura ajuda (uma por linha)"],
                          ["hooks", "Outras chamadas (uma por linha)"],
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
                    </details>
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

            {/* ================= 7. LINHA EDITORIAL ================= */}
            <BrandSection
              step={7}
              title="Linha editorial (temas)"
              hint="Serviços, diferenciais ou produtos: cada arte fala de um só tema — o que é, como funciona, o ganho e o custo de não ter."
              filled={editorialItems.length > 0}
            >
              <div className="space-y-3">
                <p className="rounded-2xl border border-primary/25 bg-primary/5 p-3 text-xs text-muted-foreground">
                  Temas não entram na contagem de públicos. Na aba <strong>Criar</strong> eles aparecem em um grupo
                  próprio, com seleção múltipla: cada arte do lote recebe um tema e fala só dele.
                </p>
                {editorialItems.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum tema ainda. Adicione o que a marca oferece e quer explicar em artes fechadas — um tema
                    por item.
                  </p>
                )}
                {editorialItems.map(({ a, i }) => (
                  <div key={`${a.id}-${i}`} className="rounded-xl border border-primary/25 p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        aria-label={`Nome do tema ${i + 1}`}
                        placeholder="Nome do tema (ex.: Reavaliação expressa)"
                        value={a.label}
                        onChange={(e) => updateAudience(i, { label: e.target.value })}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remover tema"
                        onClick={() => removeAudience(i)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <div>
                        <Label htmlFor={`edit-group-${a.id}`} className="text-[11px]">
                          Grupo (linha editorial)
                        </Label>
                        <Input
                          id={`edit-group-${a.id}`}
                          placeholder="Ex.: Diferenciais, Serviços da clínica, Tratamentos"
                          value={a.editorialGroup ?? ""}
                          onChange={(e) => updateAudience(i, { editorialGroup: e.target.value })}
                        />
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Itens com o mesmo nome de grupo aparecem juntos na criação.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor={`edit-keyword-${a.id}`} className="text-[11px]">
                          Palavra-chave
                        </Label>
                        <Input
                          id={`edit-keyword-${a.id}`}
                          placeholder="Ex.: Reavaliação, HEP, sRPE"
                          value={a.keyword ?? ""}
                          onChange={(e) => updateAudience(i, { keyword: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="mt-2">
                      <Label htmlFor={`edit-highlight-${a.id}`} className="text-[11px]">
                        Termos de destaque (vírgula ou ponto e vírgula)
                      </Label>
                      <HighlightTermsField
                        id={`edit-highlight-${a.id}`}
                        placeholder={`Ex.: ${suggestHighlightTerms(a).join(", ")}`}
                        value={a.highlightTerms ?? []}
                        onCommit={(highlightTerms) => updateAudience(i, { highlightTerms })}
                      />
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Só estes termos podem virar a palavra gigante da arte. Em branco, o motor usa o nome do
                        tema: {suggestHighlightTerms(a).join(" · ")}.
                      </p>
                    </div>
                    <Textarea
                      className="mt-2"
                      rows={2}
                      placeholder="O que é — explicado em uma frase"
                      value={a.description ?? ""}
                      onChange={(e) => updateAudience(i, { description: e.target.value })}
                    />
                    <div className="mt-2">
                      <Label htmlFor={`edit-cta-${a.id}`} className="text-[11px]">
                        Objetivo / CTA
                      </Label>
                      <Input
                        id={`edit-cta-${a.id}`}
                        placeholder="Ex.: Conhecer o diferencial, Agendar avaliação"
                        value={a.cta ?? ""}
                        onChange={(e) => updateAudience(i, { cta: e.target.value })}
                      />
                    </div>
                    <details className="mt-2 rounded-lg border border-border bg-background">
                      <summary className="cursor-pointer select-none px-3 py-2 text-[11px] font-medium text-muted-foreground">
                        Roteiro do tema
                        {listFieldCount(a) > 0
                          ? ` · ${listFieldCount(a)} linha${listFieldCount(a) === 1 ? "" : "s"} preenchida${listFieldCount(a) === 1 ? "" : "s"}`
                          : " (como funciona, ganho, cena, custo…)"}
                      </summary>
                      <div className="grid gap-2 p-3 sm:grid-cols-3">
                        {([
                          ["proof", "Como funciona / o que entrega (uma por linha)"],
                          ["desires", "Ganho na rotina (uma por linha)"],
                          ["scenes", "Cenas do dia a dia (uma por linha)"],
                          ["pains", "Dores que o tema resolve (uma por linha)"],
                          ["objections", "Objeções (uma por linha)"],
                          ["stakes", "Custo de não ter (uma por linha)"],
                          ["hooks", "Outras chamadas (uma por linha)"],
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
                    </details>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="rounded-full" onClick={addEditorialTheme}>
                  <FolderPlus className="mr-1.5 h-4 w-4" />
                  Adicionar tema
                </Button>
              </div>
            </BrandSection>

            {/* ================= 7. ACESSOS ================= */}
            {isOwnBrand(brand, user?.id) && (
              <BrandSection
                step={8}
                title="Pessoas com acesso"
                hint="Compartilhe esta marca com outra conta Aliv.iA: ela cria, edita e baixa as artes daqui."
                defaultOpen={false}
                filled={false}
              >
                <BrandMembersCard brandId={brand.id} />
              </BrandSection>
            )}

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
