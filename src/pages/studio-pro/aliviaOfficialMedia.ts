import type { TopicId } from "@/pages/studio/topics";
import type { AliviaDifferentialId } from "./aliviaDifferentials";

const TOPICS: Partial<Record<AliviaDifferentialId, TopicId>> = {
  "diferencial-pre-avaliacao": "assessment-link",
  "diferencial-avaliacao-manual": "steps-method",
  "diferencial-reavaliacao": "express-reassessment",
  "diferencial-agente-clinico": "clinical-agent",
  "diferencial-evolucao-voz": "voice-notes",
  "diferencial-hep-video": "hep",
  "diferencial-relatorios": "report",
  "diferencial-red-flags": "red-flags",
  "diferencial-avaliacao-externa-ia": "external-upload",
  "diferencial-insights": "clinical-impression",
  "diferencial-clinica-agenda": "agenda",
  "diferencial-clinica-padronizacao": "shared-record",
};

const PHOTOS: Partial<Record<AliviaDifferentialId, string[]>> = {
  "diferencial-pre-avaliacao": ["official:alivia:pre-assessment-start"],
  "diferencial-red-flags": ["official:alivia:red-flags-screening", "official:alivia:red-flags-positive"],
  "diferencial-hep-video": ["official:alivia:hep-exercise-list", "official:alivia:hep-exercise-video"],
  "diferencial-avaliacao-externa-ia": ["official:alivia:external-upload"],
  "diferencial-reavaliacao": ["official:alivia:express-reassessment-steps", "official:alivia:express-reassessment-tools"],
  "diferencial-avaliacao-manual": [
    "official:alivia:manual-anamnesis", "official:alivia:manual-pain-map",
    "official:alivia:manual-pain-mechanism", "official:alivia:manual-clinical-notes",
    "official:alivia:manual-mobility", "official:alivia:manual-dynamometry",
  ],
  "diferencial-agente-clinico": ["official:alivia:clinical-agent", "official:alivia:evidence-library", "official:alivia:clinical-agent-case"],
  "diferencial-relatorios": [
    "official:alivia:record-summary-hypothesis", "official:alivia:record-summary-details",
    "official:alivia:record-pain-map", "official:alivia:record-questionnaires",
    "official:alivia:record-health-conditions",
  ],
  "diferencial-insights": ["official:alivia:insights", "official:alivia:professional-dashboard"],
  "diferencial-clinica-agenda": ["official:alivia:agenda"],
  "diferencial-clinica-padronizacao": ["official:alivia:professional-dashboard"],
};

export const topicForDifferential = (id: AliviaDifferentialId) => TOPICS[id];
export const officialPhotoIdsForDifferential = (id: AliviaDifferentialId) => PHOTOS[id];