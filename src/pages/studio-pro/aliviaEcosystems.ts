import type { StudioCarousel, StudioEcosystem } from "@/pages/studio/content/types";
import type { TopicId } from "@/pages/studio/topics";
import { ALIVIA_DIFFERENTIALS, type AliviaDifferentialId } from "./aliviaDifferentials";

export type AliviaEcosystemRecipeId = "rotina-clinica" | "periodizacao" | "recem-formado";

type Recipe = {
  id: AliviaEcosystemRecipeId;
  label: string;
  audience: string;
  title: string;
  promise: string;
  ids: AliviaDifferentialId[];
  closing: string;
  cta: string;
};

export const ALIVIA_ECOSYSTEM_RECIPES: Recipe[] = [
  {
    id: "rotina-clinica",
    label: "Rotina clínica completa",
    audience: "fisioterapeuta que quer organizar a jornada inteira do paciente",
    title: "Do primeiro contato à evolução que o paciente consegue enxergar",
    promise: "O Aliv.iA conecta as decisões da rotina para o fisioterapeuta não recomeçar o raciocínio a cada etapa.",
    ids: ["diferencial-pre-avaliacao", "diferencial-avaliacao-manual", "diferencial-hep-video", "diferencial-prontidao-carga", "diferencial-reavaliacao"],
    closing: "O dado coletado no início orienta a conduta, acompanha a resposta e volta como comparação no fim.",
    cta: "Conhecer a jornada completa no Aliv.iA",
  },
  {
    id: "periodizacao",
    label: "Periodização acompanhada",
    audience: "fisioterapeuta que precisa dosar e ajustar carga com contexto",
    title: "Planejar a carga é só o começo: a resposta precisa voltar para o plano",
    promise: "A progressão deixa de ser uma sequência de sessões soltas e vira um ciclo entre plano, execução, resposta e ajuste.",
    ids: ["diferencial-periodizacao", "diferencial-hep-video", "diferencial-prontidao-carga"],
    closing: "Carga planejada e carga percebida passam a conversar antes da próxima dose.",
    cta: "Acompanhar um ciclo completo de carga",
  },
  {
    id: "recem-formado",
    label: "Recém-formado com apoio clínico",
    audience: "recém-formado que quer atender com método sem terceirizar a decisão",
    title: "Mais segurança para raciocinar sem fingir que já sabe tudo",
    promise: "O Aliv.iA dá estrutura ao caso, apoio especializado à dúvida e uma régua para acompanhar a evolução.",
    ids: ["diferencial-pre-avaliacao", "diferencial-agente-clinico", "diferencial-relatorios", "diferencial-reavaliacao"],
    closing: "O sistema organiza e confronta o raciocínio; a decisão clínica continua sendo do fisioterapeuta.",
    cta: "Começar a atender com um fluxo clínico estruturado",
  },
];

const TOPIC_BY_ID: Partial<Record<AliviaDifferentialId, TopicId>> = {
  "diferencial-pre-avaliacao": "assessment-link",
  "diferencial-avaliacao-manual": "steps-method",
  "diferencial-reavaliacao": "express-reassessment",
  "diferencial-agente-clinico": "clinical-agent",
  "diferencial-evolucao-voz": "voice-notes",
  "diferencial-hep-video": "hep",
  "diferencial-relatorios": "report",
  "diferencial-red-flags": "red-flags",
  "diferencial-avaliacao-externa-ia": "external-upload",
};

export const ecosystemRecipe = (id?: string) =>
  ALIVIA_ECOSYSTEM_RECIPES.find((recipe) => recipe.id === id) ?? ALIVIA_ECOSYSTEM_RECIPES[0];

export const normalizeEcosystemIds = (ids: string[] | undefined, fallback: AliviaDifferentialId[]) => {
  const allowed = new Set(ALIVIA_DIFFERENTIALS.map((item) => item.id));
  const unique = [...new Set((ids ?? []).filter((id): id is AliviaDifferentialId => allowed.has(id)))];
  return (unique.length >= 3 ? unique : fallback).slice(0, 5);
};

const transition = (index: number, total: number) => {
  if (index === 0) return "É aqui que a cadeia começa";
  if (index === total - 1) return "É aqui que o ciclo volta como decisão";
  return index === 1 ? "Com essa base" : "A partir da resposta anterior";
};

export const buildAliviaEcosystem = (recipeId?: string, selectedIds?: string[]): StudioEcosystem => {
  const recipe = ecosystemRecipe(recipeId);
  const ids = normalizeEcosystemIds(selectedIds, recipe.ids);
  const stages = ids
    .map((id) => ALIVIA_DIFFERENTIALS.find((item) => item.id === id))
    .filter((item): item is (typeof ALIVIA_DIFFERENTIALS)[number] => Boolean(item));

  return {
    id: `ecossistema-${recipe.id}-${ids.join("-")}`,
    kicker: "ECOSSISTEMA DE SOLUÇÕES",
    title: recipe.title,
    promise: recipe.promise,
    audience: recipe.audience,
    steps: stages.map((item, index) => ({
      id: item.id,
      label: item.keyword ?? item.label,
      body: `${transition(index, stages.length)}, ${String(item.description ?? "").replace(/^./, (letter) => letter.toLowerCase())}`,
      topic: TOPIC_BY_ID[item.id as AliviaDifferentialId],
    })),
    closing: recipe.closing,
    cta: recipe.cta,
  };
};

export const ecosystemCarousel = (ecosystem: StudioEcosystem): StudioCarousel => ({
  id: `${ecosystem.id}-carrossel`,
  kicker: ecosystem.kicker,
  title: ecosystem.title,
  coverSub: `${ecosystem.promise} Para ${ecosystem.audience}.`,
  slides: ecosystem.steps.map((step, index) => ({
    heading: `${String(index + 1).padStart(2, "0")} · ${step.label}`,
    body: step.body,
    topic: step.topic,
  })),
  cta: { title: ecosystem.closing, sub: ecosystem.cta },
});

export const withAliviaEcosystem = <T extends { ecosystems?: StudioEcosystem[]; carousels: StudioCarousel[] }>(
  content: T,
  recipeId?: string,
  selectedIds?: string[],
): T => {
  const ecosystem = buildAliviaEcosystem(recipeId, selectedIds);
  return { ...content, ecosystems: [ecosystem], carousels: [ecosystemCarousel(ecosystem)] };
};