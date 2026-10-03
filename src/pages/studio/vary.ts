/**
 * VARIAÇÃO LINGUÍSTICA GLOBAL
 *
 * Passa todo o acervo textual de um `WorldContent` pelo léxico do registro de
 * voz da marca. Vale para o Studio público E para os mundos internos: o acervo
 * curado continua sendo a semente da ideia, mas a roupagem muda a cada lote.
 *
 * Chaves estruturais (id, label, tópicos, hashtags, imagens) NUNCA são
 * reescritas — só o texto que aparece como frase na arte.
 */

import type { WorldContent } from "./content/types";
import type { VoiceRegister } from "./lexicon";
import { budgetFor, rephrase, type FormulaBudget } from "./rewrite";

import type { BrandStyle } from "./style";
import { DEFAULT_VARIATION_PROFILE, intensityFor, type VariationProfile } from "./variation";

const SKIP_KEYS = new Set(["id", "label", "topic", "topics", "poster", "image", "hashtags", "value", "prefix", "suffix", "tag"]);

export type VaryOptions = {
  register: VoiceRegister;
  /** Semente do lote, ex. `${brandId}:${seed}`. */
  seed: string;
  /** Literais que a variação não pode introduzir (nome de outras marcas). */
  forbidden?: string[];
  intensity?: number;
  profile?: VariationProfile;
  style?: BrandStyle | null;
};

const intensityForPath = (key: string, path: string, options: VaryOptions) => {
  if (typeof options.intensity === "number") return options.intensity;
  const profile = options.profile ?? DEFAULT_VARIATION_PROFILE;
  if (/cta|caption|closing|moral|offer/i.test(`${path}.${key}`)) return intensityFor(profile.actions);
  if (/headline|heading|title|strong|lead|big|word/i.test(`${path}.${key}`)) return intensityFor(profile.headlines);
  return intensityFor(profile.support);
};

const varyValue = (value: unknown, key: string, options: VaryOptions, path: string, budget?: FormulaBudget): unknown => {
  if (typeof value === "string") {
    if (SKIP_KEYS.has(key)) return value;
    return rephrase(value, {
      register: options.register,
      seed: `${options.seed}:${path}`,
      intensity: intensityForPath(key, path, options),
      forbidden: options.forbidden,
      naturalness: (options.profile ?? DEFAULT_VARIATION_PROFILE).naturalness ?? "natural",
      budget,
      style: options.style,
    });
  }

  if (Array.isArray(value)) {
    return value.map((item, i) => varyValue(item, key, options, `${path}.${i}`, budget));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, varyValue(v, k, options, `${path}.${k}`, budget)]),
    );
  }
  return value;
};

/** Reescreve o acervo mantendo o contrato `WorldContent` intacto. */
export const varyContent = (content: WorldContent, options: VaryOptions): WorldContent =>
  varyValue(
    content,
    "root",
    options,
    "c",
    // Um orçamento por lote: fórmulas retóricas não se repetem arte após arte.
    budgetFor((options.profile ?? DEFAULT_VARIATION_PROFILE).naturalness ?? "natural"),
  ) as WorldContent;
