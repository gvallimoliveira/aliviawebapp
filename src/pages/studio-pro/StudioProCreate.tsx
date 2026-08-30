import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  Contrast,

  Download,
  FileText,
  Images,
  LayoutGrid,
  Lightbulb,
  Loader2,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Type,
} from "lucide-react";
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
  exportNodesAsPng,
  exportTextFile,
  personaForSeed,
  randomSeed,
  renderNodeToBlob,
  type ComposedBlock,
  type StudioFormat,
} from "@/studio-core";
import { useStudioPhotos } from "@/pages/studio/useStudioPhotos";
import { countPhotos } from "@/pages/studio/photos";
import StudioPhotos from "@/pages/studio/StudioPhotos";
import { applyStudioBrandTheme } from "@/pages/studio/brand";
import { voiceRegister } from "@/pages/studio/lexicon";
import { varyContent } from "@/pages/studio/vary";
import { usePhraseMemory } from "./usePhraseMemory";
import { WORLDS, WORLD_IDS, isWorldId, type WorldId } from "@/pages/studio/content";
import { buildSegmentContent, brandSlogan, relationForSegment } from "./brandContent";

import { readColorKit } from "./brandColors";
import { buildBrandThemeStyle } from "./brandTheme";

import { ensureFontLoaded } from "./brandFonts";

import {
  ANGLES,
  GLOBAL_SEGMENT,
  audienceAncestors,
  audienceHook,
  audienceKeyword,
  audiencesWithSlogan,
  buildSegments,
  readAudiences,
  resolveAudience,
  type ContentAngle,
} from "./audiences";
import { enforceRationale, explainArt, rationaleText, type RationaleContext } from "@/pages/studio/rationale";
import { hasBannedJargon } from "@/pages/studio/persuasion";
import {
  applyArtText,
  hasArtEdits,
  readArtText,
  setArtEditing,
  type ArtTextEdits,
} from "@/pages/studio/artTextEdit";
import { STUDIO_GENERATION_COST, useStudioQuota } from "./useStudioQuota";
import { captureArtSnapshot } from "./artSnapshot";
import { STUDIO_MODELS, kindsForModels } from "@/pages/studio/models";
import StudioProSignature from "./StudioProSignature";
import AutoFit from "@/pages/studio/AutoFit";
import ArtworkGuard from "@/pages/studio/ArtworkGuard";
import VariationControl from "@/pages/studio/VariationControl";
import {
  DEFAULT_VARIATION_PROFILE,
  normalizeVariationProfile,
  type VariationProfile,
} from "@/pages/studio/variation";


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
  /** Respostas do formulário de marca — base do contexto interpretativo. */
  brief_answers?: unknown;
  /** Slogan declarado — habilita o sub-nicho "Slogan em destaque". */
  slogan?: string | null;

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
  /** Fotos que o plano permite no acervo privado (0 = acervo bloqueado). */
  photoLimit?: number;
  onSaved?: () => void;
  /** Abre a aba de ajustes da marca (usado pelo editor quando falta público/CTA). */
  onOpenBrandSettings?: () => void;

};


const FRAME_STYLE: Record<StudioFormat, React.CSSProperties> = {
  "9x16": { width: "min(400px, 100%)", aspectRatio: "9/16" },
  "4x5": { width: "min(480px, 100%)", aspectRatio: "4/5" },
  "1x1": { width: "min(560px, 100%)", aspectRatio: "1/1" },
  free: { width: "100%" },
};

const FORMATS: { id: StudioFormat; label: string }[] = [
  { id: "9x16", label: "Story 9:16" },
  { id: "4x5", label: "Post 4:5" },
  { id: "1x1", label: "Post 1:1" },
  { id: "free", label: "Livre" },
];

/**
 * BOTÃO "POR QUE ESTA ARTE" — desligado por escolha do dono do Studio.
 *
 * O filtro de nexo continua rodando (é ele que troca formatos sem sentido); só a
 * leitura explicada deixou de aparecer no card. Trocar para `true` religa.
 */
const SHOW_WHY = false;

/** Nome do formato em linguagem comum, usado na explicação de cada arte. */
const FORMAT_LABEL: Record<StudioFormat, string> = {
  "9x16": "story vertical 9:16",
  "4x5": "post de feed 4:5",
  "1x1": "post quadrado 1:1",
  free: "altura livre",
};



