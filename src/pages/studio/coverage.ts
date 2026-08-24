import type { WorldContent, WorldId } from "./content/types";
import {
  WEIGHT_PRIORITY,
  topicLabel,
  topicsOfWorld,
  weightOfTopic,
  type TopicId,
  type TopicWeight,
} from "./topics";

/**
 * ESTUDO E QUANTIFICAÇÃO EDITORIAL DO STUDIO
 *
 * Consultado ANTES de qualquer decisão criativa: a composição precisa saber o
 * que já foi muito dito e o que ainda não teve palco. Duas medidas por tópico:
 *
 * - `mentions`  → quantos itens de copy do acervo falam do assunto (desequilíbrio
 *                 do que está escrito nos arquivos de conteúdo);
 * - `exposures` → quantas vezes o assunto já foi para uma página gerada/exportada
 *                 neste navegador (histórico real de publicação).
 *
 * Delas sai o `debt` (dívida editorial): quanto maior, mais urgente falar.
 */

const STORAGE_KEY = "studio:coverage";

export type ExposureLog = Partial<Record<WorldId, Partial<Record<TopicId, number>>>>;

export type TopicCoverage = {
  id: TopicId;
  label: string;
  weight: TopicWeight;
  mentions: number;
  exposures: number;
  /** Peso de sorteio: alto = falar mais. */
  debt: number;
  /** 0-100, só para leitura humana no painel. */
  debtScore: number;
};

export type CoverageIndex = {
  world: WorldId;
  topics: TopicCoverage[];
  byId: Record<string, TopicCoverage>;
  /** Peso de sorteio de um tópico (1 quando desconhecido). */
  debtOf: (topic?: TopicId) => number;
  /** Tópicos com maior dívida — o que a próxima versão precisa cobrir. */
  priorityTopics: (count: number) => TopicId[];
};

export const readExposureLog = (): ExposureLog => {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as ExposureLog;
  } catch {
    return {};
  }
};

const writeExposureLog = (log: ExposureLog) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* storage cheio / modo privado: cobertura degrada para só o acervo */
  }
};

/** Registra que estes assuntos foram efetivamente ao ar. */
export const recordExposure = (world: WorldId, topics: TopicId[]): ExposureLog => {
  const log = readExposureLog();
  const worldLog = { ...(log[world] ?? {}) };
  topics.forEach((topic) => {
    worldLog[topic] = (worldLog[topic] ?? 0) + 1;
  });
  const next = { ...log, [world]: worldLog };
  writeExposureLog(next);
  return next;
};

export const resetExposure = (world: WorldId): ExposureLog => {
  const log = readExposureLog();
  const next = { ...log, [world]: {} };
  writeExposureLog(next);
  return next;
};

/** Conta menções do acervo escrito (features, jornadas, comparativos, kinéticos, frases). */
export const countMentions = (content: WorldContent): Record<string, number> => {
  const counts: Record<string, number> = {};
  const add = (topic?: TopicId) => {
    if (!topic) return;
    counts[topic] = (counts[topic] ?? 0) + 1;
  };

  content.features.forEach((f) => add(f.topic));
  content.journeys.forEach((j) => j.steps.forEach((s) => add(s.topic)));
  content.compare.forEach((c) => c.topics?.forEach(add));
  content.kinetic.forEach((k) => add(k.topic));
  content.quotes.forEach((q) => add(q.topic));

  return counts;
};

export const buildCoverage = (
  world: WorldId,
  content: WorldContent,
  log: ExposureLog = readExposureLog(),
): CoverageIndex => {
  const mentions = countMentions(content);
  const exposures = log[world] ?? {};

  const topics: TopicCoverage[] = topicsOfWorld(world).map((id) => {
    const weight = weightOfTopic(world, id);
    const m = mentions[id] ?? 0;
    const e = exposures[id] ?? 0;
    // Dívida: prioridade estratégica dividida pela saturação já acumulada.
    const debt = WEIGHT_PRIORITY[weight] / (1 + e * 0.85 + m * 0.12);
    return { id, label: topicLabel(id), weight, mentions: m, exposures: e, debt, debtScore: 0 };
  });

  const max = Math.max(...topics.map((t) => t.debt), 0.0001);
  topics.forEach((t) => {
    t.debtScore = Math.round((t.debt / max) * 100);
  });

  const byId = Object.fromEntries(topics.map((t) => [t.id, t]));
  const ranked = [...topics].sort((a, b) => b.debt - a.debt);

  return {
    world,
    topics,
    byId,
    debtOf: (topic) => (topic && byId[topic] ? byId[topic].debt : 1),
    priorityTopics: (count) => ranked.slice(0, count).map((t) => t.id),
  };
};

/** Estudo em texto puro, para planejar o calendário de conteúdo. */
export const buildCoverageReport = (coverage: CoverageIndex, worldLabel: string) => {
  const ranked = [...coverage.topics].sort((a, b) => b.debt - a.debt);
  const line = (t: TopicCoverage) =>
    `${String(t.debtScore).padStart(3)} | menções ${String(t.mentions).padStart(2)} | no ar ${String(
      t.exposures,
    ).padStart(3)} | ${t.weight.padEnd(12)} | ${t.label}`;

  return [
    `ESTUDO DE COBERTURA EDITORIAL — ALIV.IA STUDIO`,
    `Mundo: ${worldLabel}`,
    `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    "",
    "Dívida = o quanto este assunto precisa de palco (100 = mais urgente).",
    "",
    "PRECISA SER MAIS DIVULGADO",
    ...ranked.slice(0, 12).map(line),
    "",
    "JÁ BEM DIVULGADO",
    ...ranked.slice(-8).reverse().map(line),
    "",
    `Total de tópicos monitorados: ${coverage.topics.length}`,
    `Sem nenhuma menção no acervo: ${
      coverage.topics.filter((t) => t.mentions === 0).map((t) => t.label).join(", ") || "nenhum"
    }`,
    `Nunca exibidos: ${
      coverage.topics.filter((t) => t.exposures === 0).map((t) => t.label).join(", ") || "nenhum"
    }`,
  ].join("\n");
};
