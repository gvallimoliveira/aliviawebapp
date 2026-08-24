import type { Rng } from "./rng";
import type { CoverageIndex } from "./coverage";
import type { TopicId } from "./topics";

/**
 * Seletor de conteúdo com consciência editorial.
 *
 * Nenhum bloco sorteia copy "às cegas": o sorteio é ponderado pela dívida
 * editorial (assunto pouco falado pesa mais) e cada escolha é reportada para o
 * registro de exposição, alimentando o estudo de cobertura da próxima versão.
 */
export type StudioPicker = {
  /** Sorteia `count` itens ponderando pela dívida dos tópicos de cada item. */
  pick: <T>(items: readonly T[], count: number, rng: Rng, topicsOf: (item: T) => (TopicId | undefined)[]) => T[];
};

export const createPicker = (
  coverage: CoverageIndex,
  collect: (topics: TopicId[]) => void,
  /** Tópico que o usuário mandou forçar nesta versão, se houver. */
  forced?: TopicId,
): StudioPicker => ({
  pick: (items, count, rng, topicsOf) => {
    const weightOf = (item: typeof items[number]) => {
      const topics = topicsOf(item).filter(Boolean) as TopicId[];
      if (topics.length === 0) return 0.6; // copy institucional: entra, mas sem prioridade
      if (forced && topics.includes(forced)) return 40; // cobertura forçada vence o sorteio
      return topics.reduce((sum, t) => sum + coverage.debtOf(t), 0) / topics.length;
    };

    const chosen = rng.pickWeighted(items, weightOf, count);
    const topics = chosen.flatMap((item) => topicsOf(item).filter(Boolean) as TopicId[]);
    if (topics.length > 0) collect(topics);
    return chosen;
  },
});
