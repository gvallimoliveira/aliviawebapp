import type { Rng } from "./rng";
import type { CoverageIndex } from "./coverage";
import type { TopicId } from "./topics";

/**
 * Seletor de conteúdo com consciência editorial.
 *
 * Nenhum bloco sorteia copy "às cegas": o sorteio é ponderado pela dívida
 * editorial (assunto pouco falado pesa mais) e cada escolha é reportada para o
 * registro de exposição, alimentando o estudo de cobertura da próxima versão.
 *
 * MEMÓRIA DE FRASES (anti-repetição linguística): copy institucional/neutra não
 * tem tópico clínico e antes entrava com peso plano — era isso que fazia o
 * usuário reler as mesmas frases. Quando existe memória de frases da marca, a
 * assinatura do item pesa no sorteio: frase usada recentemente perde vez.
 */
export type StudioPicker = {
  /** Sorteia `count` itens ponderando pela dívida dos tópicos de cada item. */
  pick: <T>(items: readonly T[], count: number, rng: Rng, topicsOf: (item: T) => (TopicId | undefined)[]) => T[];
};

/** Memória de frases já expostas por marca (persistida na conta). */
export type PhraseMemory = {
  /** Multiplicador de peso: 1 = inédito, próximo de 0 = muito repetido. */
  weightOf: (signature: string) => number;
  /** Registra as assinaturas que foram efetivamente ao ar. */
  record: (signatures: string[]) => void;
  /**
   * Abre um novo lote: zera o desconto imediato (o que valia só para a leva
   * anterior). O peso persistido na conta continua valendo.
   */
  startBatch?: (key: string) => void;
};

/** Assinatura estável e curta de um item de copy (texto, não layout). */
export const phraseSignature = (item: unknown): string => {
  const parts: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") parts.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(walk);
  };
  walk(item);
  const text = parts.join(" ").toLowerCase().replace(/\s+/g, " ").trim().slice(0, 160);
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
};

/** Stable across layout, CTA/support edits and factual focusing. */
export const hookSignature = (hook: { strong: string; rest?: string }): string =>
  `hook:${phraseSignature(`${hook.strong} ${hook.rest ?? ""}`.trim().replace(/[.!?…]+$/, ""))}`;

export const createPicker = (
  coverage: CoverageIndex,
  collect: (topics: TopicId[]) => void,
  /** Tópico que o usuário mandou forçar nesta versão, se houver. */
  forced?: TopicId,
  /** Memória de frases da marca — quando ausente, comportamento antigo. */
  memory?: PhraseMemory,
): StudioPicker => ({
  pick: (items, count, rng, topicsOf) => {
    const weightOf = (item: typeof items[number]) => {
      const topics = topicsOf(item).filter(Boolean) as TopicId[];
      const fresh = memory ? memory.weightOf(phraseSignature(item)) : 1;
      if (topics.length === 0) return 0.6 * fresh; // copy institucional: entra, mas sem prioridade
      if (forced && topics.includes(forced)) return 40; // cobertura forçada vence o sorteio
      const debt = topics.reduce((sum, t) => sum + coverage.debtOf(t), 0) / topics.length;
      return debt * fresh;
    };

    const chosen = rng.pickWeighted(items, weightOf, count);
    const topics = chosen.flatMap((item) => topicsOf(item).filter(Boolean) as TopicId[]);
    if (topics.length > 0) collect(topics);
    if (memory) memory.record(chosen.map((item) => phraseSignature(item)));
    return chosen;
  },
});