/* Tokens de tema (inclui o lado B com cores invertidas) vivem em brandTheme.ts. */


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
  variation?: VariationProfile;
  /** Fotos fixadas pelo usuário para forçar o acervo da geração. */
  pinnedPhotos?: string[];
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
  photoLimit = 0,
  onSaved,
  onOpenBrandSettings,
}: Props) => {
  const restored = useRef<PersistedCreateState>(readPersisted(brand.id));
  /** Assinatura da marca nas artes: ajuste global da marca (ligado por padrão). */
  const signatureOn = brand.signature_enabled !== false;
  const [format, setFormat] = useState<StudioFormat>(restored.current.format ?? "free");
  const [seed, setSeed] = useState(() => restored.current.seed ?? randomSeed());
  const [busy, setBusy] = useState<string | null>(null);
  /** Índices das artes já salvas nesta versão — evita cliques duplicados. */
  const [saved, setSaved] = useState<Set<number>>(() => new Set());
  const wrapper = useRef<HTMLDivElement>(null);
  /** Acervo privado de fotos da conta — habilita os blocos fotográficos. */
  const {
    photos,
    loading: photosLoading,
    add: addPhoto,
    edit: editPhoto,
    remove: removePhoto,
  } = useStudioPhotos(true, brand.id);
  const [photosOpen, setPhotosOpen] = useState(false);
  /**
   * O acervo é separado por marca, mas o TETO do plano é da conta: soma as
   * fotos de todas as marcas. Recontado sempre que o acervo da marca muda.
   */
  const [photosTotal, setPhotosTotal] = useState(0);
  useEffect(() => {
    let alive = true;
    countPhotos()
      .then((n) => { if (alive) setPhotosTotal(n); })
      .catch(() => undefined);
    return () => { alive = false; };
  }, [photos.length]);
  /**
   * CONTROLE CRIATIVO: fotos fixadas.
   *
   * Com fotos fixadas, só elas alimentam os blocos fotográficos — mas cada uma
   * continua indo para o assunto com o qual tem nexo (`pickPhotoForTopics`).
   * Foto fixada sem nexo no tema simplesmente não gera bloco.
   */
  const [pinnedPhotos, setPinnedPhotos] = useState<string[]>(restored.current.pinnedPhotos ?? []);
  const activePhotos = useMemo(() => {
    if (pinnedPhotos.length === 0) return photos;
    const only = photos.filter((p) => pinnedPhotos.includes(p.id));
    return only.length > 0 ? only : photos;
  }, [photos, pinnedPhotos]);
  const togglePin = (id: string) =>
    setPinnedPhotos((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  useEffect(() => {
    writePersisted(brand.id, { pinnedPhotos });
  }, [brand.id, pinnedPhotos]);
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
      setSaved(new Set());
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
      setSaved(new Set());
      return;
    }

    setSeed(randomSeed());
    setSaved(new Set());
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

  /**
   * Públicos do kit + o sub-nicho automático "Slogan em destaque" (só existe
   * quando a marca tem slogan preenchido; sem slogan ele fica inativo).
   */
  const audiences = useMemo(
    () => audiencesWithSlogan(readAudiences(brand.audiences), brand.slogan),
    [brand.audiences, brand.slogan],
  );
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
  const [variation, setVariation] = useState<VariationProfile>(() =>
    normalizeVariationProfile(restored.current.variation ?? DEFAULT_VARIATION_PROFILE),
  );

  const toggleModel = (id: string) =>
    setModels((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  useEffect(() => {
    writePersisted(brand.id, { segment, angle, models, variation });
  }, [brand.id, segment, angle, models, variation]);

  // Se o público ativo deixa de existir (edição do kit), volta para o 360°.
  const activeSegment = segments.some((s) => s.id === segment) ? segment : GLOBAL_SEGMENT;

  const contentKit = useMemo(
    () => ({
      name: brand.name,
      niche: brand.niche,
      tone: brand.tone,
      description: brand.description,
      keywords: brand.topics,
      positioning: brand.positioning,
      /** Briefing declarado pelo cliente: fonte primária do texto das artes. */
      briefAnswers: brand.brief_answers,
      slogan: brand.slogan,
    }),
    [brand.name, brand.niche, brand.tone, brand.description, brand.topics, brand.positioning, brand.brief_answers, brand.slogan],
  );


  /**
   * Mundo Aliv.iA correspondente ao público ativo. Estruturalmente a marca tem
   * 4 nichos matriz (paciente, pro, clínica, acadêmico); sub-nichos herdam o
   * acervo do mundo de origem — descoberto pela cadeia `parentId` do kit, nunca
   * por lista fixa — e recebem por cima as próprias dores, desejos e soluções.
   * No 360° cada versão gira entre os mundos oficiais.
   */
  const subWorld = useMemo<WorldId | undefined>(() => {
    if (activeSegment === GLOBAL_SEGMENT || isWorldId(activeSegment)) return undefined;
    const parent = audienceAncestors(audiences, activeSegment).find((a) => isWorldId(a.id));
    return parent ? (parent.id as WorldId) : undefined;
  }, [audiences, activeSegment]);
  const aliviaWorld: WorldId | null = !isAlivia
    ? null
    : activeSegment !== GLOBAL_SEGMENT && isWorldId(activeSegment)
      ? activeSegment
      : subWorld
        ? subWorld
        : WORLD_IDS[createRng(`${brand.id}:${seed}:world`).int(WORLD_IDS.length)];



  /**
   * REGISTRO DE VOZ: o campo "tom de voz" do kit não é renderizado — ele apenas
   * classifica que vocabulário o motor pode usar nesta marca.
   */
  const register = useMemo(() => voiceRegister(brand.tone, brand.name), [brand.tone, brand.name]);

  const content = useMemo(() => {
    const built = buildSegmentContent({
      kit: contentKit,
      base: aliviaWorld ? WORLDS[aliviaWorld] : undefined,
      audiences,
      // Mundo oficial já embute o público; sub-nicho mantém o overlay próprio.
      // Mundo oficial já embute o público matriz; qualquer sub-nicho mantém o
      // overlay próprio (dores/desejos/soluções/CTA) por cima do mundo do pai.
      segment: aliviaWorld && isWorldId(activeSegment) ? GLOBAL_SEGMENT : activeSegment,
      angle,
      positioning: aliviaWorld ? null : brand.positioning,
      // Variedade linguística: cada lote reescreve a roupagem das frases.
      variationSeed: `${brand.id}:${seed}:${activeSegment}:${angle}`,
      variationProfile: variation,
    });
    /**
     * Passagem final pelo léxico: vale também para o acervo curado dos mundos
     * internos, então nenhuma marca fica presa às mesmas palavras.
     */
    return varyContent(built, {
      register,
      seed: `${brand.id}:${seed}:${activeSegment}:${angle}`,
      forbidden: isAlivia ? [] : ["aliv.ia", "alivia", "fisioterap"],
      profile: variation,
    });
  }, [contentKit, aliviaWorld, subWorld, audiences, activeSegment, angle, brand.positioning, brand.id, seed, register, isAlivia, variation]);

  const persona = useMemo(() => personaForSeed(`${brand.id}:${seed}`), [brand.id, seed]);

  /** Lockup da marca do cliente aplicado antes da renderização das artes. */
  const themeReady = useMemo(() => {
    applyStudioBrandTheme({
      name: brand.name,
      // Tom de voz é diretriz, não copy: o slogan sai da descrição/nicho.
      slogan: brandSlogan({ name: brand.name, niche: brand.niche, description: brand.description, slogan: brand.slogan }),
      logo: brand.logo_url,
      handle: brand.instagram_handle ?? null,
      site: brand.source_url ?? null,
    });
    return `${brand.id}:${brand.name}:${brand.logo_url ?? ""}`;
  }, [brand.id, brand.name, brand.niche, brand.description, brand.slogan, brand.logo_url, brand.instagram_handle, brand.source_url]);


  /** Memória de frases da marca (na conta): frase recente perde vez no sorteio. */
  const phraseMemory = usePhraseMemory(brand.id);

  const picker = useMemo(
    () => createPicker(buildCoverage(aliviaWorld ?? "pro", content, {}), () => {}, undefined, phraseMemory),
    [content, aliviaWorld, phraseMemory],
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
   * A cota é contada em gerações, então cada geração entrega a VERSÃO INTEIRA —
   * nada de amostrar artes soltas (era isso que quebrava a sequência do
   * carrossel, entregando um slide isolado). Trocar público, objetivo, modelo ou
   * formato navega a mesma geração sem custo.
   */
  const composedBlocks = useMemo(
    () =>
      composePage(
        createRng(`${brand.id}:${seed}:${activeSegment}:${angle}:layout`),
        persona,
        // Com modelos escolhidos, a linhagem de favoritos cede lugar à escolha.
        models.length > 0 ? undefined : lineage.blocks,
        content.carousels,
        activePhotos.length,
        kindsForModels(models, activePhotos.length, isAlivia),
        isAlivia,
      ),
    [brand.id, seed, activeSegment, angle, persona, content, lineage, activePhotos.length, models, isAlivia],
  );

  /**
   * FILTRO INTERNO DE NEXO.
   *
   * Antes de mostrar qualquer arte, o motor precisa conseguir explicar — em
   * linguagem de leigo — o que a arte mostra, o que ela diz para o público real
   * da marca e o que quer despertar em quem lê. Arte cuja explicação não fecha
   * não é intuitiva: é trocada por um formato que fecha o raciocínio. O filtro é
   * local e determinístico (mesma seed → mesma arte, zero crédito de IA).
   */
  const rationaleCtx = useMemo<RationaleContext>(() => {
    const audience = activeSegment === GLOBAL_SEGMENT ? null : resolveAudience(audiences, activeSegment);
    const matrix = audiences.find((a) => !a.parentId && (a.keyword || a.hook || (a.hooks ?? []).length > 0));
    const keyword =
      (audience ? audienceKeyword(audience) : "") ||
      (matrix ? audienceKeyword(matrix) : "") ||
      brand.niche ||
      brand.name;
    const hook =
      (audience ? audienceHook(audience) : "") ||
      (matrix ? audienceHook(matrix) : "") ||
      (brand.positioning ?? "").split(/[.;]/)[0] ||
      "";
    const cta =
      (audience?.cta ?? "").trim() ||
      (matrix?.cta ?? "").trim() ||
      content.closings[0]?.cta ||
      content.sales?.ctas?.[0] ||
      "";
    /** Par relacional do lote: é ele que o filtro cobra dentro do texto. */
    const relation = relationForSegment({
      kit: contentKit,
      audiences,
      segment: activeSegment,
      angle,
      positioning: brand.positioning,
      variationSeed: `${brand.id}:${seed}:${activeSegment}:${angle}`,
    });
    return {
      content,
      audienceLabel: audience?.label ?? (activeSegment === GLOBAL_SEGMENT ? "assunto livre da marca (360°)" : activeSegment),
      keyword,
      hook,
      cta,
      angle,
      photoCount: activePhotos.length,
      brandName: brand.name,
      relation: { pain: relation.pain, desire: relation.desire, axis: relation.axis },
      brand: {
        niche: brand.niche,
        tone: brand.tone,
        description: brand.description,
        positioning: brand.positioning,
        topics: brand.topics,
        briefAnswered:
          brand.brief_answers && typeof brand.brief_answers === "object"
            ? Object.values(brand.brief_answers as Record<string, unknown>).filter(
                (v) => typeof v === "string" && v.trim().length > 0,
              ).length
            : 0,
      },
    };
  }, [
    audiences,
    activeSegment,
    angle,
    content,
    contentKit,
    seed,
    activePhotos.length,
    brand.id,
    brand.name,
    brand.niche,
    brand.tone,
    brand.description,
    brand.positioning,
    brand.topics,
    brand.brief_answers,
  ]);



  const audit = useMemo(() => enforceRationale(composedBlocks, rationaleCtx), [composedBlocks, rationaleCtx]);
  const blocks = audit.blocks;
  /** Índice da arte com a leitura de sentido aberta. */
  const [whyOpen, setWhyOpen] = useState<number | null>(null);
  /**
   * AJUSTE FINO NO CARD: quando o filtro aponta que falta mensagem, o dono da
   * marca reescreve o texto na própria arte e reenvia para aprovação. Os textos
   * editados ficam guardados por posição e são reaplicados a cada re-render, de
   * modo que o PNG exportado e a arte salva saem já corrigidos.
   */
  const [edits, setEdits] = useState<Record<number, ArtTextEdits>>({});
  const [editing, setEditing] = useState<number | null>(null);
  /** Artes que o usuário revisou e reenviou para aprovação com sucesso. */
  const [approved, setApproved] = useState<Set<number>>(() => new Set());
  /** Remonta os blocos para recompor o texto original do motor após um "desfazer". */
  const [resetTick, setResetTick] = useState(0);
  /**
   * LADO A x LADO B: artes com as cores principais invertidas. O clique é
   * instantâneo (só troca tokens CSS) e vale para o PNG e para o que é salvo.
   */
  const [flipped, setFlipped] = useState<Set<number>>(() => new Set());
  const toggleFlip = (indexes: number[]) => {
    setFlipped((prev) => {
      const copy = new Set(prev);
      const turnOn = !indexes.every((i) => copy.has(i));
      indexes.forEach((i) => (turnOn ? copy.add(i) : copy.delete(i)));
      return copy;
    });
    // A arte mudou de versão: um salvamento anterior não representa mais a tela.
    setSaved((prev) => {
      const copy = new Set(prev);
      indexes.forEach((i) => copy.delete(i));
      return copy;
    });
  };


  const artNode = (index: number) =>
    document.getElementById(`studio-pro-block-${index}`) as HTMLElement | null;

  /**
   * EXPLICAÇÃO PERSONALIZADA DE CADA ARTE.
   *
   * O filtro (`enforceRationale`) julga o formato, mas a explicação mostrada ao
   * cliente precisa citar ESTA arte: as frases que foram realmente renderizadas
   * (lidas do próprio nó), o arranjo sorteado, o movimento, o formato de saída e
   * a posição dela na leva. Sem isso a leitura sairia igual para toda arte do
   * mesmo tipo.
   */
  const [whyCopy, setWhyCopy] = useState<Record<number, string[]>>({});

  const openWhy = (index: number) => {
    if (whyOpen === index) {
      setWhyOpen(null);
      return;
    }
    const node = artNode(index);
    if (node) {
      const texts = Object.values(readArtText(node));
      setWhyCopy((prev) => ({ ...prev, [index]: texts }));
    }
    setWhyOpen(index);
  };

  const explainWhy = (index: number, block: ComposedBlock) =>
    explainArt(block, rationaleCtx, {
      index,
      total: blocks.length,
      copy: whyCopy[index],
      formatLabel: FORMAT_LABEL[format],
      personaLabel: persona.name,
    });


  /** Reaplica as edições depois de qualquer re-render das artes. */
  useEffect(() => {
    Object.entries(edits).forEach(([key, value]) => {
      const node = artNode(Number(key));
      if (node) applyArtText(node, value);
    });
  }, [edits, blocks, format, seed, content, activePhotos, resetTick]);

  /** Liga a edição direta na arte (ou em todos os slides do carrossel). */
  const startEdit = (indexes: number[]) => {
    setWhyOpen(indexes[0]);
    setEditing(indexes[0]);
    indexes.forEach((i) => {
      const node = artNode(i);
      if (node) setArtEditing(node, true);
    });
  };

  const cancelEdit = (indexes: number[]) => {
    indexes.forEach((i) => {
      const node = artNode(i);
      if (!node) return;
      setArtEditing(node, false);
      applyArtText(node, edits[i]);
    });
    setEditing(null);
  };

  /** Fecha a edição validando a mensagem antes de reenviar a arte para aprovação. */
  const finishEdit = (indexes: number[]) => {
    const collected: Record<number, ArtTextEdits> = {};
    for (const i of indexes) {
      const node = artNode(i);
      if (!node) continue;
      const next = readArtText(node);
      const texts = Object.values(next);
      if (texts.some((t) => !t)) {
        toast.error("Há um texto vazio na arte. Preencha ou desfaça o ajuste.");
        return;
      }
      const jargon = texts.find((t) => hasBannedJargon(t));
      if (jargon) {
        toast.error("Essa frase usa jargão de marketing. Escreva como você falaria com o paciente.");
        return;
      }
      collected[i] = next;
    }
    indexes.forEach((i) => {
      const node = artNode(i);
      if (node) setArtEditing(node, false);
    });
    setEdits((prev) => ({ ...prev, ...collected }));
    setEditing(null);
    setApproved((prev) => {
      const copy = new Set(prev);
      indexes.forEach((i) => copy.add(i));
      return copy;
    });
    // A arte mudou: um salvamento anterior não representa mais o que está em tela.
    setSaved((prev) => {
      const copy = new Set(prev);
      indexes.forEach((i) => copy.delete(i));
      return copy;
    });
    toast.success("Arte ajustada e reenviada para aprovação.");
  };

  /** Volta ao texto original gerado pelo motor. */
  const resetEdit = (indexes: number[]) => {
    setEdits((prev) => {
      const copy = { ...prev };
      indexes.forEach((i) => delete copy[i]);
      return copy;
    });
    setApproved((prev) => {
      const copy = new Set(prev);
      indexes.forEach((i) => copy.delete(i));
      return copy;
    });
    setEditing(null);
    indexes.forEach((i) => {
      const node = artNode(i);
      if (node) setArtEditing(node, false);
    });
    // Remonta os blocos para o motor reescrever o texto original.
    setResetTick((n) => n + 1);
    toast.success("Texto original restaurado.");
  };

  /**
   * AGRUPAMENTO DE ENTREGA.
   *
   * Slides do mesmo carrossel viram UM item (faixa com scroll lateral, como no
   * Instagram); qualquer outra arte é um item avulso.
   */
  const groups = useMemo(() => {
    type Item = { block: ComposedBlock; index: number };
    const out: { key: string; carousel: boolean; items: Item[] }[] = [];
    blocks.forEach((block, index) => {
      const group = block.kind === "carousel" && block.slide ? block.slide.group : null;
      const last = out[out.length - 1];
      if (group !== null && last?.carousel && last.key === `carousel-${group}`) {
        last.items.push({ block, index });
        return;
      }
      out.push({
        key: group !== null ? `carousel-${group}` : `${block.kind}-${index}`,
        carousel: group !== null,
        items: [{ block, index }],
      });
    });
    return out;
  }, [blocks]);




  useEffect(() => {
    // Reaplica o tema quando a marca muda de aba/rota.
    void themeReady;
  }, [themeReady]);

  /** Kit da marca aplicado como tokens: 2 principais + 2 secundárias + extras. */
  const kit = readColorKit(brand.colors);
  const themeStyle = useMemo(
    () => buildBrandThemeStyle({ kit, seed }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(kit), seed],
  );

  /** Lado B: mesmo kit, papéis das duas cores principais trocados. */
  const invertedStyle = useMemo(
    () => buildBrandThemeStyle({ kit, seed, invert: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(kit), seed],
  );




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
    // Lado B é outra peça: ganha sufixo próprio para não sobrescrever o lado A.
    const side = flipped.has(index) ? "-b" : "";
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
        const path = `${auth.user.id}/${brand.id}/${seed}-${String(index + 1).padStart(2, "0")}-${kind}${side}.png`;
        const { error: upErr } = await supabase.storage
          .from("studio-art")
          .upload(path, png, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;
        pngPath = path;
      } catch (error) {
        console.warn("[studio-pro] png upload", error);
      }
    }
    /**
     * Instantâneo da arte pronta: é o que a edição pela galeria reabre. Sem ele
     * a edição teria que RECONSTRUIR a arte pelo motor textual — e devolveria
     * outra arte, não esta.
     */
    const snapshot = node
      ? await captureArtSnapshot({
          userId: auth.user.id,
          brandId: brand.id,
          key: `${seed}-${String(index + 1).padStart(2, "0")}-${kind}${side}`,
          format,
          nodes: [node],
        })
      : null;
    const { error } = await supabase.from("studio_creations").insert({
      user_id: auth.user.id,
      brand_id: brand.id,
      seed: `${seed}${side}:${index}`,
      block_kind: kind,
      format,
      headline: headlineOf(index) || null,
      caption,
      thumb,
      png_path: pngPath,
      // Receita da arte: permite reusar a composição aprovada nas próximas versões.
      composition: JSON.parse(JSON.stringify(blocks)),
      /** Texto exato exibido na arte: é o que a edição pela galeria reabre. */
      text_edits: { 0: node ? readArtText(node) : {} },
      snapshot,


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
    setSaved((prev) => new Set(prev).add(index));
    toast.success(
      pngPath
        ? `Arte salva em ${folder === "Todas" ? "Geral" : folder} com PNG e legenda`
        : `Arte salva em ${folder === "Todas" ? "Geral" : folder} (PNG não pôde ser guardado)`,
    );
    onSaved?.();
  };

  /**
   * No formato Livre cada slide tem altura própria; o Instagram só aceita
   * carrossel com proporção única. Nos formatos fixos a proporção já é única.
   */
  const lockCarouselHeight = (nodes: HTMLElement[]) =>
    format === "free" ? lockUniformHeight(nodes) : () => {};

  /** Exporta a sequência inteira do carrossel: cada slide sai como PNG individual. */
  const downloadCarousel = async (indexes: number[]) => {
    setBusy(`png-${indexes[0]}`);
    let unlock = () => {};
    try {
      const base = brand.name.replace(/\s+/g, "-").toLowerCase();
      const items = indexes
        .map((idx, i) => {
          const node = document.getElementById(`studio-pro-block-${idx}`) as HTMLElement | null;
          return node
            ? { node, fileName: `${base}-${seed}-carrossel-${String(i + 1).padStart(2, "0")}.png` }
            : null;
        })
        .filter((item): item is { node: HTMLElement; fileName: string } => !!item);
      if (!items.length) throw new Error("no-nodes");
      unlock = lockUniformHeight(items.map((item) => item.node));
      const { delivered } = await exportNodesAsPng(items);
      toast.success(`Carrossel exportado (${delivered} slides)`);
    } catch (error) {
      console.error("[studio-pro] export carousel", error);
      toast.error("Não foi possível exportar o carrossel.");
    } finally {
      unlock();
      setBusy(null);
    }
  };


  /** Salva o carrossel como UM item da galeria: capa é a miniatura. */
  const saveCarousel = async (indexes: number[], caption: string) => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Faça login novamente para salvar.");
      return;
    }
    setBusy(`save-${indexes[0]}`);
    let thumb: string | null = null;
    let coverPath: string | null = null;
    const carouselNodes = indexes
      .map((i) => document.getElementById(`studio-pro-block-${i}`) as HTMLElement | null)
      .filter((n): n is HTMLElement => !!n);
    const unlockHeights = lockUniformHeight(carouselNodes);
    for (let i = 0; i < indexes.length; i += 1) {
      const node = document.getElementById(`studio-pro-block-${indexes[i]}`) as HTMLElement | null;
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (i === 0) {
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
          console.warn("[studio-pro] carousel thumb", error);
        }
      }
      try {
        const ratio = Math.max(1, Math.min(4, 1440 / (rect.width || 1440)));
        const png = await renderNodeToBlob(node, ratio, "image/png");
        const path = `${auth.user.id}/${brand.id}/${seed}-carrossel-${String(i + 1).padStart(2, "0")}.png`;
        const { error: upErr } = await supabase.storage
          .from("studio-art")
          .upload(path, png, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;
        if (i === 0) coverPath = path;
      } catch (error) {
        console.warn("[studio-pro] carousel png upload", error);
      }
    }
    unlockHeights();
    /** Instantâneo de cada slide: a edição pela galeria reabre exatamente estes. */
    const slideNodes = indexes
      .map((i) => document.getElementById(`studio-pro-block-${i}`) as HTMLElement | null)
      .filter((n): n is HTMLElement => !!n);
    const snapshot = await captureArtSnapshot({
      userId: auth.user.id,
      brandId: brand.id,
      key: `${seed}-carrossel-${indexes[0]}`,
      format,
      nodes: slideNodes,
    });
    const { error } = await supabase.from("studio_creations").insert({
      user_id: auth.user.id,
      brand_id: brand.id,
      seed: `${seed}:carrossel:${indexes[0]}`,
      block_kind: "carousel",
      format,
      headline: headlineOf(indexes[0]) || null,
      caption,
      thumb,
      png_path: coverPath,
      composition: JSON.parse(JSON.stringify(indexes.map((i) => blocks[i]))),
      /** Texto exato de cada slide: é o que a edição pela galeria reabre. */
      text_edits: Object.fromEntries(
        indexes.map((i, pos) => {
          const node = document.getElementById(`studio-pro-block-${i}`) as HTMLElement | null;
          return [pos, node ? readArtText(node) : {}];
        }),
      ),
      snapshot,

      segment: activeSegment,
      angle,
      folder: folder === "Todas" ? "Geral" : folder,
      watermarked: watermark,
    });
    setBusy(null);
    if (error) {
      console.error("[studio-pro] save carousel", error);
      toast.error("Não foi possível salvar o carrossel.");
      return;
    }
    setSaved((prev) => {
      const next = new Set(prev);
      for (const i of indexes) next.add(i);
      return next;
    });
    toast.success(`Carrossel salvo em ${folder === "Todas" ? "Geral" : folder} (${indexes.length} slides)`);
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

  /** Baixa todas as artes desta versão com a mesma qualidade do download individual. */
  const downloadAll = async () => {
    setBusy("all-png");
    try {
      const base = brand.name.replace(/\s+/g, "-").toLowerCase();
      const items: Array<{ node: HTMLElement; fileName: string }> = [];
      for (let i = 0; i < blocks.length; i += 1) {
        const node = document.getElementById(`studio-pro-block-${i}`) as HTMLElement | null;
        if (!node) continue;
        items.push({
          node,
          fileName: `${base}-${seed}-${String(i + 1).padStart(2, "0")}-${blocks[i].kind}.png`,
        });
      }
      if (!items.length) throw new Error("no-nodes");
      const { delivered } = await exportNodesAsPng(items);
      toast.success(`Todas as artes desta versão foram exportadas (${delivered})`);
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
            {!unlimited && " · 1 geração por versão (artes ilimitadas dentro dela)"}
          </p>
          {!unlimited && quotaError && (
            <p className="mt-1 text-xs font-semibold text-destructive">
              Não conseguimos ler sua cota agora — a geração segue liberada e o desconto é feito no servidor.
            </p>
          )}
          {!unlimited && quota && !quotaError && (
            <p className="mt-1 text-xs font-semibold text-foreground">
              {quota.generationsLeft > 0
                ? `${quota.generationsLeft} de ${quota.allowance} ${quota.allowance === 1 ? "geração" : "gerações"} restantes neste período`
                : "Gerações do período encerradas — faça upgrade para continuar gerando."}
            </p>
          )}

          {/* Nichos da marca + visão 360° (modo livre: assunto sorteado por lote). */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {segments.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={activeSegment === s.id ? "secondary" : "ghost"}
                className="h-7 rounded-full text-[11px]"
                title={
                  s.id === GLOBAL_SEGMENT
                    ? "Assunto livre: cada lote fala da marca como um todo ou de um público relevante, sorteado"
                    : undefined
                }
                onClick={() => setSegment(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          {/* Ângulo estratégico: informar (sem dar aula), dor, desejo ou venda. */}
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
                      (!!m.needsPhoto && activePhotos.length === 0) || (!!m.needsBrand && !isAlivia);
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
          <VariationControl
            value={variation}
            onChange={setVariation}
            register={register}
            previewSeed={`${brand.id}:${seed}`}
          />
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
                ? `Esta versão se inspira nos seus favoritos (${inspirations.length} referências no acervo, sem virar padrão fixo).`
                : `Versão livre — explorando fora do que já agradou nos ${inspirations.length} favoritos.`}

            {photos.length > 0 &&
              (pinnedPhotos.length > 0
                ? ` · ${activePhotos.length} foto(s) fixada(s) em uso`
                : ` · ${photos.length} fotos do acervo em uso`)}
          </p>

          {/* Acervo privado de fotos: envio, enquadramento e fixação. */}
          <div className="mt-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-full text-xs"
              onClick={() => setPhotosOpen(true)}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              Adicionar / gerenciar fotos
            </Button>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {photos.length === 0
                ? "Nenhuma foto nesta marca — clique para enviar as suas."
                : `${photos.length} foto(s) nesta marca${photoLimit > 0 ? ` · ${photosTotal} de ${photoLimit} no plano` : ""}${pinnedPhotos.length > 0 ? ` · ${pinnedPhotos.length} fixada(s) para a próxima geração` : " · fixe uma foto ali para usá-la obrigatoriamente"}.`}
            </p>
          </div>




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

      {/* Resultado do filtro interno de nexo, quando ele precisou agir. */}
      {(audit.fixed > 0 || audit.gaps.length > 0) && (
        <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground">
          <p className="font-semibold text-foreground">
            <Lightbulb className="mr-1 inline h-3.5 w-3.5" />
            Filtro de sentido
            {audit.fixed > 0
              ? `: ${audit.fixed} ${audit.fixed === 1 ? "arte foi trocada" : "artes foram trocadas"} por um formato que se explica sozinho.`
              : ": revise os pontos abaixo para as artes ficarem mais claras."}
          </p>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
            {audit.gaps.slice(0, 5).map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
          <p className="mt-1.5">
            Toda arte precisa ser explicável para um leigo: o que mostra, o que diz e o que quer despertar.
            Complete o kit da marca e o motor deixa de recorrer a formatos de reserva.
          </p>
        </div>
      )}

      <div ref={wrapper} className="mt-5 flex flex-col items-center gap-6" style={themeStyle}>
        {groups.map((group) => {
          const first = group.items[0];
          const indexes = group.items.map((item) => item.index);
          const caption = buildCaption(
            content,
            first.block.kind,
            createRng(`${brand.id}:${seed}:caption:${first.block.kind}:${first.index}`),
          );
          const isSaved = group.carousel
            ? indexes.every((i) => saved.has(i))
            : saved.has(first.index);
          const art = (item: { block: ComposedBlock; index: number }) => {
            const { kind, treatment, motion, slide } = item.block;
            const Block = STUDIO_BLOCKS[kind];
            return (
              <div
                className={`overflow-hidden rounded-2xl border border-border bg-background ${
                  format === "1x1" ? "studio-pro-square" : ""
                } ${group.carousel ? "shrink-0 snap-center" : "mx-auto"}`}
                style={FRAME_STYLE[format]}
              >
                {/* Lado B aplica os tokens invertidos só nesta arte. */}
                <div
                  id={`studio-pro-block-${item.index}`}
                  className="h-full w-full bg-background"
                  style={flipped.has(item.index) ? invertedStyle : undefined}
                >

                  <ArtworkGuard key={`${item.index}:${resetTick}`} brand={brand.name}>
                  {/* AutoFit: copy longa encolhe para caber; nunca sai cortada. */}
                  <AutoFit resetKey={`${brand.id}:${seed}:${format}:${kind}:${item.index}`}>
                  <StudioProSignature
                    artKey={`${brand.id}:${seed}:${kind}:${item.index}`}
                    enabled={signatureOn}
                    brandName={brand.name}
                  >
                    <StudioMotion kind={motion}>
                      <Block
                        content={content}
                        rng={createRng(`${brand.id}:${seed}:${kind}:${item.index}`)}
                        treatment={treatment}
                        format={format}
                        picker={picker}
                        persona={persona}
                        slide={slide}
                        photos={activePhotos}
                      />
                    </StudioMotion>
                  </StudioProSignature>
                  </AutoFit>
                  </ArtworkGuard>
                </div>
              </div>
            );
          };

          return (
            <div key={group.key} className="w-full">
              {group.carousel ? (
                <>
                  <p className="mb-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Carrossel completo · {group.items.length} slides · arraste para o lado →
                  </p>
                  {/* Faixa com scroll lateral e snap: a sequência é vista como no Instagram. */}
                  <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
                    {group.items.map((item) => (
                      <div key={item.index} className="shrink-0">
                        {art(item)}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                art(first)
              )}

              <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `png-${first.index}`}
                  onClick={() =>
                    group.carousel
                      ? void downloadCarousel(indexes)
                      : void download(first.index, first.block.kind)
                  }
                >
                  {busy === `png-${first.index}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {group.carousel ? `PNG (${group.items.length})` : "PNG"}
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
                {/* Lado A / Lado B: mesma arte com as cores principais trocadas. */}
                <Button
                  size="sm"
                  variant={indexes.every((i) => flipped.has(i)) ? "secondary" : "outline"}
                  className="h-8 rounded-full text-xs"
                  onClick={() => toggleFlip(indexes)}
                >
                  <Contrast className="mr-1.5 h-3.5 w-3.5" />
                  {indexes.every((i) => flipped.has(i)) ? "Lado B" : "Inverter cores"}
                </Button>

                {SHOW_WHY && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full text-xs"
                    onClick={() => openWhy(first.index)}
                  >
                    <Lightbulb className="mr-1.5 h-3.5 w-3.5" />
                    Por que esta arte
                  </Button>
                )}

                {editing === first.index ? (
                  <>
                    <Button
                      size="sm"
                      className="h-8 rounded-full text-xs"
                      onClick={() => finishEdit(indexes)}
                    >
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Concluir ajuste
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-full text-xs"
                      onClick={() => cancelEdit(indexes)}
                    >
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full text-xs"
                    onClick={() => startEdit(indexes)}
                  >
                    <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                    Ajustar texto
                  </Button>
                )}
                {indexes.some((i) => hasArtEdits(edits[i])) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full text-xs"
                    onClick={() => resetEdit(indexes)}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Desfazer
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={isSaved ? "secondary" : "default"}
                  className="h-8 rounded-full text-xs"
                  disabled={isSaved || busy === `save-${first.index}`}
                  onClick={() =>
                    group.carousel
                      ? void saveCarousel(indexes, caption)
                      : void save(first.index, first.block.kind, caption)
                  }
                >
                  {busy === `save-${first.index}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isSaved
                    ? "Salvo"
                    : group.carousel
                      ? "Salvar carrossel"
                      : "Salvar na marca"}
                </Button>
              </div>

              {/* Leitura de sentido: a explicação que o motor consegue dar da arte. */}
              {SHOW_WHY && whyOpen === first.index && (() => {
                const why = explainWhy(first.index, first.block);
                if (!why) return null;

                return (
                  <div className="mx-auto mt-2 max-w-xl rounded-2xl border border-border bg-card p-4 text-left">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Formato: {why.format}
                    </p>
                    <ul className="mt-2 space-y-1.5 text-xs text-foreground">
                      <li>
                        <strong>Contexto da marca:</strong> {why.brandRead}
                      </li>
                      <li>
                        <strong>Público-alvo:</strong> {why.audienceRead}
                      </li>
                      <li>
                        <strong>Objetivo da arte:</strong> {why.objectiveRead}
                      </li>
                      <li>
                        <strong>A arte em si:</strong> {why.artRead}
                      </li>
                      <li className="text-muted-foreground">{why.verdict}</li>
                    </ul>

                    {why.gaps.length > 0 && (
                      <p className="mt-2 rounded-xl bg-muted/60 p-2 text-[11px] text-muted-foreground">
                        Ainda falta para esta arte ficar 100%: {why.gaps.join("; ")}.
                      </p>
                    )}

                    {/* EDITOR DO CARD: corrige o que o filtro apontou e reenvia para aprovação. */}
                    {(() => {
                      const gapText = why.gaps.join(" ").toLowerCase();
                      const needsPhoto = gapText.includes("foto");
                      const needsBrand =
                        gapText.includes("público") || gapText.includes("cta") || gapText.includes("kit");
                      const isEditing = editing === first.index;
                      const wasEdited = indexes.some((i) => hasArtEdits(edits[i]));
                      return (
                        <div className="mt-3 rounded-xl border border-dashed border-border p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Ajustar esta arte
                          </p>
                          {isEditing ? (
                            <p className="mt-1 text-[11px] text-foreground">
                              Clique em qualquer frase da arte acima e reescreva. Quando terminar, use
                              "Concluir ajuste" para reenviar a aprovação — a arte sai em PNG e é salva já com
                              o seu texto.
                            </p>
                          ) : (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {why.gaps.length > 0
                                ? "O filtro apontou pontos abertos. Corrija a mensagem direto na arte ou complete o que falta no kit."
                                : "A leitura já fecha. Se quiser trocar uma palavra, edite direto na arte."}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  className="h-7 rounded-full text-[11px]"
                                  onClick={() => finishEdit(indexes)}
                                >
                                  <Check className="mr-1 h-3 w-3" />
                                  Concluir e reenviar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 rounded-full text-[11px]"
                                  onClick={() => cancelEdit(indexes)}
                                >
                                  Cancelar
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-full text-[11px]"
                                onClick={() => startEdit(indexes)}
                              >
                                <PencilLine className="mr-1 h-3 w-3" />
                                Editar texto na arte
                              </Button>
                            )}
                            {needsPhoto && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-full text-[11px]"
                                onClick={() => setPhotosOpen(true)}
                              >
                                <Camera className="mr-1 h-3 w-3" />
                                Enviar foto do acervo
                              </Button>
                            )}
                            {needsBrand && onOpenBrandSettings && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-full text-[11px]"
                                onClick={onOpenBrandSettings}
                              >
                                <Settings2 className="mr-1 h-3 w-3" />
                                Completar público e CTA
                              </Button>
                            )}
                            {wasEdited && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 rounded-full text-[11px]"
                                onClick={() => resetEdit(indexes)}
                              >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                Voltar ao original
                              </Button>
                            )}
                          </div>
                          {approved.has(first.index) && !isEditing && (
                            <p className="mt-2 text-[11px] font-semibold text-foreground">
                              <Check className="mr-1 inline h-3 w-3" />
                              Ajustada por você e aprovada. Baixe o PNG ou salve na marca.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 h-7 rounded-full px-2 text-[11px]"
                      onClick={() => void copyCaption(rationaleText(why))}
                    >
                      Copiar explicação
                    </Button>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {photosOpen && (
        <StudioPhotos
          photos={photos}
          loading={photosLoading}
          onUpload={addPhoto}
          onEdit={editPhoto}
          onRemove={removePhoto}
          limit={photoLimit}
          usedTotal={photosTotal}
          pinnedIds={pinnedPhotos}
          onTogglePin={togglePin}
          onClose={() => setPhotosOpen(false)}
        />
      )}
    </section>
  );
};

export default StudioProCreate;
