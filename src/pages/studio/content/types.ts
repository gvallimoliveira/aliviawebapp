export type WorldId = "pro" | "academico" | "paciente" | "clinica";

export type StudioMetric = { value: number; prefix?: string; suffix?: string; label: string };

export type StudioStep = { title: string; description: string; image?: string };

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
};
