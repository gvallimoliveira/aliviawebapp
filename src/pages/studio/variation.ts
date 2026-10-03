import type { Naturalness } from "./rewrite";
export type VariationLevel = "low" | "medium" | "high";

export type VariationProfile = {
  headlines: VariationLevel;
  support: VariationLevel;
  actions: VariationLevel;
  /** Quanto de fórmula retórica o lote aceita. Padrão: natural. */
  naturalness?: Naturalness;
};

export const DEFAULT_VARIATION_PROFILE: VariationProfile = {
  headlines: "medium",
  support: "medium",
  actions: "medium",
  naturalness: "natural",
};

export const VARIATION_LEVELS: { id: VariationLevel; label: string; intensity: number }[] = [
  { id: "low", label: "Baixa", intensity: 0.22 },
  { id: "medium", label: "Média", intensity: 0.58 },
  { id: "high", label: "Alta", intensity: 0.9 },
];

export const intensityFor = (level: VariationLevel) =>
  VARIATION_LEVELS.find((item) => item.id === level)?.intensity ?? 0.58;

export const isVariationLevel = (value: unknown): value is VariationLevel =>
  value === "low" || value === "medium" || value === "high";

export const normalizeVariationProfile = (value: unknown): VariationProfile => {
  if (!value || typeof value !== "object") return DEFAULT_VARIATION_PROFILE;
  const candidate = value as Partial<VariationProfile>;
  return {
    headlines: isVariationLevel(candidate.headlines) ? candidate.headlines : "medium",
    support: isVariationLevel(candidate.support) ? candidate.support : "medium",
    actions: isVariationLevel(candidate.actions) ? candidate.actions : "medium",
    naturalness:
      candidate.naturalness === "balanced" || candidate.naturalness === "expressive" ? candidate.naturalness : "natural",
  };
};