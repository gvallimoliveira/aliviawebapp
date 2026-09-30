import type { StudioCarousel, StudioEcosystem } from "@/pages/studio/content/types";
import type { TopicId } from "@/pages/studio/topics";
import { ALIVIA_DIFFERENTIALS, type AliviaDifferentialId } from "./aliviaDifferentials";

export type AliviaEcosystemRecipeId =
  | "rotina-clinica"
  | "periodizacao"
  | "recem-formado"
  | "seguranca-clinica"
  | "adesao-e-evolucao";

type Recipe = {
  id: AliviaEcosystemRecipeId;
  label: string;
  audience: string;
  title: string;
  promise: string;
  ids: AliviaDifferentialId[];
  closing: string;
  cta: string;
  problem: string;
  gain: string;
  loss: string;
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
    problem: "Quando coleta, conduta e evolução ficam separadas, o fisioterapeuta precisa reconstruir o caso em cada encontro.",
    gain: "A informação avança com o paciente: prepara a avaliação, orienta o exercício e sustenta a próxima decisão.",
    loss: "Sem continuidade entre as etapas, tempo clínico vira procura por dados e a evolução fica difícil de demonstrar.",
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
    problem: "Prescrever uma carga sem acompanhar a resposta transforma progressão em tentativa, não em processo.",
    gain: "O plano antecipa a dose, o paciente devolve a resposta e o próximo ajuste nasce desse contraste.",
    loss: "Quando a resposta não retorna ao planejamento, a próxima sessão pode repetir uma dose que já ficou abaixo ou acima do necessário.",
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
    problem: "No começo da carreira, a insegurança aumenta quando dados, hipótese e acompanhamento vivem em lugares diferentes.",
    gain: "Um fluxo estruturado ajuda a transformar achados em raciocínio, registro e comparação sem substituir o julgamento profissional.",
    loss: "Sem uma estrutura comum, a dúvida vira busca fragmentada e o profissional perde a trilha que sustentou sua decisão.",
  },
  {
    id: "seguranca-clinica",
    label: "Segurança clínica documentada",
    audience: "fisioterapeuta que recebe casos complexos e precisa decidir com segurança documentada",
    title: "Antes da conduta, uma cadeia que reduz lacunas e deixa a decisão rastreável",
    promise: "O Aliv.iA reúne triagem, leitura do histórico externo, avaliação guiada e comparação para o profissional revisar o caso inteiro antes de avançar.",
    ids: ["diferencial-red-flags", "diferencial-avaliacao-externa-ia", "diferencial-avaliacao-manual", "diferencial-relatorios", "diferencial-reavaliacao"],
    closing: "Do primeiro alerta à reavaliação, perguntas, achados e decisões permanecem ligados no mesmo percurso clínico.",
    cta: "Conhecer o fluxo de segurança clínica",
    problem: "Um caso complexo se torna mais arriscado quando alertas, documentos externos e achados da avaliação são lidos como partes isoladas.",
    gain: "Cada informação entra no lugar certo, passa pela revisão profissional e reaparece quando é hora de documentar ou comparar.",
    loss: "Sem uma trilha comum, sinais importantes podem perder contexto e a justificativa da conduta fica espalhada entre arquivos e lembranças.",
  },
  {
    id: "adesao-e-evolucao",
    label: "Adesão e evolução entre sessões",
    audience: "fisioterapeuta que quer acompanhar execução, resposta e evolução também fora da sessão",
    title: "O tratamento continua entre as sessões — e os dados também precisam voltar",
    promise: "O programa orienta a execução, o registro aproxima a rotina do prontuário e os check-ins mostram como o paciente respondeu antes da próxima decisão.",
    ids: ["diferencial-hep-video", "diferencial-evolucao-voz", "diferencial-prontidao-carga", "diferencial-reavaliacao", "diferencial-relatorios"],
    closing: "Orientação, resposta e comparação deixam de ser momentos soltos e passam a contar a mesma história de evolução.",
    cta: "Acompanhar a jornada além da sessão",
    problem: "Quando o paciente sai da sala, execução, sintomas e tolerância à carga podem desaparecer até o próximo encontro.",
    gain: "O fisioterapeuta orienta com clareza, registra sem atraso e recebe sinais que ajudam a ajustar o plano com contexto.",
    loss: "Sem esse retorno, a adesão vira suposição e a próxima decisão depende mais da memória do que do que aconteceu entre as sessões.",
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
      body: `${transition(index, stages.length)}: ${String(item.description ?? "").replace(/^./, (letter) => letter.toLowerCase())}`,
      topic: TOPIC_BY_ID[item.id as AliviaDifferentialId],
    })),
    closing: recipe.closing,
    cta: recipe.cta,
  };
};

/**
 * Um mesmo encadeamento recebe seis argumentos autônomos. Assim, a geração
 * oferece escolhas editoriais reais sem trocar público, ordem ou promessa.
 */
export const buildAliviaEcosystemSet = (recipeId?: string, selectedIds?: string[]): StudioEcosystem[] => {
  const recipe = ecosystemRecipe(recipeId);
  const base = buildAliviaEcosystem(recipe.id, selectedIds);
  const path = base.steps.map((step) => step.label).join(" → ");
  return [
    base,
    {
      ...base,
      id: `${base.id}-problema`,
      kicker: "O CUSTO DA FRAGMENTAÇÃO",
      title: recipe.problem,
      promise: `A resposta não é acrescentar mais uma ferramenta, mas fazer ${base.steps.length} etapas trabalharem como uma só jornada.`,
      closing: recipe.loss,
    },
    {
      ...base,
      id: `${base.id}-passagens`,
      kicker: "UMA ETAPA PREPARA A PRÓXIMA",
      title: "O valor não está em cada recurso isolado. Está no que um entrega ao seguinte.",
      promise: path,
      closing: recipe.gain,
    },
    {
      ...base,
      id: `${base.id}-destinatario`,
      kicker: "FEITO PARA A ROTINA REAL",
      title: `Para ${recipe.audience}`,
      promise: recipe.gain,
      closing: base.closing,
    },
    {
      ...base,
      id: `${base.id}-ganho`,
      kicker: "GANHO ACUMULADO",
      title: recipe.gain,
      promise: `A cadeia começa em ${base.steps[0]?.label ?? "uma informação confiável"} e amadurece até ${base.steps.at(-1)?.label ?? "a próxima decisão"}.`,
      closing: base.closing,
    },
    {
      ...base,
      id: `${base.id}-decisao`,
      kicker: "DO DADO À DECISÃO",
      title: "Menos recomeço entre etapas. Mais contexto para decidir o próximo passo.",
      promise: recipe.loss,
      closing: `${recipe.gain} ${base.cta}.`,
    },
  ];
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
  const ecosystems = buildAliviaEcosystemSet(recipeId, selectedIds);
  return { ...content, ecosystems, carousels: [ecosystemCarousel(ecosystems[0])] };
};