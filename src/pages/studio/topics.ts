import type { WorldId } from "./content/types";
import stepPainMap from "@/assets/step-painmap.jpg";
import stepAnamnesis from "@/assets/step-anamnesis.jpg";
import stepTests from "@/assets/step-tests.jpg";
import stepTreatment from "@/assets/step-treatment.jpg";
import stepReport from "@/assets/step-report.jpg";
import stepDiagnosis from "@/assets/step-diagnosis.jpg";
import stepQuestionnaires from "@/assets/step-questionnaires.jpg";
import stepDiary from "@/assets/step-diary.jpg";
import shotClinicalAgent from "@/assets/studio/clinical-agent.jpg";
import shotMessaging from "@/assets/studio/messaging.jpg";
import shotAgenda from "@/assets/studio/agenda.jpg";
import shotPermissions from "@/assets/studio/permissions.jpg";
import shotWhiteLabel from "@/assets/studio/white-label.jpg";
import shotHep from "@/assets/studio/hep.jpg";
import shotEvidenceLibrary from "@/assets/studio/evidence-library.jpg";
import shotNps from "@/assets/studio/nps.jpg";
import shotMarketplace from "@/assets/studio/marketplace.jpg";
import shotAssessmentLink from "@/assets/studio/assessment-link.jpg";
import shotAcademicTracks from "@/assets/studio/academic-tracks.jpg";
import shotSimulatedEnv from "@/assets/studio/simulated-env.jpg";
import shotPainMechanism from "@/assets/studio/pain-mechanism.jpg";
import shotDifferential from "@/assets/studio/differential.jpg";
import shotFinalHypothesis from "@/assets/studio/final-hypothesis.jpg";
import shotHealthGeneral from "@/assets/studio/health-general.jpg";
import shotFabq from "@/assets/studio/fabq.jpg";


/**
 * ============================================================================
 * REGISTRO CANÔNICO DE FUNCIONALIDADES DO ALIV.IA (fonte única do Studio)
 * ============================================================================
 *
 * Toda copy do Studio precisa declarar um `topic` daqui. Isso serve a dois fins
 * não-negociáveis:
 *
 * 1. QUANTIFICAÇÃO EDITORIAL — permite medir o que já é muito falado e o que
 *    quase nunca aparece, para a composição equilibrar pilares com temas
 *    subexpostos (ver `coverage.ts`).
 *
 * 2. COERÊNCIA IMAGEM × ASSUNTO (REGRA TAXATIVA) — a imagem de um bloco NUNCA
 *    é escrita à mão no conteúdo. Ela vem exclusivamente do tópico, via
 *    `imageForTopic`. Um tópico só declara `image` quando existe screenshot da
 *    tela EXATA daquele assunto. Não existe fallback, não existe screenshot
 *    "parecido": tópico sem tela própria renderiza como tipografia.
 *    Screenshot genérico ao lado de título específico é ponta solta — proibido.
 */

export type TopicWeight =
  /** Sustenta a venda: pode e deve repetir. */
  | "pilar"
  /** Ninguém mais tem: precisa aparecer com frequência alta. */
  | "diferencial"
  /** Pouco glamouroso, mas precisa de ar: prioridade máxima quando devendo. */
  | "subexposto";

export type Topic = {
  label: string;
  /** Único screenshot autorizado para o assunto. Ausente = sem imagem, jamais genérica. */
  image?: string;
};

export const TOPICS = {
  "pain-map": { label: "Mapa de dor", image: stepPainMap },
  anamnesis: { label: "Anamnese estruturada", image: stepAnamnesis },
  "red-flags": { label: "Triagem de red flags" },
  "health-general": { label: "Saúde geral e comorbidades" },
  "functional-tests": { label: "Testes funcionais e clusters", image: stepTests },
  questionnaires: { label: "Questionários validados", image: stepQuestionnaires },
  fabq: { label: "FABQ-Brasil (medo-evitação)" },
  hypothesis: { label: "Hipótese diagnóstica", image: stepDiagnosis },
  "final-hypothesis": { label: "Hipótese final do profissional" },
  "pain-mechanism": { label: "Mecanismo de dor (Kosek/Finnerup)" },
  differential: { label: "Diagnósticos diferenciais" },
  "treatment-plan": { label: "Plano de tratamento por fases", image: stepTreatment },
  hep: { label: "HEP — programa domiciliar em vídeo", image: shotHep },
  "pain-diary": { label: "Diário de dor", image: stepDiary },
  report: { label: "Relatório clínico em PDF", image: stepReport },
  "discharge-report": { label: "Relatório de alta / evolução comparativa" },
  "clinical-impression": { label: "Impressão clínica longitudinal" },
  "clinical-agent": { label: "Agente de raciocínio clínico", image: shotClinicalAgent },
  "voice-notes": { label: "Ditado por voz na sessão" },
  dynamometry: { label: "Dinamometria e assimetria" },
  "express-reassessment": { label: "Reavaliação expressa" },
  "assessment-link": { label: "Avaliação por link" },
  "external-upload": { label: "Upload de avaliação externa" },
  marketplace: { label: "Vitrine de profissionais" },
  "multi-condition": { label: "Múltiplas condições em paralelo" },
  "evidence-library": { label: "Biblioteca de evidência (PEDro ≥ 7)" },
  "steps-method": { label: "Método STEPS" },
  difi: { label: "Framework D.I.F.I" },
  "academic-tracks": { label: "Trilhas acadêmicas" },
  "simulated-env": { label: "Ambiente simulado" },
  "white-label": { label: "White label da clínica", image: shotWhiteLabel },
  agenda: { label: "Agenda da equipe", image: shotAgenda },
  nps: { label: "NPS e satisfação" },
  permissions: { label: "Permissões por função", image: shotPermissions },
  documents: { label: "Documentos do paciente" },
  archive: { label: "Arquivamento de pacientes" },
  governance: { label: "Governança e ressalva com autor" },
  "institutional-link": { label: "Link institucional da clínica" },
  "shared-record": { label: "Prontuário compartilhado" },
  messaging: { label: "Mensagens e chat com o paciente", image: shotMessaging },
  privacy: { label: "LGPD, consentimento e privacidade" },
  pricing: { label: "Preço, teste e planos" },
  safety: { label: "Segurança clínica e encaminhamento" },
} as const satisfies Record<string, Topic>;

