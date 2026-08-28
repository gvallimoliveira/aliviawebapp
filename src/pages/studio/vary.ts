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
import { applyLexicon, type VoiceRegister } from "./lexicon";

const SKIP_KEYS = new Set(["id", "label", "topic", "topics", "poster", "image", "hashtags", "value", "prefix", "suffix", "cta", "tag"]);

export type VaryOptions = {
  register: VoiceRegister;
  /** Semente do lote, ex. `${brandId}:${seed}`. */
  seed: string;
  /** Literais que a variação não pode introduzir (nome de outras marcas). */
  forbidden?: string[];
  intensity?: number;
};

const varyValue = (value: unknown, key: string, options: VaryOptions, path: string): unknown => {
  if (typeof value === "string") {
    if (SKIP_KEYS.has(key)) return value;
    return applyLexicon(value, {
      register: options.register,
      seed: `${options.seed}:${path}`,
      intensity: options.intensity,
      forbidden: options.forbidden,
    });
  }
  if (Array.isArray(value)) {
    return value.map((item, i) => varyValue(item, key, options, `${path}.${i}`));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, varyValue(v, k, options, `${path}.${k}`)]),
    );
  }
  return value;
};

/** Reescreve o acervo mantendo o contrato `WorldContent` intacto. */
export const varyContent = (content: WorldContent, options: VaryOptions): WorldContent =>
  varyValue(content, "root", options, "c") as WorldContent;
