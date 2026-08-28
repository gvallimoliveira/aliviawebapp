import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileText, Images, LayoutGrid, Loader2, RefreshCw, Save, Sparkles, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  STUDIO_BLOCKS,
  StudioMotion,
  buildCaption,
  buildCoverage,
  composePage,
  createPicker,
  createRng,
  deliver,
  exportNodeAsPng,
  exportTextFile,
  personaForSeed,
  randomSeed,
  renderNodeToBlob,
  type ComposedBlock,
  type StudioFormat,
} from "@/studio-core";
import { useStudioPhotos } from "@/pages/studio/useStudioPhotos";
import { applyStudioBrandTheme } from "@/pages/studio/brand";
import { WORLDS, WORLD_IDS, isWorldId, type WorldId } from "@/pages/studio/content";
import { buildSegmentContent, brandSlogan } from "./brandContent";
import { readColorKit } from "./brandColors";
import { ensureFontLoaded, findFont } from "./brandFonts";
import { ANGLES, GLOBAL_SEGMENT, buildSegments, readAudiences, type ContentAngle } from "./audiences";
import { STUDIO_BATCH_SIZE, useStudioQuota } from "./useStudioQuota";
import { STUDIO_MODELS, kindsForModels } from "@/pages/studio/models";
import StudioProSignature from "./StudioProSignature";


/**
 * EDITOR "CRIAR" DO STUDIO PÚBLICO
 *
 * Usa o mesmo motor criativo do Studio interno, mas com dois trocas:
 * 1. o acervo de copy é gerado do kit da marca do cliente (`buildBrandContent`);
 * 2. o lockup (nome, slogan, logo) e a cor primária vêm da marca ativa.
 *
 * Cada arte pode ser baixada em PNG e salva na pasta da marca — nunca sai do
 * escopo da marca ativa (`brand_id`).
 */

type BrandInput = {
  id: string;
  name: string;
  niche: string | null;
  tone: string | null;
  logo_url: string | null;
  colors: Record<string, string> | null;
  description?: string | null;
  topics?: string[] | null;
  content_source?: string | null;
  /** Perfil social e site — aparecem nas artes de mockup/palco. */
  instagram_handle?: string | null;
  source_url?: string | null;
  /** Nichos da marca (jsonb) — cada um vira uma aba de segmento. */
  audiences?: unknown;
  /** Leitura global do produto, base do conteúdo 360°. */
  positioning?: string | null;
  /** Ajuste global: assinar todas as artes com logo/nome da marca. */
  signature_enabled?: boolean | null;
};

type Props = {
  brand: BrandInput;
  /** Pasta de destino ao salvar (a pasta selecionada na aba Artes). */
  folder: string;
  /** Downloads saem com assinatura discreta do plano gratuito. */
  watermark: boolean;
  /**
   * Receitas das artes que o usuário favoritou nesta marca. Servem de linhagem:
   * parte das novas versões herda a estrutura aprovada, o resto nasce livre
   * para continuar inovando.
   */
  inspirations?: ComposedBlock[][];
  /** Acesso sem cota (VIP): "Nova versão" nunca debita nada. */
  unlimited?: boolean;
  onSaved?: () => void;
};


const FRAME_STYLE: Record<StudioFormat, React.CSSProperties> = {
  "9x16": { width: "min(400px, 100%)", aspectRatio: "9/16" },
  "1x1": { width: "min(560px, 100%)", aspectRatio: "1/1" },
  free: { width: "100%" },
};

const FORMATS: { id: StudioFormat; label: string }[] = [
  { id: "9x16", label: "Story 9:16" },
  { id: "1x1", label: "Post 1:1" },
  { id: "free", label: "Livre" },
];