export type TopicId = keyof typeof TOPICS;

export const isTopicId = (value: unknown): value is TopicId =>
  typeof value === "string" && value in TOPICS;

/** Único ponto autorizado a resolver imagem de bloco. */
export const imageForTopic = (topic?: TopicId): string | undefined =>
  topic ? (TOPICS[topic] as Topic).image : undefined;

export const topicLabel = (topic: TopicId) => TOPICS[topic].label;

/**
 * Peso estratégico por mundo. Só entram tópicos que fazem sentido para aquele
 * público — o estudo de cobertura é sempre por mundo.
 */
export const WORLD_TOPICS: Record<WorldId, Partial<Record<TopicId, TopicWeight>>> = {
  pro: {
    "pain-map": "pilar",
    anamnesis: "pilar",
    "red-flags": "pilar",
    "functional-tests": "pilar",
    hypothesis: "pilar",
    "treatment-plan": "pilar",
    report: "pilar",
    "assessment-link": "pilar",
    "clinical-agent": "diferencial",
    "pain-mechanism": "diferencial",
    differential: "diferencial",
    "final-hypothesis": "diferencial",
    hep: "diferencial",
    "evidence-library": "diferencial",
    "steps-method": "diferencial",
    difi: "subexposto",
    questionnaires: "subexposto",
    fabq: "subexposto",
    "health-general": "subexposto",
    dynamometry: "subexposto",
    "express-reassessment": "subexposto",
    "external-upload": "subexposto",
    "clinical-impression": "subexposto",
    "discharge-report": "subexposto",
    "voice-notes": "subexposto",
    "pain-diary": "subexposto",
    messaging: "subexposto",
    marketplace: "subexposto",
    privacy: "subexposto",
    pricing: "pilar",
  },
  paciente: {
    "pain-map": "pilar",
    anamnesis: "pilar",
    safety: "pilar",
    "red-flags": "pilar",
    "treatment-plan": "pilar",
    hep: "pilar",
    report: "pilar",
    "pain-diary": "diferencial",
    "functional-tests": "diferencial",
    "pain-mechanism": "diferencial",
    hypothesis: "diferencial",
    "multi-condition": "subexposto",
    marketplace: "subexposto",
    questionnaires: "subexposto",
    "health-general": "subexposto",
    messaging: "subexposto",
    privacy: "subexposto",
    "clinical-impression": "subexposto",
    pricing: "pilar",
  },
  academico: {
    "academic-tracks": "pilar",
    hypothesis: "pilar",
    anamnesis: "pilar",
    "functional-tests": "pilar",
    "evidence-library": "pilar",
    "steps-method": "diferencial",
    difi: "diferencial",
    differential: "diferencial",
    "pain-mechanism": "diferencial",
    "simulated-env": "diferencial",
    "clinical-agent": "diferencial",
    questionnaires: "subexposto",
    fabq: "subexposto",
    "red-flags": "subexposto",
    "health-general": "subexposto",
    "treatment-plan": "subexposto",
    report: "subexposto",
    "pain-diary": "subexposto",
    "pain-map": "subexposto",
    "discharge-report": "subexposto",
    dynamometry: "subexposto",
    pricing: "pilar",
  },
  clinica: {
    "shared-record": "pilar",
    "institutional-link": "pilar",
    "white-label": "pilar",
    permissions: "pilar",
    anamnesis: "pilar",
    "red-flags": "pilar",
    report: "pilar",
    governance: "diferencial",
    agenda: "diferencial",
    nps: "diferencial",
    "discharge-report": "diferencial",
    "treatment-plan": "diferencial",
    "clinical-agent": "diferencial",
    documents: "subexposto",
    archive: "subexposto",
    "pain-diary": "subexposto",
    "express-reassessment": "subexposto",
    "clinical-impression": "subexposto",
    hep: "subexposto",
    questionnaires: "subexposto",
    "health-general": "subexposto",
    dynamometry: "subexposto",
    messaging: "subexposto",
    privacy: "subexposto",
    pricing: "pilar",
  },
};

export const topicsOfWorld = (world: WorldId): TopicId[] =>
  Object.keys(WORLD_TOPICS[world]) as TopicId[];

export const weightOfTopic = (world: WorldId, topic: TopicId): TopicWeight =>
  WORLD_TOPICS[world][topic] ?? "subexposto";

/** Multiplicador de prioridade editorial por peso estratégico. */
export const WEIGHT_PRIORITY: Record<TopicWeight, number> = {
  pilar: 1,
  diferencial: 1.35,
  subexposto: 1.8,
};
