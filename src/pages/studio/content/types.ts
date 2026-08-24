export type WorldId = "pro" | "academico" | "paciente" | "clinica";

export type StudioMetric = { value: number; prefix?: string; suffix?: string; label: string };

export type StudioStep = { title: string; description: string; image?: string };

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
  kinetic: { kicker: string; word: string; caption: string }[];
  metrics: StudioMetric[][];
  compare: { title: string; before: string[]; after: string[] }[];
  journeys: { kicker: string; heading: string; steps: StudioStep[] }[];
  features: { tag: string; title: string; description: string; image?: string }[];
  quotes: string[];
  marquee: string[][];
  closings: { title: string; sub: string; cta: string }[];
  sales: WorldSales;
};

