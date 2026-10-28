import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Contrast,

  Download,
  FileText,
  Gift,
  LayoutGrid,
  Lightbulb,
  Loader2,
  Move,
  PencilLine,
  RefreshCw,
  RotateCcw,
  Save,
  Settings2,
  Sparkles,
  Type,
  ImagePlus,
} from "lucide-react";
import { ArtPhotoSwapDialog, applyArtPhotoSwaps, applyInsertedArtImage, artPhotoSlots, type ArtImageInsertions, type ArtPhotoSwaps, type InsertedImageMode, type SwapPhoto } from "@/pages/studio/artPhotoSwap";
import { Link } from "react-router-dom";
import { PRODUCT } from "./product";
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
  publicationPixelRatio,
  randomSeed,
  renderNodeToBlob,
  type ComposedBlock,
  type StudioFormat,
} from "@/studio-core";
import { phraseSignature } from "@/pages/studio/picker";
import { useStudioPhotos } from "@/pages/studio/useStudioPhotos";

import { countPhotos } from "@/pages/studio/photos";
import { isOfficialPhoto } from "@/pages/studio/officialPhotos";
import { curatePhotosForContent, rankPhotosForSwap } from "@/pages/studio/photoPolicy";
import StudioPhotos from "@/pages/studio/StudioPhotos";
import { applyStudioBrandTheme } from "@/pages/studio/brand";
import { voiceRegister } from "@/pages/studio/lexicon";
import { varyContent } from "@/pages/studio/vary";
import { learnStyle } from "@/pages/studio/style";
import { usePhraseMemory } from "./usePhraseMemory";
import { WORLDS, WORLD_IDS, isWorldId, type WorldId } from "@/pages/studio/content";
import { buildSegmentContent, brandSlogan, enforceEditorialFocus, relationForSegment, pickGlobalAudience } from "./brandContent";
import { useSegmentMemory } from "./useSegmentMemory";
import { planBatch, planMultiSegmentBatch } from "./director";
import { FEED_PRESET_MODELS, isFeedPreset, pillarOfKind, pillarLabel } from "./feedPlan";
import { formatInsightWords, readFormatInsights } from "./formatInsights";
import type { TopicId } from "@/pages/studio/topics";
import { buildBrandDna } from "./brandDnaKit";
import { useBrandBrief } from "./useBrandBrief";
import { useCopyLearning } from "./useCopyLearning";
import { applyLearnedCopy, diffArtText } from "@/pages/studio/copyLearning";
import { enforceSegmentAudienceScope } from "./audienceScope";



import { readColorKit } from "./brandColors";
import { buildBrandThemeStyle } from "./brandTheme";

import { ensureFontLoaded } from "./brandFonts";

import {
  ALIVIA_AUDIENCES,
  ANGLES,
  GLOBAL_SEGMENT,
  audienceAncestors,
  audienceHook,
  audienceKeyword,
  audiencesWithSlogan,
  buildSegments,
  editorialAudienceIds,
  slugifySegment,
  readAudiences,
  resolveAudience,
  type ContentAngle,
} from "./audiences";
import { enforceRationale, explainArt, rationaleText, type RationaleContext } from "@/pages/studio/rationale";
import { hasBannedJargon } from "@/pages/studio/persuasion";
import {
  applyArtTextSizes,
  applyArtText,
  captureArtTextEditSnapshot,
  clearArtTextSizes,
  hasArtEdits,
  readArtText,
  restoreArtTextEditSnapshot,
  setArtEditing,
  type ArtTextEditSnapshot,
  type ArtTextEdits,
} from "@/pages/studio/artTextEdit";
import { applyArtMoves, clearArtMoves, hasArtMoves, setArtMoving } from "@/pages/studio/artTextMove";
import { forgetArtLearning, learnArtMoves } from "@/pages/studio/artMoveLearning";
import { STUDIO_GENERATION_COST, useStudioQuota } from "./useStudioQuota";
import { markWelcomeBatchUsed, welcomeBatchUsed } from "./welcomeBatch";
import { captureArtSnapshot } from "./artSnapshot";
import { STUDIO_MODELS, kindsForModels } from "@/pages/studio/models";
import {
  ALIVIA_ECOSYSTEM_RECIPES,
  buildAliviaEcosystem,
  ecosystemRecipe,
  withAliviaEcosystem,
  type AliviaEcosystemRecipeId,
} from "./aliviaEcosystems";
import { ALIVIA_DIFFERENTIALS } from "./aliviaDifferentials";
import { officialPhotoIdsForDifferential } from "./aliviaOfficialMedia";
import StudioProSignature from "./StudioProSignature";
import AutoFit from "@/pages/studio/AutoFit";
import { frameStyle } from "@/pages/studio/frame";
import ArtworkGuard from "@/pages/studio/ArtworkGuard";
import FrozenArt from "@/pages/studio/FrozenArt";
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
  mark_url?: string | null;
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
  /** Insights de formatos: ideias de arte com o diálogo já pronto (uma por linha). */
  format_insights?: string | null;
  keyword_matrix?: unknown;
  reasoning_matrix?: unknown;

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
  /** Diferenciais podem ser combinados; públicos comuns continuam unitários. */
  differentialSegments?: string[];
  angle?: ContentAngle;
  /** Modelos escolhidos; vazio = aleatório. */
  models?: string[];
  variation?: VariationProfile;
  /** Fotos fixadas pelo usuário para forçar o acervo da geração. */
  pinnedPhotos?: string[];
  /** Filtro "fotos do acervo em destaque": metade das artes com foto de fundo. */
  photoFirst?: boolean;
  /** Estado da seção extensa de diferenciais. */
  differentialsOpen?: boolean;
  ecosystemRecipe?: AliviaEcosystemRecipeId;
  ecosystemIds?: string[];

};

