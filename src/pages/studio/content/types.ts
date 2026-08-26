import type { TopicId } from "../topics";

export type WorldId = "pro" | "academico" | "paciente" | "clinica";

export type StudioMetric = { value: number; prefix?: string; suffix?: string; label: string };

/**
 * REGRA TAXATIVA: nenhum item de copy declara imagem de UI. A imagem vem do
 * `topic` (ver `topics.ts` / `imageForTopic`). Assunto sem screenshot exato não
 * recebe imagem nenhuma — tipografia resolve. Zero fallback, zero imagem
 * genérica. ÚNICA exceção: `poster` (ilustração autoral de campanha, arte —
 * nunca screenshot de tela), usada apenas pelo bloco PinupBlock.
 */
export type StudioStep = { title: string; description: string; topic: TopicId };

/** Número editorial com nota de rodapé — o "recibo de verdade" por trás da métrica. */
export type StatItem = { value: string; label: string; note: string };

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


export type WorldContent = {
  id: WorldId;
  label: string;
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
  compare: { title: string; before: string[]; after: string[]; topics?: TopicId[] }[];
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
  sales: WorldSales;
};