/** #RRGGBB → "H S% L%" para alimentar os tokens HSL do tema. */
const hexToHslTriplet = (hex: string): string | null => {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

/**
 * PERSISTÊNCIA DO EDITOR (por marca).
 *
 * Trocar de aba do navegador / voltar para o site remonta o componente. Antes
 * isso sorteava uma nova `seed` e as artes mudavam sozinhas. Agora seed,
 * formato, público e ângulo ficam em sessionStorage por marca: as artes só
 * mudam quando o usuário mexe num seletor ou clica em "Nova versão".
 */
const stateKey = (brandId: string) => `studio-pro:create:${brandId}`;

type PersistedCreateState = {
  seed?: string;
  format?: StudioFormat;
  segment?: string;
  angle?: ContentAngle;
  /** Modelos escolhidos; vazio = aleatório. */
  models?: string[];
};

const readPersisted = (brandId: string): PersistedCreateState => {
  try {
    const raw = sessionStorage.getItem(stateKey(brandId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedCreateState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writePersisted = (brandId: string, patch: PersistedCreateState) => {
  try {
    const next = { ...readPersisted(brandId), ...patch };
    sessionStorage.setItem(stateKey(brandId), JSON.stringify(next));
  } catch {
    /* quota / modo privado — ignora */
  }
};

const StudioProCreate = ({
  brand,
  folder,
  watermark,
  inspirations = [],
  unlimited: unlimitedAccess = false,
  onSaved,
}: Props) => {
  const restored = useRef<PersistedCreateState>(readPersisted(brand.id));
  /** Assinatura da marca nas artes: ajuste global da marca (ligado por padrão). */
  const signatureOn = brand.signature_enabled !== false;
  const [format, setFormat] = useState<StudioFormat>(restored.current.format ?? "1x1");
  const [seed, setSeed] = useState(() => restored.current.seed ?? randomSeed());
  const [busy, setBusy] = useState<string | null>(null);
  const wrapper = useRef<HTMLDivElement>(null);
  /** Acervo privado de fotos da conta — habilita os blocos fotográficos. */
  const { photos } = useStudioPhotos(true);
  /** Cota do período: contada em gerações — 1 por clique em "Nova versão". */
  const { quota, error: quotaError, consume } = useStudioQuota();

  const unlimited = unlimitedAccess || !!quota?.unlimited;
  /** Só bloqueia com dado confirmado: cota desconhecida nunca trava o botão. */
  const blocked = !unlimited && !!quota && !quotaError && quota.remaining < STUDIO_GENERATION_COST;

  /**
   * "Nova versão" é o único clique que custa cota (1 geração). Trocar público,
   * objetivo, modelo ou formato navega a MESMA geração de graça — é ali que a
   * versão rende dezenas de artes. O desconto acontece no banco antes da nova
   * seed; se a cota do período acabou, a geração é bloqueada com aviso claro.
   */
  const newVersion = async () => {
    if (unlimited) {
      setSeed(randomSeed());
      return;
    }
    setBusy("quota");
    const result = await consume(STUDIO_GENERATION_COST);
    setBusy(null);
    if (result === "exhausted") {
      toast.error("Suas gerações deste período acabaram. Faça upgrade para gerar mais.");
      return;
    }
    if (result === "error") {
      // Falha de leitura não é cota estourada: libera o lote e avisa sem falar de upgrade.
      toast.warning("Não conseguimos confirmar sua cota agora — gerando de qualquer forma.");
      setSeed(randomSeed());
      return;
    }

    setSeed(randomSeed());
  };


  useEffect(() => {
    writePersisted(brand.id, { seed, format });
  }, [brand.id, seed, format]);


  /**
   * Marcas com `content_source = "alivia"` têm acervo editorial próprio por
   * mundo (o mesmo do Studio interno). Qualquer outra marca usa o acervo neutro
   * gerado do kit — a segmentação em si é idêntica para todo cliente.
   */
  const isAlivia = brand.content_source === "alivia";

  const audiences = useMemo(() => readAudiences(brand.audiences), [brand.audiences]);
  const segments = useMemo(() => buildSegments(audiences), [audiences]);
  const [segment, setSegment] = useState<string>(restored.current.segment ?? GLOBAL_SEGMENT);
  const [angle, setAngle] = useState<ContentAngle>(restored.current.angle ?? "informar");
  /**
   * PREFERÊNCIA DE MODELOS.
   *
   * Vazio = "Aleatório" (padrão): o motor sorteia todo o repertório. Ao marcar
   * modelos, as artes da versão saem só desses tipos — trocar a seleção refina o
   * mesmo lote sem gastar cota.
   */
  const [models, setModels] = useState<string[]>(restored.current.models ?? []);
  const [modelsOpen, setModelsOpen] = useState(false);

  const toggleModel = (id: string) =>
    setModels((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  useEffect(() => {
    writePersisted(brand.id, { segment, angle, models });
  }, [brand.id, segment, angle, models]);

  // Se o público ativo deixa de existir (edição do kit), volta para o 360°.
  const activeSegment = segments.some((s) => s.id === segment) ? segment : GLOBAL_SEGMENT;

  const contentKit = useMemo(
    () => ({
      name: brand.name,
      niche: brand.niche,
      tone: brand.tone,
      description: brand.description,
      keywords: brand.topics,
    }),
    [brand.name, brand.niche, brand.tone, brand.description, brand.topics],
  );

  /**
   * Mundo Aliv.iA correspondente ao público ativo. Estruturalmente a marca tem
   * 4 nichos (paciente, pro, clínica, acadêmico); sub-nichos como o recém-formado
   * herdam o acervo do mundo de origem e recebem por cima as próprias dores,
   * desejos e provas. No 360° cada versão gira entre os mundos oficiais.
   */
  const SUB_NICHE_WORLD: Record<string, WorldId> = { "recem-formado": "academico" };
  const subWorld = SUB_NICHE_WORLD[activeSegment];
  const aliviaWorld: WorldId | null = !isAlivia
    ? null
    : activeSegment !== GLOBAL_SEGMENT && isWorldId(activeSegment)
      ? activeSegment
      : subWorld
        ? subWorld
        : WORLD_IDS[createRng(`${brand.id}:${seed}:world`).int(WORLD_IDS.length)];


  const content = useMemo(
    () =>
      buildSegmentContent({
        kit: contentKit,
        base: aliviaWorld ? WORLDS[aliviaWorld] : undefined,
        audiences,
        // Mundo oficial já embute o público; sub-nicho mantém o overlay próprio.
        segment: aliviaWorld && !subWorld ? GLOBAL_SEGMENT : activeSegment,
        angle,
        positioning: aliviaWorld ? null : brand.positioning,
      }),
    [contentKit, aliviaWorld, subWorld, audiences, activeSegment, angle, brand.positioning],
  );

  const persona = useMemo(() => personaForSeed(`${brand.id}:${seed}`), [brand.id, seed]);

  /** Lockup da marca do cliente aplicado antes da renderização das artes. */
  const themeReady = useMemo(() => {
    applyStudioBrandTheme({
      name: brand.name,
      // Tom de voz é diretriz, não copy: o slogan sai da descrição/nicho.
      slogan: brandSlogan({ name: brand.name, niche: brand.niche, description: brand.description }),
      logo: brand.logo_url,
      handle: brand.instagram_handle ?? null,
      site: brand.source_url ?? null,
    });
    return `${brand.id}:${brand.name}:${brand.logo_url ?? ""}`;
  }, [brand.id, brand.name, brand.niche, brand.description, brand.logo_url, brand.instagram_handle, brand.source_url]);


  const picker = useMemo(
    () => createPicker(buildCoverage(aliviaWorld ?? "pro", content, {}), () => {}),
    [content, aliviaWorld],
  );

  /**
   * LINHAGEM DOS FAVORITOS.
   *
   * Quando a marca já tem artes favoritadas, ~65% das versões herdam a receita
   * de uma delas (mesmas seções/tratamentos em boa parte das posições) e o
   * restante nasce do zero. Assim o repertório aprovado guia o Studio sem
   * congelar a criação de novidades.
   */
  const lineage = useMemo(() => {
    if (inspirations.length === 0) return { blocks: undefined as ComposedBlock[] | undefined, used: false };
    const rng = createRng(`${brand.id}:${seed}:lineage`);
    if (!rng.chance(0.65)) return { blocks: undefined, used: false };
    return { blocks: inspirations[rng.int(inspirations.length)], used: true };
  }, [inspirations, brand.id, seed]);

  /**
   * ENTREGA POR GERAÇÃO.
   *
   * VIP (acesso ilimitado) recebe a página inteira — variedade grande de uma vez
   * para filtrar. Assinantes e acessos concedidos recebem um lote curto
   * (`maxArts`, padrão 2): assim cada geração custa pouco da cota e o usuário
   * refina os seletores (público, ângulo, formato) entre os lotes, construindo
   * variedade temática dentro dos créditos.
   */
  const blocks = useMemo(() => {
    const page = composePage(
      createRng(`${brand.id}:${seed}:${activeSegment}:${angle}:layout`),
      persona,
      // Com modelos escolhidos, a linhagem de favoritos cede lugar à escolha.
      models.length > 0 ? undefined : lineage.blocks,
      content.carousels,
      photos.length,
      kindsForModels(models, photos.length, isAlivia),
      isAlivia,
    );
    if (!Number.isFinite(maxArts) || page.length <= maxArts) return page;
    // Amostra determinística e variada: evita repetir o mesmo tipo no lote.
    const rng = createRng(`${brand.id}:${seed}:${activeSegment}:${angle}:batch`);
    const pool = [...page];
    const picked: ComposedBlock[] = [];
    const usedKinds = new Set<string>();
    while (picked.length < maxArts && pool.length > 0) {
      const idx = rng.int(pool.length);
      const [candidate] = pool.splice(idx, 1);
      if (usedKinds.has(candidate.kind) && pool.some((b) => !usedKinds.has(b.kind))) continue;
      usedKinds.add(candidate.kind);
      picked.push(candidate);
    }
    return picked;
  }, [brand.id, seed, activeSegment, angle, persona, content, lineage, photos.length, maxArts, models, isAlivia]);




  useEffect(() => {
    // Reaplica o tema quando a marca muda de aba/rota.
    void themeReady;
  }, [themeReady]);

  /** Kit da marca aplicado como tokens: 2 principais + 2 secundárias opcionais. */
  const kit = readColorKit(brand.colors);
  const themeStyle = (() => {
    const style: Record<string, string> = {};
    const primary = hexToHslTriplet(kit.primary);
    const primary2 = hexToHslTriplet(kit.primary2);
    if (primary) {
      style["--primary"] = primary;
      style["--ring"] = primary;
    }
    if (primary2) style["--background"] = primary2;
    if (kit.useSecondary) {
      const secondary = hexToHslTriplet(kit.secondary);
      const secondary2 = hexToHslTriplet(kit.secondary2);
      if (secondary) style["--accent"] = secondary;
      if (secondary2) style["--secondary"] = secondary2;
    }
    // Tipografia da marca: herdada por todos os blocos da versão.
    const brandFont = findFont(kit.font);
    if (brandFont.stack) style.fontFamily = brandFont.stack;
    return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
  })();

  /** Garante a fonte da marca carregada antes de renderizar/exportar as artes. */
  useEffect(() => {
    ensureFontLoaded(kit.font);
  }, [kit.font]);


  const headlineOf = (index: number) =>
    (document.getElementById(`studio-pro-block-${index}`)?.querySelector("h1, h2, h3")?.textContent ?? "")
      .trim()
      .slice(0, 140);

  const download = async (index: number, kind: string) => {
    const node = document.getElementById(`studio-pro-block-${index}`);
    if (!node) return;
    setBusy(`png-${index}`);
    try {
      await exportNodeAsPng(
        node as HTMLElement,
        `${brand.name.replace(/\s+/g, "-").toLowerCase()}-${seed}-${String(index + 1).padStart(2, "0")}-${kind}.png`,
      );
      toast.success("Arte exportada em alta resolução");
    } catch (error) {
      console.error("[studio-pro] export", error);
      toast.error("Não foi possível exportar esta arte.");
    } finally {
      setBusy(null);
    }
  };

  const save = async (index: number, kind: string, caption: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Faça login novamente para salvar.");
      return;
    }
    setBusy(`save-${index}`);
    const node = document.getElementById(`studio-pro-block-${index}`) as HTMLElement | null;
    let thumb: string | null = null;
    let pngPath: string | null = null;
    if (node) {
      const rect = node.getBoundingClientRect();
      // Miniatura da galeria em retina: 900px de largura, qualidade alta.
      try {
        const thumbRatio = Math.max(1, Math.min(3, 900 / (rect.width || 900)));
        const blob = await renderNodeToBlob(node, thumbRatio, "image/jpeg", 0.9);
        thumb = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      } catch (error) {
        console.warn("[studio-pro] thumb", error);
      }
      // PNG de publicação guardado na conta: 1440px de largura (nitidez de feed/story).
      try {
        const ratio = Math.max(1, Math.min(4, 1440 / (rect.width || 1440)));
        const png = await renderNodeToBlob(node, ratio, "image/png");
        const path = `${auth.user.id}/${brand.id}/${seed}-${String(index + 1).padStart(2, "0")}-${kind}.png`;
        const { error: upErr } = await supabase.storage
          .from("studio-art")
          .upload(path, png, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;
        pngPath = path;
      } catch (error) {
        console.warn("[studio-pro] png upload", error);
      }
    }
    const { error } = await supabase.from("studio_creations").insert({
      user_id: auth.user.id,
      brand_id: brand.id,
      seed: `${seed}:${index}`,
      block_kind: kind,
      format,
      headline: headlineOf(index) || null,
      caption,
      thumb,
      png_path: pngPath,
      // Receita da arte: permite reusar a composição aprovada nas próximas versões.
      composition: JSON.parse(JSON.stringify(blocks)),

      segment: activeSegment,
      angle,
      folder: folder === "Todas" ? "Geral" : folder,
      watermarked: watermark,
    });
    setBusy(null);
    if (error) {
      console.error("[studio-pro] save creation", error);
      toast.error("Não foi possível salvar na marca.");
      return;
    }
    toast.success(
      pngPath
        ? `Arte salva em ${folder === "Todas" ? "Geral" : folder} com PNG e legenda`
        : `Arte salva em ${folder === "Todas" ? "Geral" : folder} (PNG não pôde ser guardado)`,
    );
    onSaved?.();
  };

  const copyCaption = async (caption: string) => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Legenda copiada");
    } catch {
      toast.error("Não foi possível copiar a legenda.");
    }
  };

  /** Baixa todas as artes desta versão, uma a uma. */
  const downloadAll = async () => {
    setBusy("all-png");
    try {
      for (let i = 0; i < blocks.length; i += 1) {
        const node = document.getElementById(`studio-pro-block-${i}`) as HTMLElement | null;
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        const ratio = Math.max(1, Math.min(3, 1440 / (rect.width || 1440)));
        const blob = await renderNodeToBlob(node, ratio, "image/png");
        await deliver(
          blob,
          `${brand.name.replace(/\s+/g, "-").toLowerCase()}-${seed}-${String(i + 1).padStart(2, "0")}-${blocks[i].kind}.png`,
        );
      }
      toast.success("Todas as artes desta versão foram exportadas");
    } catch (error) {
      console.error("[studio-pro] export all", error);
      toast.error("Não foi possível exportar todas as artes.");
    } finally {
      setBusy(null);
    }
  };

  /** Baixa as legendas da versão inteira em um .txt. */
  const downloadCaptions = () => {
    const text = blocks
      .map(({ kind }, i) => {
        const caption = buildCaption(content, kind, createRng(`${brand.id}:${seed}:caption:${kind}:${i}`));
        return `# ${String(i + 1).padStart(2, "0")} · ${kind}\n${caption}`;
      })
      .join("\n\n---\n\n");
    void exportTextFile(text, `${brand.name.replace(/\s+/g, "-").toLowerCase()}-${seed}-legendas.txt`);
  };


  return (
    <section className="mt-5 rounded-3xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Criar artes de {brand.name}</h2>
          <p className="text-xs text-muted-foreground">
            Versão <span className="font-mono">{seed}</span> · direção criativa {persona.name} · destino:{" "}
            {folder === "Todas" ? "Geral" : folder}
            {!unlimited && ` · lote de ${batchSize} artes por geração`}
          </p>
          {!unlimited && quotaError && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              Não conseguimos ler sua cota agora — a geração segue liberada e o desconto é feito no servidor.
            </p>
          )}
          {!unlimited && quota && !quotaError && (
            <p className="mt-1 text-xs font-semibold text-foreground">
              {quota.generationsLeft > 0
                ? `${quota.generationsLeft} ${quota.generationsLeft === 1 ? "geração" : "gerações"} restantes neste período · ${quota.remaining} de ${quota.allowance} artes`
                : "Cota do período encerrada — faça upgrade para continuar gerando."}
            </p>
          )}

          {/* Nichos da marca + visão 360° que interpola todos eles. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {segments.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={activeSegment === s.id ? "secondary" : "ghost"}
                className="h-7 rounded-full text-[11px]"
                onClick={() => setSegment(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          {/* Ângulo estratégico: informar, dor, desejo ou venda. */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {ANGLES.map((a) => (
              <Button
                key={a.id}
                size="sm"
                variant={angle === a.id ? "outline" : "ghost"}
                className="h-7 rounded-full text-[11px]"
                title={a.hint}
                onClick={() => setAngle(a.id)}
              >
                {a.label}
              </Button>
            ))}
          </div>
          {/* Modelos de arte: aleatório por padrão, ou seleção manual de tipos. */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => setModelsOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground underline-offset-2 hover:underline"
            >
              <LayoutGrid className="h-3 w-3" />
              Modelos: {models.length === 0 ? "Aleatório" : `${models.length} selecionado${models.length > 1 ? "s" : ""}`}
            </button>
            {modelsOpen && (
              <div className="mt-2 rounded-2xl border border-border bg-muted/30 p-2.5">
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={models.length === 0 ? "secondary" : "ghost"}
                    className="h-7 rounded-full text-[11px]"
                    onClick={() => setModels([])}
                  >
                    Aleatório
                  </Button>
                  {STUDIO_MODELS.map((m) => {
                    const disabled =
                      (!!m.needsPhoto && photos.length === 0) || (!!m.needsBrand && !isAlivia);
                    if (m.needsBrand && !isAlivia) return null;
                    return (
                      <Button
                        key={m.id}
                        size="sm"
                        variant={models.includes(m.id) ? "secondary" : "ghost"}
                        className="h-7 rounded-full text-[11px]"
                        title={disabled ? "Envie fotos ao acervo para usar este modelo" : m.hint}
                        disabled={disabled}
                        onClick={() => toggleModel(m.id)}
                      >
                        {m.label}
                      </Button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Trocar modelos não consome cota — só "Nova versão" gera um lote novo.
                </p>
              </div>
            )}
          </div>
          {segments.length === 1 && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Cadastre os públicos da marca em Ajustes para gerar conteúdo por nicho.
            </p>
          )}
          {/* Transparência da linhagem: o usuário vê quando a versão herdou favorito. */}
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            {inspirations.length === 0
              ? "Favorite artes na aba Artes para o Studio aprender seu estilo."
              : lineage.used
                ? `Esta versão herda a estrutura de um favorito (${inspirations.length} referências no acervo).`
                : `Versão livre — inovando fora do padrão dos ${inspirations.length} favoritos.`}
            {photos.length > 0 && ` · ${photos.length} fotos do acervo em uso`}
          </p>

        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {FORMATS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={format === f.id ? "secondary" : "ghost"}
              className="h-8 rounded-full text-xs"
              onClick={() => setFormat(f.id)}
            >
              {f.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="outline"
            className="h-8 rounded-full text-xs"
            disabled={busy === "all-png"}
            onClick={downloadAll}
          >
            {busy === "all-png" ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Images className="mr-1.5 h-3.5 w-3.5" />
            )}
            Todas em PNG
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={downloadCaptions}>
            <FileText className="mr-1.5 h-3.5 w-3.5" />
            Legendas (.txt)
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            disabled={busy === "quota" || blocked}
            onClick={() => void newVersion()}
          >
            {busy === "quota" ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Nova versão
          </Button>
        </div>

      </div>

      <div ref={wrapper} className="mt-5 flex flex-col items-center gap-6" style={themeStyle}>
        {blocks.map(({ kind, treatment, motion, slide }, i) => {
          const Block = STUDIO_BLOCKS[kind];
          const rng = createRng(`${brand.id}:${seed}:${kind}:${i}`);
          const caption = buildCaption(content, kind, createRng(`${brand.id}:${seed}:caption:${kind}:${i}`));
          return (
            <div key={`${kind}-${i}`} className="w-full">
              <div
                className={`mx-auto overflow-hidden rounded-2xl border border-border bg-background ${
                  format === "1x1" ? "studio-pro-square" : ""
                }`}
                style={FRAME_STYLE[format]}
              >
                <div id={`studio-pro-block-${i}`} className="h-full w-full">
                  <StudioProSignature
                    artKey={`${brand.id}:${seed}:${kind}:${i}`}
                    enabled={signatureOn}
                    brandName={brand.name}
                  >
                    <StudioMotion kind={motion}>
                      <Block
                        content={content}
                        rng={rng}
                        treatment={treatment}
                        format={format}
                        picker={picker}
                        persona={persona}
                        slide={slide}
                        photos={photos}
                      />
                    </StudioMotion>
                  </StudioProSignature>
                </div>
              </div>

              <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `png-${i}`}
                  onClick={() => download(i, kind)}
                >
                  {busy === `png-${i}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  PNG
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  onClick={() => copyCaption(caption)}
                >
                  <Type className="mr-1.5 h-3.5 w-3.5" />
                  Legenda
                </Button>
                <Button
                  size="sm"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `save-${i}`}
                  onClick={() => save(i, kind, caption)}
                >
                  {busy === `save-${i}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Salvar na marca
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default StudioProCreate;