const editsKey = (brandId: string, seed: string) => `studio-pro:edits:v2:${brandId}:${seed}`;
const readPersistedEdits = (brandId: string, seed: string): Record<number, ArtTextEdits> => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(editsKey(brandId, seed)) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};
const writePersistedEdits = (brandId: string, seed: string, edits: Record<number, ArtTextEdits>) => {
  try {
    sessionStorage.setItem(editsKey(brandId, seed), JSON.stringify(edits));
  } catch {
    /* modo privado / cota do navegador — a memória desta montagem continua ativa */
  }
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
  /** Topo do bloco de criação: alvo do scroll ao renovar pelo fim da página. */
  const topRef = useRef<HTMLElement>(null);
  /** Acervo privado de fotos da conta — habilita os blocos fotográficos. */
  const {
    photos,
    loading: photosLoading,
    add: addPhoto,
    edit: editPhoto,
    remove: removePhoto,
  } = useStudioPhotos(true, brand.id, brand.content_source === "alivia");
  const [photosOpen, setPhotosOpen] = useState(false);
  /**
   * O acervo é separado por marca, mas o TETO do plano é da conta: soma as
   * fotos de todas as marcas. Recontado sempre que o acervo da marca muda.
   */
  const [photosTotal, setPhotosTotal] = useState(0);
  const officialPhotosTotal = photos.filter(isOfficialPhoto).length;
  const uploadedPhotosTotal = photos.length - officialPhotosTotal;
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
  /**
   * FOTOS DO ACERVO EM DESTAQUE: cota garantida de metade das artes com foto
   * como plano de fundo. Fica salvo por marca junto das outras preferências.
   */
  const [photoFirst, setPhotoFirst] = useState<boolean>(restored.current.photoFirst ?? false);
  useEffect(() => {
    writePersisted(brand.id, { photoFirst });
  }, [brand.id, photoFirst]);
  /** Cota do período: contada em gerações — 1 por clique em "Nova versão". */
  const { quota, error: quotaError, consume } = useStudioQuota(brand.id);



  const unlimited = unlimitedAccess || !!quota?.unlimited;
  /** Só bloqueia com dado confirmado: cota desconhecida nunca trava o botão. */
  const blocked = !unlimited && !!quota && !quotaError && quota.remaining < STUDIO_GENERATION_COST;

  /**
   * LOTE DE BOAS-VINDAS: o primeiro lote da marca já vem montado sem custo.
   * O aviso só aparece enquanto a marca não gastou nenhuma geração do período
   * e ainda não clicou em "Nova versão" — assinante antigo não vê o recado.
   */
  const [welcomeUsed, setWelcomeUsed] = useState(() => welcomeBatchUsed(brand.id));
  useEffect(() => {
    setWelcomeUsed(welcomeBatchUsed(brand.id));
  }, [brand.id]);
  const showWelcomeBatch =
    !unlimited &&
    !welcomeUsed &&
    !!quota &&
    !quotaError &&
    quota.generationsLeft === quota.allowance;


  /**
   * "Nova versão" é o único clique que custa cota (1 geração). Trocar público,
   * objetivo, modelo ou formato navega a MESMA geração de graça — é ali que a
   * versão rende dezenas de artes. O desconto acontece no banco antes da nova
   * seed; se a cota do período acabou, a geração é bloqueada com aviso claro.
   */
  const newVersion = async () => {
    // A partir daqui o lote de boas-vindas acabou: some o aviso de cortesia.
    markWelcomeBatchUsed(brand.id);
    setWelcomeUsed(true);
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

  /** Mesmo lote novo, disparado pelo fim da página: sobe primeiro, depois gera. */
  const newVersionFromBottom = async () => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    await newVersion();
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
    () => audiencesWithSlogan(isAlivia ? ALIVIA_AUDIENCES : readAudiences(brand.audiences), brand.slogan),
    [brand.audiences, brand.slogan, isAlivia],
  );
  const segments = useMemo(() => buildSegments(audiences), [audiences]);
  const segmentGroups = useMemo(() => {
    const regular = segments.filter((item) => !item.group);
    const grouped = new Map<string, typeof segments>();
    segments.filter((item) => item.group).forEach((item) => {
      const key = item.group ?? "";
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    });
    return { regular, grouped: [...grouped.entries()] };
  }, [segments]);
  const [segment, setSegment] = useState<string>(restored.current.segment ?? GLOBAL_SEGMENT);
  /**
   * Temas da linha editorial da marca (diferenciais de um SaaS, serviços de uma
   * clínica, produtos de uma loja). Só aqui a seleção é múltipla.
   */
  const editorialIds = useMemo(() => new Set(editorialAudienceIds(audiences)), [audiences]);
  const editorialIdsRef = useRef(editorialIds);
  editorialIdsRef.current = editorialIds;
  const [differentialSegments, setDifferentialSegments] = useState<string[]>(() => {
    const saved = restored.current.differentialSegments ?? [];
    const known = editorialIdsRef.current;
    if (saved.length) return saved.filter((id) => known.has(id));
    const legacy = restored.current.segment;
    return legacy && known.has(legacy) ? [legacy] : [];
  });
  const [differentialsOpen, setDifferentialsOpen] = useState(restored.current.differentialsOpen ?? true);
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
  const initialEcosystemRecipe = ecosystemRecipe(restored.current.ecosystemRecipe);
  const [ecosystemRecipeId, setEcosystemRecipeId] = useState<AliviaEcosystemRecipeId>(initialEcosystemRecipe.id);
  const [ecosystemIds, setEcosystemIds] = useState<string[]>(restored.current.ecosystemIds ?? initialEcosystemRecipe.ids);
  const [directionOpen, setDirectionOpen] = useState(() => (restored.current.models?.length ?? 0) > 0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [variation, setVariation] = useState<VariationProfile>(() =>
    normalizeVariationProfile(restored.current.variation ?? DEFAULT_VARIATION_PROFILE),
  );

  const toggleModel = (id: string) =>
    setModels((prev) => {
      if (prev.includes(id)) return prev.filter((model) => model !== id);
      return id === "ecossistema" ? [id] : [...prev.filter((model) => model !== "ecossistema"), id];
    });

  const chooseEcosystemRecipe = (id: AliviaEcosystemRecipeId) => {
    const recipe = ecosystemRecipe(id);
    setEcosystemRecipeId(recipe.id);
    setEcosystemIds(recipe.ids);
  };
  const toggleEcosystemStep = (id: string) => {
    setEcosystemIds((previous) => {
      if (previous.includes(id)) return previous.length > 3 ? previous.filter((item) => item !== id) : previous;
      return previous.length < 5 ? [...previous, id] : previous;
    });
  };
  const moveEcosystemStep = (index: number, direction: -1 | 1) => {
    setEcosystemIds((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.length) return previous;
      const next = [...previous];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  useEffect(() => {
    writePersisted(brand.id, { segment, differentialSegments, differentialsOpen, angle, models, variation, ecosystemRecipe: ecosystemRecipeId, ecosystemIds });
  }, [brand.id, segment, differentialSegments, differentialsOpen, angle, models, variation, ecosystemRecipeId, ecosystemIds]);

  const selectRegularSegment = (id: string) => {
    setDifferentialSegments([]);
    setSegment(id);
  };
  const toggleDifferential = (id: string) => {
    if (!editorialIds.has(id) || !segments.some((item) => item.id === id)) return;
    const next = differentialSegments.includes(id)
      ? differentialSegments.filter((item) => item !== id)
      : [...differentialSegments, id];
    setDifferentialSegments(next);
    setSegment(next[0] ?? GLOBAL_SEGMENT);
  };

  // Se o público ativo deixa de existir (edição do kit), volta para o 360°.
  const activeSegment = segments.some((s) => s.id === segment) ? segment : GLOBAL_SEGMENT;
  const selectedDifferentials = useMemo(
    () => differentialSegments.filter((id) => segments.some((item) => item.id === id) && editorialIds.has(id)),
    [differentialSegments, segments, editorialIds],
  );
  const generationSegments = selectedDifferentials.length ? selectedDifferentials : [activeSegment];
  const generationKey = generationSegments.join("+");

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
      /** Insights de formatos: diálogo declarado pelo dono, entra literal na arte. */
      formatInsights: brand.format_insights,
      keywordMatrix: brand.keyword_matrix,
      reasoningMatrix: brand.reasoning_matrix,
    }),
    [brand.name, brand.niche, brand.tone, brand.description, brand.topics, brand.positioning, brand.brief_answers, brand.slogan, brand.format_insights, brand.keyword_matrix, brand.reasoning_matrix],
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

  /**
   * COBERTURA DOS NICHOS: memória por marca que distribui a atenção criativa da
   * Visão 360° entre todos os públicos e sub-nichos, em vez de repetir sempre os
   * mesmos dois ou três.
   */
  const segmentMemory = useSegmentMemory(brand.id);

  /**
   * APRENDIZADO DE TEXTO DA MARCA: cada frase que você reescreveu na arte
   * substitui a frase original em todas as gerações seguintes — o motor não
   * volta a oferecer o que você já corrigiu.
   */
  const protectedBrandLiterals = useMemo(() => {
    const full = brand.name.trim();
    const withoutBusinessSuffix = full.replace(/\b(?:fisioterapia|cl[ií]nica|studio|consult[oó]rio)\b.*$/i, "").trim();
    return [...new Set([full, withoutBusinessSuffix].filter((value) => value.length >= 3))];
  }, [brand.name]);
  const learning = useCopyLearning(brand.id, protectedBrandLiterals);
  /** Cadência da marca: frases aprovadas/editadas pelo dono + textos declarados. */
  const brandStyle = useMemo(
    () => learnStyle([...learning.voice, brand.description, brand.positioning, typeof brand.format_insights === "string" ? brand.format_insights : null]),
    [learning.voice, brand.description, brand.positioning, brand.format_insights],
  );
  const variationSamples = useMemo(() => {
    const first = (t?: string | null) => (t ?? "").match(/[^.!?\n]{12,140}[.!?]?/)?.[0]?.trim();
    return {
      headlines: first(brand.slogan) || first(brand.positioning),
      support: first(brand.description),
      actions: learning.voice.find((v) => v.length > 14 && v.length < 120),
    };
  }, [brand.slogan, brand.positioning, brand.description, learning.voice]);

  const baseContent = useMemo(() => {

    const built = buildSegmentContent({
      kit: contentKit,
      base: aliviaWorld ? WORLDS[aliviaWorld] : undefined,
      audiences,
      // Mundo oficial já embute o público; sub-nicho mantém o overlay próprio.
      // Mundo oficial já embute o público matriz; qualquer sub-nicho mantém o
      // overlay próprio (dores/desejos/soluções/CTA) por cima do mundo do pai.
      segment: activeSegment,
      angle,
      positioning: aliviaWorld ? null : brand.positioning,
      // Variedade linguística: cada lote reescreve a roupagem das frases.
      variationSeed: `${brand.id}:${seed}:${generationKey}:${angle}`,
      variationProfile: variation,
      segmentWeights: segmentMemory.weights,
    });

    /**
     * Passagem final pelo léxico: vale também para o acervo curado dos mundos
     * internos, então nenhuma marca fica presa às mesmas palavras.
     */
    return varyContent(built, {
      register,
      seed: `${brand.id}:${seed}:${generationKey}:${angle}`,
      forbidden: isAlivia ? [] : ["aliv.ia", "alivia", "fisioterap"],
      profile: variation,
      style: brandStyle,
    });
  }, [contentKit, aliviaWorld, subWorld, audiences, activeSegment, generationKey, angle, brand.positioning, brand.id, seed, register, isAlivia, variation, segmentMemory.weights, brandStyle]);

  /**
   * ACERVO JÁ CORRIGIDO: antes de qualquer sorteio, as frases que você
   * reescreveu na arte tomam o lugar das originais. Assim o ajuste vale para
   * sempre naquela marca, em vez de virar retrabalho a cada geração.
   */
  const learnedContent = useMemo(() => {
    const learned = applyLearnedCopy(baseContent, learning.rewrites, learning.vocabulary, {
      protectedLiterals: protectedBrandLiterals,
    });
    const globalAudience = activeSegment === GLOBAL_SEGMENT
      ? pickGlobalAudience({
          audiences,
          variationSeed: `${brand.id}:${seed}:${activeSegment}:${angle}`,
          segmentWeights: segmentMemory.weights,
        }) ?? undefined
      : undefined;
    return {
      ...learned,
      content: enforceSegmentAudienceScope(learned.content, activeSegment, audiences, globalAudience),
    };
  }, [baseContent, learning.rewrites, learning.vocabulary, protectedBrandLiterals, activeSegment, audiences, brand.id, seed, angle, segmentMemory.weights]);
  const ecosystemMode = isAlivia && models.includes("ecossistema");
  const content = useMemo(
    () => ecosystemMode
      ? withAliviaEcosystem(learnedContent.content, ecosystemRecipeId, ecosystemIds)
      : learnedContent.content,
    [learnedContent.content, ecosystemMode, ecosystemRecipeId, ecosystemIds],
  );

  /** Um acervo fechado por diferencial: combinar seleções distribui artes, não frases. */
  const differentialSources = useMemo(() => (ecosystemMode ? [] : selectedDifferentials).map((id) => {
    const parent = audienceAncestors(audiences, id).find((item) => isWorldId(item.id));
    const world = parent ? (parent.id as WorldId) : "pro";
    const sourceSeed = `${brand.id}:${seed}:${id}:${angle}`;
    const built = buildSegmentContent({
      kit: contentKit,
      base: WORLDS[world],
      audiences,
      segment: id,
      angle,
      positioning: null,
      variationSeed: sourceSeed,
      variationProfile: variation,
      segmentWeights: segmentMemory.weights,
    });
    const varied = varyContent(built, { register, seed: sourceSeed, forbidden: [], profile: variation, style: brandStyle });
    // O aprendizado geral da marca pode mencionar outro recurso. Diferenciais
    // são fechados: preservamos o texto do próprio pacote e recolocamos seus
    // termos canônicos depois da variação.
    const focused = enforceEditorialFocus(varied, resolveAudience(audiences, id));
    const officialPhotoIds = isAlivia
      ? officialPhotoIdsForDifferential(id as Parameters<typeof officialPhotoIdsForDifferential>[0])
      : undefined;
    return {
      id,
      content: {
        ...enforceSegmentAudienceScope(focused, id, audiences),
        officialPhotoIds,
      },
      relation: relationForSegment({
        kit: contentKit,
        audiences,
        segment: id,
        angle,
        positioning: brand.positioning,
        variationSeed: sourceSeed,
        segmentWeights: segmentMemory.weights,
      }),
    };
  }), [ecosystemMode, selectedDifferentials, audiences, brand.id, brand.positioning, seed, angle, contentKit, variation, segmentMemory.weights, register, learning.rewrites, learning.vocabulary, protectedBrandLiterals, brandStyle, isAlivia]);



  /**
   * Registra a cobertura: o público que este lote vestiu pesa menos no próximo
   * sorteio do 360°, então os nichos giram de verdade entre gerações.
   */
  useEffect(() => {
    if (selectedDifferentials.length) {
      selectedDifferentials.forEach(segmentMemory.record);
      return;
    }
    if (activeSegment !== GLOBAL_SEGMENT) {
      segmentMemory.record(activeSegment);
      return;
    }
    const picked = pickGlobalAudience({
      audiences,
      variationSeed: `${brand.id}:${seed}:${activeSegment}:${angle}`,
      segmentWeights: segmentMemory.weights,
    });
    if (picked) segmentMemory.record(picked.id);
  }, [activeSegment, selectedDifferentials, audiences, brand.id, seed, angle, segmentMemory]);


  const persona = useMemo(() => personaForSeed(`${brand.id}:${seed}`), [brand.id, seed]);

  /** Lockup da marca do cliente aplicado antes da renderização das artes. */
  const themeReady = useMemo(() => {
    applyStudioBrandTheme({
      name: brand.name,
      // Tom de voz é diretriz, não copy: o slogan sai da descrição/nicho.
      slogan: brandSlogan({ name: brand.name, niche: brand.niche, description: brand.description, slogan: brand.slogan }),
      logo: brand.logo_url,
      mark: brand.mark_url ?? null,
      handle: brand.instagram_handle ?? null,
      site: brand.source_url ?? null,
    });
    return `${brand.id}:${brand.name}:${brand.logo_url ?? ""}`;
  }, [brand.id, brand.name, brand.niche, brand.description, brand.slogan, brand.logo_url, brand.mark_url, brand.instagram_handle, brand.source_url]);


  /** Memória de frases da marca (na conta): frase recente perde vez no sorteio. */
  const phraseMemory = usePhraseMemory(brand.id);
  /**
   * A primeira pintura não pode usar um acervo ainda vazio. Fotos e memórias
   * chegam de forma assíncrona; mostrar a arte antes disso criava uma composição
   * provisória que só era revelada como diferente no primeiro clique de formato.
   */
  const batchInputsReady = !photosLoading && learning.ready && phraseMemory.ready;

  /**
   * Registro de cobertura DURANTE o lote: antes entrava como `() => {}`, então
   * a dívida editorial não mudava enquanto a versão era montada e duas artes
   * diferentes convergiam para o mesmo assunto.
   */
  const exposed = useRef<{ key: string; topics: Set<TopicId> }>({ key: "", topics: new Set() });
  const batchKey = `${brand.id}:${seed}:${generationKey}:${angle}`;
  if (exposed.current.key !== batchKey) exposed.current = { key: batchKey, topics: new Set() };
  phraseMemory.startBatch?.(batchKey);

  const picker = useMemo(
    () =>
      createPicker(
        buildCoverage(aliviaWorld ?? "pro", content, {}),
        (topics) => topics.forEach((t) => exposed.current.topics.add(t)),
        undefined,
        phraseMemory,
      ),
    [content, aliviaWorld, phraseMemory],
  );

  /**
   * ESCOLHAS IMUTÁVEIS DA LEVA.
   *
   * Os blocos chamam o picker durante a renderização. A memória anti-repetição
   * muda depois de cada escolha; portanto uma remontagem por formato poderia
   * escolher outra frase. O cache abaixo fixa o resultado de cada chamada por
   * arte e por identidade editorial, deixando o formato alterar apenas o quadro.
   */
  const pickerChoices = useRef<Map<string, unknown[]>>(new Map());
  const pickerForArt = useCallback(
    (artIdentity: string) => {
      let call = 0;
      return {
        pick: <T,>(
          items: readonly T[],
          count: number,
          rng: Parameters<typeof picker.pick<T>>[2],
          topicsOf: Parameters<typeof picker.pick<T>>[3],
        ): T[] => {
          const key = `${artIdentity}:pick:${call++}`;
          const cached = pickerChoices.current.get(key);
          if (cached) return cached as T[];
          const chosen = picker.pick(items, count, rng, topicsOf);
          pickerChoices.current.set(key, chosen as unknown[]);
          return chosen;
        },
      };
    },
    [picker],
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
        createRng(`${brand.id}:${seed}:${generationKey}:${angle}:layout`),
        persona,
        // Com modelos escolhidos, a linhagem de favoritos cede lugar à escolha.
        models.length > 0 ? undefined : lineage.blocks,
        content.carousels,
        activePhotos.length,
        kindsForModels(models, activePhotos.length, isAlivia),
        isAlivia,
        photoFirst,
        content,
      ),
    [brand.id, seed, generationKey, angle, persona, content, lineage, activePhotos.length, models, isAlivia, photoFirst],

  );

  /** DNA da marca (manual + briefing): matéria-prima do diretor criativo. */
  const dna = useMemo(
    () =>
      buildBrandDna({
        niche: brand.niche,
        tone: brand.tone,
        description: brand.description,
        positioning: brand.positioning,
        briefAnswers: brand.brief_answers,
      }),
    [brand.niche, brand.tone, brand.description, brand.positioning, brand.brief_answers],
  );

  /**
   * BRIEFING DE IA: a leitura em si é exclusiva do admin com o botão ligado —
   * mas o que ela aprendeu fica guardado na marca e continua valendo nas
   * gerações com a IA DESLIGADA, sem novo consumo.
   */
  const { brief, enabled: briefOn, canUse: canUseBrief, loading: briefLoading, toggle: toggleBrief, learned: briefLearned } = useBrandBrief({
    brandId: brand.id,
    kit: contentKit,
  });

  /**
   * Peso da memória da marca lido no momento da montagem, por referência: se o
   * diretor dependesse do objeto da memória, a gravação (2,5s depois) remontaria
   * o lote e trocaria o texto das artes já em tela.
   */
  const phraseWeight = useRef(phraseMemory.weightOf);
  phraseWeight.current = phraseMemory.weightOf;
  const weightOf = useCallback((signature: string) => phraseWeight.current(signature), []);

  /**
   * DIRETOR CRIATIVO: roteiro do lote (um eixo por arte) e reserva de texto —
   * nenhuma arte da mesma leva repete a frase de outra, e frase muito rodada na
   * marca entra com peso menor também entre lotes.
   */
  const directorRelation = useMemo(
    () =>
      relationForSegment({
        kit: contentKit,
        audiences,
        segment: activeSegment,
        angle,
        positioning: brand.positioning,
        variationSeed: `${brand.id}:${seed}:${activeSegment}:${angle}`,
        segmentWeights: segmentMemory.weights,
      }),
    [contentKit, audiences, activeSegment, angle, brand.positioning, brand.id, seed, segmentMemory.weights],
  );

  const draftDirector = useMemo(
    () => differentialSources.length > 0
      ? planMultiSegmentBatch({
        sources: differentialSources,
        count: composedBlocks.length,
        blocks: composedBlocks,
        seed: `${brand.id}:${seed}:${generationKey}:${angle}`,
        dna,
        brief: brief ?? undefined,
        weightOf,
        learnedVoice: [...learning.voice, ...formatInsightWords(readFormatInsights(brand.format_insights))],
        domain: [brand.niche, brand.description, brand.positioning].filter(Boolean).join(" · "),
        brandName: brand.name,
      })
      : planBatch({
        content,
        count: composedBlocks.length,
        blocks: composedBlocks,
        seed: `${brand.id}:${seed}:${generationKey}:${angle}`,
        relation: directorRelation,
        dna,
        brief: brief ?? undefined,
        weightOf,
        /**
         * A voz que o diretor persegue soma os ajustes que o dono já fez na arte
         * com as palavras dos INSIGHTS DE FORMATOS — assim o diálogo declarado
         * atrai as escolhas do lote, além de já estar no topo dos acervos.
         */
        learnedVoice: [...learning.voice, ...formatInsightWords(readFormatInsights(brand.format_insights))],
        domain: [brand.niche, brand.description, brand.positioning].filter(Boolean).join(" · "),
        brandName: brand.name,
      }),
    [content, differentialSources, composedBlocks, brand.id, brand.format_insights, seed, generationKey, angle, directorRelation, dna, brief, weightOf, learning.voice],

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
    const ecosystem = ecosystemMode ? buildAliviaEcosystem(ecosystemRecipeId, ecosystemIds) : null;
    const audience = ecosystem ? null : activeSegment === GLOBAL_SEGMENT ? null : resolveAudience(audiences, activeSegment);
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
      segmentWeights: segmentMemory.weights,
    });
    return {
      content,
      audienceLabel: ecosystem?.audience ?? audience?.label ?? (activeSegment === GLOBAL_SEGMENT ? "assunto livre da marca (360°)" : activeSegment),
      keyword: ecosystem?.title ?? keyword,
      hook: ecosystem?.promise ?? hook,
      cta: ecosystem?.cta ?? cta,
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
    segmentMemory.weights,
    ecosystemMode,
    ecosystemRecipeId,
    ecosystemIds,
  ]);



  const rationaleContextFor = useCallback((index: number): RationaleContext => {
    const id = draftDirector.segmentFor?.(index);
    const source = id ? differentialSources.find((item) => item.id === id) : undefined;
    const audience = id ? resolveAudience(audiences, id) : undefined;
    if (!source || !audience) return rationaleCtx;
    return {
      ...rationaleCtx,
      content: source.content,
      audienceLabel: audience.label,
      keyword: audienceKeyword(audience),
      hook: audienceHook(audience),
      cta: audience.cta ?? rationaleCtx.cta,
      relation: { pain: source.relation.pain, desire: source.relation.desire, axis: source.relation.axis },
    };
  }, [draftDirector, differentialSources, audiences, rationaleCtx]);

  const audit = useMemo(
    () => enforceRationale(composedBlocks, rationaleContextFor, (index) => draftDirector.copyOf(index)),
    [composedBlocks, rationaleContextFor, draftDirector],
  );
  const blocks = audit.blocks;

  /**
   * Se o filtro desfizer um carrossel, cada slide passa a ser uma arte avulsa.
   * Essas novas artes precisam de direção própria: reutilizar a direção antiga
   * fazia todos os slides convertidos herdarem o mesmo título, exatamente como
   * no vídeo em que “Fisioterapia em domicílio...” apareceu várias vezes.
   */
  const director = useMemo(
    () =>
      audit.fixed === 0
        ? draftDirector
        : differentialSources.length > 0
          ? planMultiSegmentBatch({
              sources: differentialSources,
              count: blocks.length,
              blocks,
              seed: `${brand.id}:${seed}:${generationKey}:${angle}:after-rationale`,
              dna,
              brief: brief ?? undefined,
              weightOf,
              learnedVoice: [...learning.voice, ...formatInsightWords(readFormatInsights(brand.format_insights))],
              domain: [brand.niche, brand.description, brand.positioning].filter(Boolean).join(" · "),
              brandName: brand.name,
            })
          : planBatch({
            content,
            count: blocks.length,
            blocks,
            seed: `${brand.id}:${seed}:${generationKey}:${angle}:after-rationale`,
            relation: directorRelation,
            dna,
            brief: brief ?? undefined,
            weightOf,
            learnedVoice: [...learning.voice, ...formatInsightWords(readFormatInsights(brand.format_insights))],
            domain: [brand.niche, brand.description, brand.positioning].filter(Boolean).join(" · "),
            brandName: brand.name,
          }),
    [audit.fixed, draftDirector, content, differentialSources, blocks, brand.id, brand.format_insights, seed, generationKey, angle, directorRelation, dna, brief, weightOf, learning.voice],
  );

  /**
   * MEMÓRIA ENTRE LOTES: o que o diretor reservou é o que vai ao ar, então é
   * isso que fica registrado na marca. Sem este registro, a próxima geração
   * tornava a oferecer as mesmas frases com peso cheio.
   */
  useEffect(() => {
    if (!batchInputsReady) return;
    const signatures = director.shots.flatMap((shot) => [
      ...shot.copy.map((line) => phraseSignature(line)),
      ...(shot.reserved.carousels ?? []).map((carousel) => phraseSignature(carousel.id ?? carousel)),
      ...(shot.routeSignature ? [phraseSignature(shot.routeSignature)] : []),
    ]);
    if (signatures.length > 0) phraseMemory.record(signatures);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchInputsReady, director]);

  /**
   * COLETA DE RESULTADOS: cada geração deixa uma medida simples (quantas artes,
   * quantas frases distintas, quantas repetidas, IA ligada ou não e quantas
   * correções aprendidas foram aplicadas). É esse histórico que mostra se o
   * motor está melhorando de verdade a cada ajuste.
   */
  const loggedRun = useRef<string>("");
  useEffect(() => {
    if (blocks.length === 0 || loggedRun.current === batchKey) return;
    loggedRun.current = batchKey;
    const stats = director.report();
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      await supabase.from("studio_director_runs").upsert(
        {
          user_id: auth.user.id,
          brand_id: brand.id,
          batch_key: batchKey,
          ai_on: briefOn,
          arts: stats.arts,
          distinct_copy: stats.distinct,
          repeated_copy: stats.repeated,
          learned_applied: learnedContent.applied,
        },
        { onConflict: "brand_id,batch_key" },
      );
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchKey, blocks.length]);

  /** Índice da arte com a leitura de sentido aberta. */
  const [whyOpen, setWhyOpen] = useState<number | null>(null);
  /**
   * AJUSTE FINO NO CARD: quando o filtro aponta que falta mensagem, o dono da
   * marca reescreve o texto na própria arte e reenvia para aprovação. Os textos
   * editados ficam guardados por posição e são reaplicados a cada re-render, de
   * modo que o PNG exportado e a arte salva saem já corrigidos.
   */
  const [edits, setEdits] = useState<Record<number, ArtTextEdits>>(() => readPersistedEdits(brand.id, seed));
  const editsRef = useRef<Record<number, ArtTextEdits>>(edits);
  const [editing, setEditing] = useState<number | null>(null);
  /** Troca de imagem por arte (posição da foto -> imagem). Zera a cada nova versão. */
  const [photoSwaps, setPhotoSwaps] = useState<ArtPhotoSwaps>({});
  const [imageInsertions, setImageInsertions] = useState<ArtImageInsertions>({});
  const [swapTarget, setSwapTarget] = useState<{ index: number; slots: number } | null>(null);
  useEffect(() => { setPhotoSwaps({}); setImageInsertions({}); }, [brand.id, seed]);
  useEffect(() => {
    Object.entries(photoSwaps).forEach(([i, m]) =>
      applyArtPhotoSwaps(document.getElementById(`studio-pro-block-${i}`), m),
    );
    blocks.forEach((_, i) => applyInsertedArtImage(artNode(i), imageInsertions[i]));
  }, [blocks, photoSwaps, imageInsertions]);
  const openPhotoSwap = (index: number) => {
    const slots = artPhotoSlots(document.getElementById(`studio-pro-block-${index}`)).length;
    setSwapTarget({ index, slots });
  };
  const swapPhotos = useMemo(() => {
    if (!swapTarget) return photos;
    const artContent = director.contentFor(swapTarget.index);
    return rankPhotosForSwap(photos, { officialPhotoIds: artContent.officialPhotoIds });
  }, [director, photos, swapTarget]);
  /**
   * MOVER TEXTO: modo separado da edição de palavras. Ligado, cada frase da arte
   * ganha uma alça redonda — só por ela o texto se move, para ninguém arrastar
   * uma frase sem querer ao rolar a página ou tocar na arte no celular.
   */
  const [moving, setMoving] = useState<number | null>(null);
  const [moveTick, setMoveTick] = useState(0);
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


  useEffect(() => {
    const restoredEdits = readPersistedEdits(brand.id, seed);
    editsRef.current = restoredEdits;
    setEdits(restoredEdits);
  }, [brand.id, seed]);

  useEffect(() => {
    editsRef.current = edits;
    writePersistedEdits(brand.id, seed, edits);
  }, [brand.id, seed, edits]);

  /** Reaplica o rascunho após TODO render: nenhum polling/toggle devolve o texto original. */
  useLayoutEffect(() => {
    Object.entries(editsRef.current).forEach(([key, value]) => {
      const node = artNode(Number(key));
      if (node) applyArtText(node, value);
    });
    blocks.forEach((_, i) => {
      const node = artNode(i);
      if (node) {
        applyArtTextSizes(node);
        applyArtMoves(node);
      }
    });
  });

  useEffect(() => {
    void learning.learn([
      { original: "prazo", edited: "tempo" },
      { original: "execução medida", edited: "execução baseada em métricas" },
    ]);
    // Uma vez por marca; `learn` ignora preferências já existentes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brand.id]);

  /** Liga/desliga o arraste por alça na arte selecionada. */
  const startMove = (indexes: number[]) => {
    setEditing(null);
    indexes.forEach((i) => {
      const node = artNode(i);
      if (node) setArtEditing(node, false);
    });
    setMoving(indexes[0]);
    indexes.forEach((i) => {
      const node = artNode(i);
      if (node) setArtMoving(node, true);
    });
  };

  const finishMove = (indexes: number[]) => {
    let learnedAny = false;
    indexes.forEach((i) => {
      const node = artNode(i);
      if (!node) return;
      // O motor aprende com o ajuste antes de fechar o modo de arraste.
      if (learnArtMoves(node).length) learnedAny = true;
      setArtMoving(node, false);
    });
    if (learnedAny) {
      /* O aprendizado altera o ponto estrutural do modelo. Remontar agora faz a
         posição escolhida aparecer imediatamente, sem o texto voltar ao lugar
         antigo entre o clique e a próxima geração/troca de formato. */
      setResetTick((n) => n + 1);
      toast.success("Posição fixada — o motor vai usar esse ponto nas próximas artes.");
    }
    setMoving(null);
    setMoveTick((n) => n + 1);
    // A arte mudou de posição: um salvamento anterior não representa mais a tela.
    setSaved((prev) => {
      const copy = new Set(prev);
      indexes.forEach((i) => copy.delete(i));
      return copy;
    });
  };

  const resetMove = (indexes: number[]) => {
    indexes.forEach((i) => {
      const node = artNode(i);
      if (!node) return;
      clearArtMoves(node);
      forgetArtLearning(node);
      setArtMoving(node, false);
    });
    setMoving(null);
    setMoveTick((n) => n + 1);
    toast.success("Textos voltaram para a posição original (aprendizado apagado).");
  };


  /**
   * Texto da arte no momento em que a edição começou: é a base da comparação
   * que transforma o seu ajuste em aprendizado da marca.
   */
  const textBeforeEdit = useRef<Record<number, ArtTextEdits>>({});
  /** Estado visual exato usado por Cancelar, incluindo os tamanhos manuais. */
  const editBefore = useRef<Record<number, ArtTextEditSnapshot>>({});

  /** Liga a edição direta somente na arte selecionada. */
  const startEdit = (indexes: number[]) => {
    setWhyOpen(indexes[0]);
    setMoving(null);
    indexes.forEach((i) => {
      const node = artNode(i);
      if (node) setArtMoving(node, false);
    });
    setEditing(indexes[0]);
    indexes.forEach((i) => {
      const node = artNode(i);
      if (!node) return;
      textBeforeEdit.current[i] = readArtText(node);
      editBefore.current[i] = captureArtTextEditSnapshot(node);
      setArtEditing(node, true, (draft) => {
        const next = { ...editsRef.current, [i]: draft };
        editsRef.current = next;
        writePersistedEdits(brand.id, seed, next);
      });
    });
  };


  const cancelEdit = (indexes: number[]) => {
    const restoredDrafts = { ...editsRef.current };
    indexes.forEach((i) => {
      const node = artNode(i);
      if (!node) return;
      setArtEditing(node, false);
      const snapshot = editBefore.current[i];
      if (snapshot) {
        restoreArtTextEditSnapshot(node, snapshot);
        restoredDrafts[i] = snapshot.text;
      }
    });
    editsRef.current = restoredDrafts;
    setEdits(restoredDrafts);
    writePersistedEdits(brand.id, seed, restoredDrafts);
    setEditing(null);
    // Remonta a arte: digitar em contentEditable troca os nós de texto e o
    // React não pode reaproveitá-los na próxima atualização (erro ao salvar).
    setResetTick((n) => n + 1);
  };

  /** Fecha a edição validando a mensagem antes de reenviar a arte para aprovação. */
  const finishEdit = (indexes: number[]) => {
    const collected: Record<number, ArtTextEdits> = {};
    for (const i of indexes) {
      const node = artNode(i);
      if (!node) continue;
      const next = readArtText(node);
      const texts = Object.values(next);
      // Campo esvaziado é decisão de layout: aquele trecho sai da arte.
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
    const committed = { ...editsRef.current, ...collected };
    editsRef.current = committed;
    setEdits(committed);
    writePersistedEdits(brand.id, seed, committed);
    /**
     * APRENDIZADO: a frase que você escreveu passa a substituir a frase antiga
     * nas próximas gerações desta marca — o motor não volta a oferecê-la.
     */
    const lessons = Object.entries(collected).flatMap(([key, next]) =>
      diffArtText(textBeforeEdit.current[Number(key)], next),
    );
    indexes.forEach((i) => {
      delete editBefore.current[i];
      delete textBeforeEdit.current[i];
    });
    if (lessons.length > 0) void learning.learn(lessons);
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
    // Remonta a arte com o texto ajustado reaplicado: sem isso o React tenta
    // reaproveitar nós de texto que a digitação já substituiu e o salvamento
    // falha ("o objeto não pode ser encontrado aqui").
    setResetTick((n) => n + 1);
    toast.success(
      lessons.length > 0
        ? "Arte ajustada. O motor guardou sua correção para as próximas gerações."
        : "Arte ajustada e reenviada para aprovação.",
    );

  };

  /** Volta ao texto original gerado pelo motor. */
  const resetEdit = (indexes: number[]) => {
    setEdits((prev) => {
      const copy = { ...prev };
      indexes.forEach((i) => delete copy[i]);
      editsRef.current = copy;
      writePersistedEdits(brand.id, seed, copy);
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
      if (node) {
        setArtEditing(node, false);
        clearArtTextSizes(node);
      }
      delete editBefore.current[i];
      delete textBeforeEdit.current[i];
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
      // PNG mestre guardado na conta: 2160px, com a proporção exata do quadro.
      try {
        const ratio = publicationPixelRatio(rect.width, rect.height);
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
    const { data: inserted, error } = await supabase.from("studio_creations").insert({
      user_id: auth.user.id,
      brand_id: brand.id,
      seed: `${seed}${side}:${index}`,
      block_kind: kind,
      format,
      headline: headlineOf(index) || null,
      caption,
      thumb,
      png_path: pngPath,
      // Receita unitária; slides mantêm group/index/total dentro do próprio bloco.
      composition: JSON.parse(JSON.stringify([blocks[index]])),
      /** Texto exato exibido na arte: é o que a edição pela galeria reabre. */
      text_edits: { 0: node ? readArtText(node) : {} },
      snapshot,


      segment: director.segmentFor?.(index) ?? activeSegment,
      angle,
      folder: folder === "Todas" ? "Geral" : folder,
      watermarked: watermark,
    }).select("id").single();
    // Preset do Feed Principal: a arte salva entra direto no calendário, no pilar certo.
    let feedNote = "";
    const feedPillar = isFeedPreset(models) ? pillarOfKind(kind) : null;
    if (!error && inserted?.id && feedPillar) {
      const { error: calErr } = await supabase.from("studio_feed_calendar").insert({
        brand_id: brand.id,
        user_id: auth.user.id,
        kind: "art",
        creation_id: inserted.id,
        pillar: feedPillar,
      });
      if (calErr) console.warn("[studio-pro] feed calendar", calErr);
      else feedNote = ` · no calendário (${pillarLabel(feedPillar)})`;
    }
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
      feedNote ? { description: `Entrou no calendário de postagens${feedNote}` } : undefined,
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

  /** Baixa as legendas da versão inteira em um .txt. */
  const downloadCaptions = () => {
    const text = blocks
      .map(({ kind }, i) => {
        // Mesma regra do card: legenda escrita a partir do texto dirigido.
        const caption = buildCaption(
          director.contentFor(i),
          kind,
          createRng(`${brand.id}:${seed}:caption:${kind}:${i}`),
        );
        return `# ${String(i + 1).padStart(2, "0")} · ${kind}\n${caption}`;
      })
      .join("\n\n---\n\n");
    void exportTextFile(text, `${brand.name.replace(/\s+/g, "-").toLowerCase()}-${seed}-legendas.txt`);
  };


  return (
    <section ref={topRef} className="mt-5 rounded-3xl border border-border bg-card p-5">
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
          {showWelcomeBatch && (
            <div className="mt-2 rounded-2xl border border-primary/30 bg-primary/10 p-3">
              <p className="text-xs font-semibold text-foreground">
                <Gift className="mr-1 inline h-3.5 w-3.5" />
                Este primeiro lote é por nossa conta
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ele saiu da sua marca sem consumir nenhuma geração. Explore à vontade: trocar público,
                objetivo, modelo de post e formato é sempre livre. Só o botão “Nova versão” usa 1 geração.
              </p>
              {!!quota && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Depois deste lote você tem{" "}
                  <span className="font-semibold text-foreground">
                    {quota.allowance} {quota.allowance === 1 ? "geração" : "gerações"}
                  </span>{" "}
                  neste período — cada clique em “Nova versão” desconta 1. Salvar e baixar não custam nada.
                </p>
              )}
            </div>
          )}
          {blocked && (
            <div className="mt-2 rounded-2xl border border-primary/40 bg-primary/10 p-3">
              <p className="text-xs font-semibold text-foreground">
                <Sparkles className="mr-1 inline h-3.5 w-3.5" />
                Suas gerações deste período acabaram
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                As artes já geradas continuam suas: navegue públicos, objetivos, modelos e formatos, salve e
                baixe sem custo. Para criar versões novas, escolha um plano.
              </p>
              <Button asChild size="sm" className="mt-2 rounded-full">
                <Link to={`${PRODUCT.base}#planos`}>Ver planos</Link>
              </Button>
            </div>
          )}



          {/* Públicos da marca + grupos editoriais especializados. */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {segmentGroups.regular.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={!selectedDifferentials.length && activeSegment === s.id ? "secondary" : "ghost"}
                className="h-7 rounded-full text-[11px]"
                title={
                  s.id === GLOBAL_SEGMENT
                    ? "Assunto livre: cada lote fala da marca como um todo ou de um público relevante, sorteado"
                    : undefined
                }
                onClick={() => selectRegularSegment(s.id)}
              >
                {s.label}
              </Button>
            ))}
          </div>
          {segmentGroups.grouped.map(([group, items]) => {
            const panelId = `studio-editorial-${slugifySegment(group)}`;
            const chosen = items.filter((item) => selectedDifferentials.includes(item.id)).length;
            return (
            <div key={group} className="mt-2 border-l-2 border-primary/35 pl-2.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="mb-1 h-7 w-full justify-between px-1 text-[10px] font-semibold uppercase text-muted-foreground"
                aria-expanded={differentialsOpen}
                aria-controls={panelId}
                onClick={() => setDifferentialsOpen((open) => !open)}
              >
                <span>{group} <span className="normal-case font-normal">· {chosen ? `${chosen} selecionado${chosen > 1 ? "s" : ""}` : "escolha um ou mais"}</span></span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${differentialsOpen ? "rotate-180" : ""}`} />
              </Button>
              {differentialsOpen && (
                <div id={panelId} className="flex flex-wrap gap-1.5">
                  {items.map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant={selectedDifferentials.includes(s.id) ? "secondary" : "ghost"}
                      className="h-7 rounded-full text-[11px]"
                      onClick={() => toggleDifferential(s.id)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            );
          })}
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
          {segments.length === 1 && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Cadastre os públicos da marca em Ajustes para gerar conteúdo por nicho.
            </p>
          )}
          {/* Camada 2 — direção criativa (modelos e cadeias). */}
          <button
            type="button"
            onClick={() => setDirectionOpen((v) => !v)}
            aria-expanded={directionOpen}
            className="mt-3 flex w-full items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2 text-left text-[11px] font-semibold text-foreground"
          >
            <span>Direção criativa <span className="font-normal text-muted-foreground">· modelos: {models.length === 0 ? "aleatório" : models.length}{ecosystemMode ? " · ecossistema" : ""}</span></span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${directionOpen ? "rotate-180" : ""}`} />
          </button>
          {directionOpen && <div className="pl-1">
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
                  <Button
                    size="sm"
                    variant={isFeedPreset(models) ? "default" : "outline"}
                    className="h-7 rounded-full text-[11px]"
                    title="5 pilares do feed: dor do nicho, software na prática, clean, solução completa e educativo. Artes salvas entram no calendário."
                    onClick={() => setModels([...FEED_PRESET_MODELS])}
                  >
                    ★ Feed principal
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
            {ecosystemMode && (
              <div className="mt-3 border-l-2 border-primary/35 pl-3">
                <p className="text-[10px] font-semibold uppercase text-muted-foreground">Cadeia de funcionalidades</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {ALIVIA_ECOSYSTEM_RECIPES.map((recipe) => (
                    <Button
                      key={recipe.id}
                      type="button"
                      size="sm"
                      variant={ecosystemRecipeId === recipe.id ? "secondary" : "outline"}
                      className="h-7 rounded-full text-[11px]"
                      onClick={() => chooseEcosystemRecipe(recipe.id)}
                    >
                      {recipe.label}
                    </Button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Escolha de 3 a 5 funcionalidades. A leva traz seis argumentos visuais e um carrossel completo; use as setas para definir a ordem da jornada.
                </p>
                <div className="mt-2 space-y-1.5">
                  {ecosystemIds.map((id, index) => {
                    const differential = ALIVIA_DIFFERENTIALS.find((item) => item.id === id);
                    if (!differential) return null;
                    return (
                      <div key={id} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5">
                        <span className="w-5 text-[10px] font-bold text-primary">{index + 1}</span>
                        <span className="min-w-0 flex-1 text-[11px] font-medium text-foreground">{differential.label}</span>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" disabled={index === 0} onClick={() => moveEcosystemStep(index, -1)} title="Mover para cima">
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-6 w-6" disabled={index === ecosystemIds.length - 1} onClick={() => moveEcosystemStep(index, 1)} title="Mover para baixo">
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {ALIVIA_DIFFERENTIALS.filter((item) => !ecosystemIds.includes(item.id)).map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-full text-[10px]"
                      disabled={ecosystemIds.length >= 5}
                      onClick={() => toggleEcosystemStep(item.id)}
                    >
                      + {item.label}
                    </Button>
                  ))}
                  {ecosystemIds.length > 3 && ecosystemIds.map((id) => {
                    const item = ALIVIA_DIFFERENTIALS.find((entry) => entry.id === id);
                    return item ? (
                      <Button key={`remove-${id}`} type="button" size="sm" variant="ghost" className="h-7 rounded-full text-[10px] text-muted-foreground" onClick={() => toggleEcosystemStep(id)}>
                        − {item.label}
                      </Button>
                    ) : null;
                  })}
                </div>
              </div>
            )}
          </div>
          </div>}
          {/* Camada 3 — avançado (escrita, IA do kit, aprendizado). */}
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
            className="mt-2 flex w-full items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2 text-left text-[11px] font-semibold text-foreground"
          >
            <span>Avançado <span className="font-normal text-muted-foreground">· escrita {(variation.naturalness ?? "natural") === "natural" ? "natural" : (variation.naturalness === "balanced" ? "equilibrada" : "expressiva")}</span></span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
          </button>
          {advancedOpen && <div className="pl-1">
          <VariationControl
            value={variation}
            onChange={setVariation}
            register={register}
            previewSeed={`${brand.id}:${seed}`}
            samples={variationSamples}
            style={brandStyle}
          />
          {/*
            LEITURA DE IA DO KIT (só conta admin). Desligado, o diretor criativo
            trabalha 100% local e sem consumo de crédito — o padrão de todos.
          */}
          {canUseBrief && (
            <div className="mt-2">
              <button
                type="button"
                onClick={toggleBrief}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground underline-offset-2 hover:underline"
              >
                <Sparkles className="h-3 w-3" />
                Direção com IA: {briefOn ? (briefLoading ? "lendo o kit…" : "ligada") : "desligada"}
              </button>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {briefLearned
                  ? "Leitura do kit guardada: continua valendo com a IA desligada."
                  : "Ligue uma vez para a IA ler o kit; o aprendizado fica guardado na marca."}
                {learning.count > 0 ? ` ${learning.count} correção(ões) de texto aprendidas.` : ""}
              </p>
            </div>
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

          </div>}
          {/* Acervo privado de fotos: envio, enquadramento e fixação. */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
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
            {photos.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant={photoFirst ? "secondary" : "outline"}
                className="h-8 rounded-full text-xs"
                onClick={() => setPhotoFirst((v) => !v)}
              >
                <Camera className="mr-1.5 h-3.5 w-3.5" />
                Fotos do acervo em destaque
              </Button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {photos.length === 0
              ? "Nenhuma foto nesta marca — clique para enviar as suas."
              : `${uploadedPhotosTotal} foto(s) enviada(s) nesta marca${officialPhotosTotal > 0 ? ` + ${officialPhotosTotal} oficiais` : ""}${photoLimit > 0 ? ` · ${photosTotal} de ${photoLimit} no plano` : ""}${pinnedPhotos.length > 0 ? ` · ${pinnedPhotos.length} fixada(s) para a próxima geração` : " · fixe uma foto ali para usá-la obrigatoriamente"}.`}
            {photos.length > 0 &&
              (photoFirst
                ? " Filtro ligado: metade das artes deste lote usa foto do acervo como plano de fundo."
                : " Ligue o filtro para forçar metade das artes com foto de fundo.")}
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
        {!batchInputsReady ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparando suas artes…
          </div>
        ) : groups.map((group) => {
          const first = group.items[0];
          const indexes = group.items.map((item) => item.index);
          // A legenda nasce do MESMO texto que o diretor escreveu para a arte.
          // Antes ela sorteava do acervo inteiro e podia falar de outro público,
          // outra dor e outra oferta do que está escrito na imagem.
          const caption = buildCaption(
            director.contentFor(first.index),
            first.block.kind,
            createRng(`${brand.id}:${seed}:caption:${first.block.kind}:${first.index}`),
          );
          const isSaved = group.carousel
            ? indexes.every((i) => saved.has(i))
            : saved.has(first.index);
          /**
           * Chave da proporção: no formato "Livre" o motor sorteia a proporção
           * da arte. Todos os slides de um carrossel usam a MESMA chave, então
           * a sequência sai com proporção única (exigência do Instagram).
           */
          const frameKey = `${brand.id}:${seed}:${first.block.kind}:${first.index}`;
          const art = (item: { block: ComposedBlock; index: number }) => {
            const { kind, treatment, motion, slide } = item.block;
            const Block = STUDIO_BLOCKS[kind];
            return (
              <div
                className={`overflow-hidden rounded-2xl border border-border bg-background ${
                  group.carousel ? "shrink-0 snap-center" : "mx-auto"
                }`}
                style={frameStyle(format, frameKey)}
              >

                {/* Lado B aplica os tokens invertidos só nesta arte. */}
                <div
                  id={`studio-pro-block-${item.index}`}
                  /* Identidade editorial: impede que um ajuste manual de outra
                     geração caia nesta arte só por ocupar a mesma posição. */
                  data-studio-art-key={`${brand.id}:${seed}:${kind}:${item.index}`}
                  className="h-full w-full bg-background"
                  style={flipped.has(item.index) ? invertedStyle : undefined}
                >

                  {/* Congelada por chave: o texto ajustado à mão nunca é reconciliado. */}
                  <FrozenArt
                    key={`${brand.id}:${seed}:${format}:${kind}:${item.index}:${resetTick}:${signatureOn ? 1 : 0}`}
                  >
                  <ArtworkGuard brand={brand.name}>
                  {/* AutoFit: copy longa encolhe para caber; nunca sai cortada. */}
                  <AutoFit resetKey={`${brand.id}:${seed}:${format}:${frameKey}:${kind}:${item.index}`}>
                  <StudioProSignature
                    artKey={`${brand.id}:${seed}:${kind}:${item.index}`}
                    enabled={signatureOn}
                    brandName={brand.name}
                  >
                    <StudioMotion kind={motion}>
                      <Block
                        content={director.contentFor(item.index)}
                        shot={director.shotFor(item.index)}
                        rng={createRng(`${brand.id}:${seed}:${kind}:${item.index}`)}
                        treatment={treatment}
                        format={format}
                        picker={pickerForArt(`${brand.id}:${seed}:${generationKey}:${angle}:${kind}:${item.index}`)}
                        persona={persona}
                        slide={slide}
                        photos={curatePhotosForContent(activePhotos, director.contentFor(item.index))}
                        artKey={`${brand.id}:${seed}|${kind}:${item.index}`}

                      />
                    </StudioMotion>
                  </StudioProSignature>
                  </AutoFit>
                  </ArtworkGuard>
                  </FrozenArt>
                </div>
              </div>
            );
          };

          /**
           * Carrosséis são apenas uma sequência visual: cada slide percorre o
           * mesmo fluxo confiável de uma arte avulsa, sem captura em lote.
           */
          const slideActions = (item: { block: ComposedBlock; index: number }) => {
            const slideIndexes = [item.index];
            const slideSaved = saved.has(item.index);
            const isEditing = editing === item.index;
            return (
              <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `png-${item.index}`}
                  onClick={() => void download(item.index, item.block.kind)}
                >
                  {busy === `png-${item.index}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  PNG
                </Button>
                <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => copyCaption(caption)}>
                  <Type className="mr-1.5 h-3.5 w-3.5" />
                  Legenda
                </Button>
                <Button
                  size="sm"
                  variant={flipped.has(item.index) ? "secondary" : "outline"}
                  className="h-8 rounded-full text-xs"
                  onClick={() => toggleFlip(slideIndexes)}
                >
                  <Contrast className="mr-1.5 h-3.5 w-3.5" />
                  {flipped.has(item.index) ? "Lado B" : "Inverter cores"}
                </Button>
                {isEditing ? (
                  <>
                    <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => finishEdit(slideIndexes)}>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Concluir
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => cancelEdit(slideIndexes)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => startEdit(slideIndexes)}>
                    <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                    Ajustar texto
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => openPhotoSwap(item.index)}>
                  <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                  Imagem
                </Button>
                {/* MOVER TEXTO: arraste só pela alça de cada frase. */}
                {moving === item.index ? (
                  <>
                    <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => finishMove(slideIndexes)}>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Fixar posição
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-full text-xs"
                      onClick={() => resetMove(slideIndexes)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Posição original
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full text-xs"
                    onClick={() => startMove(slideIndexes)}
                  >
                    <Move className="mr-1.5 h-3.5 w-3.5" />
                    Mover texto
                  </Button>
                )}
                {hasArtEdits(edits[item.index]) && (
                  <Button size="sm" variant="ghost" className="h-8 rounded-full text-xs" onClick={() => resetEdit(slideIndexes)}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Desfazer
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={slideSaved ? "secondary" : "default"}
                  className="h-8 rounded-full text-xs"
                  disabled={slideSaved || busy === `save-${item.index}`}
                  onClick={() => void save(item.index, item.block.kind, caption)}
                >
                  {busy === `save-${item.index}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {slideSaved ? "Salvo" : "Salvar na marca"}
                </Button>
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
                      <div key={item.index} className="w-[min(480px,88vw)] shrink-0 snap-center">
                        {art(item)}
                        {slideActions(item)}
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                art(first)
              )}

              {!group.carousel && <div className="mx-auto mt-2 flex flex-wrap items-center justify-center gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={busy === `png-${first.index}`}
                  onClick={() => void download(first.index, first.block.kind)}
                >
                  {busy === `png-${first.index}` ? (
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
                <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={() => openPhotoSwap(first.index)}>
                  <ImagePlus className="mr-1.5 h-3.5 w-3.5" />
                  Imagem
                </Button>
                {/* MOVER TEXTO: arraste só pela alça de cada frase. */}
                {moving === first.index ? (
                  <>
                    <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => finishMove(indexes)}>
                      <Check className="mr-1.5 h-3.5 w-3.5" />
                      Fixar posição
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-full text-xs"
                      onClick={() => resetMove(indexes)}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Posição original
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-full text-xs"
                    onClick={() => startMove(indexes)}
                  >
                    <Move className="mr-1.5 h-3.5 w-3.5" />
                    Mover texto
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
                  onClick={() => void save(first.index, first.block.kind, caption)}
                >
                  {busy === `save-${first.index}` ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {isSaved ? "Salvo" : "Salvar na marca"}
                </Button>
              </div>}

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

      {/* NOVA VERSÃO NO FIM DO LOTE: quem revisou até aqui não precisa voltar ao
          topo para renovar — o clique já sobe a página e troca as artes. */}
      <div className="mt-6 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          Chegou ao fim do lote? Renove as artes sem voltar ao topo.
        </p>
        <Button
          size="sm"
          className="rounded-full"
          disabled={busy === "quota" || blocked}
          onClick={() => void newVersionFromBottom()}
        >
          {busy === "quota" ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          )}
          Nova versão
        </Button>
      </div>


      <ArtPhotoSwapDialog
        open={swapTarget !== null}
        onOpenChange={(v) => !v && setSwapTarget(null)}
        slotCount={swapTarget?.slots ?? 0}
        photos={swapPhotos as SwapPhoto[]}
        allowDevice={canUseBrief}
        hasInsertion={swapTarget ? Boolean(imageInsertions[swapTarget.index]) : false}
        onRemoveInsertion={() => {
          if (!swapTarget) return;
          const i = swapTarget.index;
          setImageInsertions((prev) => {
            const next = { ...prev };
            delete next[i];
            return next;
          });
          applyInsertedArtImage(artNode(i));
          setSaved((prev) => { const next = new Set(prev); next.delete(i); return next; });
        }}
        onPick={(slot, photo, mode) => {
          if (!swapTarget) return;
          const i = swapTarget.index;
          if (mode === "replace") {
            setPhotoSwaps((prev) => ({ ...prev, [i]: { ...(prev[i] ?? {}), [slot]: photo } }));
          } else {
            const insertedMode: InsertedImageMode = mode;
            setImageInsertions((prev) => ({
              ...prev,
              [i]: { photo, mode: insertedMode, x: 0.52, y: 0.52, width: 0.42 },
            }));
          }
          setSaved((prev) => { const next = new Set(prev); next.delete(i); return next; });
        }}
      />
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
