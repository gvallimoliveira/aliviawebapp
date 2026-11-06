import type { TopicId } from "../topics";
import type { StudioHook } from "../hooks";
import type { ImagePolicy } from "../photoPolicy";

export type WorldId = "pro" | "academico" | "paciente" | "clinica";

export type StudioMetric = { value: number; prefix?: string; suffix?: string; label: string; source?: "market" };

/**
 * REGRA TAXATIVA: nenhum item de copy declara imagem de UI. A imagem vem do
 * `topic` (ver `topics.ts` / `imageForTopic`). Assunto sem screenshot exato não
 * recebe imagem nenhuma — tipografia resolve. Zero fallback, zero imagem
 * genérica. ÚNICA exceção: `poster` (ilustração autoral de campanha, arte —
 * nunca screenshot de tela), usada apenas pelo bloco PinupBlock.
 */
export type StudioStep = { title: string; description: string; topic: TopicId };

/** Número editorial com nota de rodapé — o "recibo de verdade" por trás da métrica. */
export type StatItem = { value: string; label: string; note: string; source?: "market" };

/** Insumos de copy de vendas usados para montar a legenda pronta de cada seção. */
export type WorldSales = {
  /** Público a quem a legenda fala, ex. "fisioterapeutas de consultório". */
  audience: string;
  /** Provas / benefícios concretos, em bullets. */
  proofs: string[];
  /** Quebras de objeção. */
  objections: string[];
  /** Linhas de oferta (preço, teste, garantia). */
  offers: string[];
  /** Chamadas para ação. */
  ctas: string[];
  /** Hashtags sem "#". */
  hashtags: string[];
};

/**
 * Storytelling de caso anonimizado — prova real sem expor ninguém
 * ("uma fisio do interior", "um recém-formado"). Estrutura de capítulo:
 * beats constroem a cena, `turn` é a virada, `moral` é o fecho.
 * Tópico opcional: story institucional não precisa de tela.
 */
export type StudioStory = {
  kicker: string;
  title: string;
  /** 3-4 frases curtas que constroem a cena. */
  beats: string[];
  /** A virada da narrativa, em destaque. */
  turn: string;
  /** Fecho que amarra na marca/produto. */
  moral: string;
  topic?: TopicId;
};

/**
 * Lista editorial de valor puro — informativo que NÃO depende de tela do
 * produto ("4 sinais de que...", "3 erros ao..."). O `closing` amarra a lista
 * de volta para o Aliv.iA. Sem tópico: é conteúdo institucional.
 */
export type StudioList = {
  heading: string;
  /** 3-5 itens numerados. */
  items: string[];
  closing: string;
};

/**
 * Carrossel: sequência de artes (capa + miolo + CTA) sobre um mesmo assunto,
 * para explicar uma funcionalidade, vender ou posicionar a marca.
 * O miolo pode declarar tópico (alimenta a cobertura editorial), mas o
 * o carrossel pode receber uma imagem do acervo quando houver nexo exato com
 * a funcionalidade explicada naquele slide.
 */
export type StudioCarousel = {
  /** Identidade editorial estável; sobrevive à variação linguística entre lotes. */
  id?: string;
  kicker: string;
  /** Headline da capa. */
  title: string;
  coverSub: string;
  /**
   * `explicit-only` proíbe aproximações semânticas: cada slide só pode usar
   * uma imagem declarada em `photoIds`. Sem essa imagem, o slide fica sem foto.
   */
  imagePolicy?: ImagePolicy;
  /** 1-4 slides de miolo; o total de artes exportadas é slides + capa + CTA. */
  slides: { heading: string; body: string; topic?: TopicId; photoIds?: string[] }[];
  cta: { title: string; sub: string };
};

/**
 * Cadeia integrada de funcionalidades: uma única promessa entregue por 3–5
 * recursos em ordem. Diferente de uma lista, cada etapa recebe a anterior e
 * prepara a seguinte.
 */
export type StudioEcosystem = {
  id: string;
  kicker: string;
  title: string;
  promise: string;
  audience: string;
  /** Ecossistemas Aliv.iA só aceitam o print explicitamente ligado à etapa. */
  imagePolicy?: ImagePolicy;
  steps: { id: string; label: string; body: string; topic?: TopicId; photoIds?: string[] }[];
  closing: string;
  cta: string;
};


export type WorldContent = {
  /** Declared, audience-scoped software capabilities for product education. */
  productFacts?: { title: string; description: string; benefit?: string; topic?: TopicId }[];
  id: WorldId;
  label: string;
  /** Lista fechada de prints oficiais permitidos neste pacote editorial. */
  officialPhotoIds?: string[];
  kickers: string[];
  /** Headline em duas partes: destaque + complemento */
  headlines: { strong: string; rest: string }[];
  subs: string[];
  kinetic: { kicker: string; word: string; caption: string; topic?: TopicId }[];
  metrics: StudioMetric[][];
  /** Estatísticas editoriais com nota de contexto (StatsBlock). */
  stats: { heading: string; items: StatItem[] }[];
  /** Trípticos de valor: três palavras que resumem a promessa (TriptychBlock). */
  triptychs: { heading: string; panels: { word: string; line: string; topic: TopicId }[] }[];
  /** Frases de tipografia-herói com uma palavra em destaque (TypoBlock). */
  typos: { lead: string; big: string; tail: string }[];
  compare: { title: string; before: string[]; after: string[]; topics?: TopicId[]; labels?: [string, string]; factual?: boolean }[];
  journeys: { kicker: string; heading: string; steps: StudioStep[] }[];
  features: {
    tag: string;
    title: string;
    description: string;
    topic: TopicId;
    /** Headline de cartaz (opcional) — usada por FeatureBlock/PinupBlock. */
    headline?: string;
    /** Ilustração autoral de campanha (opcional) — usada apenas pelo PinupBlock. */
    poster?: string;
  }[];
  quotes: { text: string; topic?: TopicId }[];
  marquee: string[][];
  closings: { title: string; sub: string; cta: string }[];
  /** Mini-casos anonimizados (StoryBlock). */
  stories: StudioStory[];
  /** Listas editoriais de valor puro (ListBlock). */
  lists: StudioList[];
  /** Sequências de artes para carrossel (CarouselBlock). */
  carousels: StudioCarousel[];
  /** Jornadas que conectam funcionalidades complementares numa só entrega. */
  ecosystems?: StudioEcosystem[];
  /**
   * BIBLIOTECA DE GANCHOS: frases de parada de scroll adaptadas à marca
   * (acervo curado + mecanismo de `hooks.ts`). Usada pelo bloco `hook`.
   */
  hooks?: StudioHook[];
  sales: WorldSales;
  /**
   * Termos que o público digitaria numa busca real (queixa, diagnóstico,
   * desejo). Usado pelo SearchBlock — sem isso o bloco não é gerado, para não
   * cair em frase institucional dentro da barra de busca.
   */
  searchQueries?: string[];
};
