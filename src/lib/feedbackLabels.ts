import type { CommentArea, FeedbackArea, Sentiment } from "./feedbackMetrics";

export type FbLang = "pt" | "en" | "es";
type Tri = Record<FbLang, string>;
const pick = (m: Record<string, Tri>, key: string, l: FbLang) => m[key]?.[l] ?? key;

const SERVICES: Record<string, Tri> = {
  fisioterapia: { pt: "Fisioterapia", en: "Physiotherapy", es: "Fisioterapia" },
  pilates: { pt: "Pilates", en: "Pilates", es: "Pilates" },
  osteopatia: { pt: "Osteopatia", en: "Osteopathy", es: "Osteopatía" },
  massoterapia: { pt: "Massoterapia", en: "Massage therapy", es: "Masoterapia" },
  rpg: { pt: "RPG", en: "RPG", es: "RPG" },
};

const ITEMS: Record<string, Tri> = {
  quality: { pt: "Qualidade do atendimento", en: "Quality of care", es: "Calidad de la atención" },
  result: { pt: "Resultado percebido", en: "Perceived result", es: "Resultado percibido" },
  communication: { pt: "Comunicação e clareza", en: "Communication and clarity", es: "Comunicación y claridad" },
  punctuality: { pt: "Pontualidade", en: "Punctuality", es: "Puntualidad" },
  empathy: { pt: "Acolhimento e empatia", en: "Warmth and empathy", es: "Acogida y empatía" },
  cleanliness: { pt: "Limpeza e organização", en: "Cleanliness and order", es: "Limpieza y organización" },
  scheduling: { pt: "Facilidade de agendamento", en: "Ease of booking", es: "Facilidad para agendar" },
  environment: { pt: "Ambiente e conforto", en: "Environment and comfort", es: "Ambiente y comodidad" },
};

const ANSWERS: Record<string, Tri> = {
  excelente: { pt: "Excelente", en: "Excellent", es: "Excelente" },
  bom: { pt: "Bom", en: "Good", es: "Bueno" },
  regular: { pt: "Regular", en: "Fair", es: "Regular" },
  ruim: { pt: "Ruim", en: "Poor", es: "Malo" },
  superou: { pt: "Superou expectativas", en: "Exceeded expectations", es: "Superó expectativas" },
  atendeu: { pt: "Atendeu", en: "Met expectations", es: "Cumplió" },
  parcialmente: { pt: "Parcialmente", en: "Partially", es: "Parcialmente" },
  nao_atendeu: { pt: "Não atendeu", en: "Did not meet", es: "No cumplió" },
  sempre: { pt: "Sempre pontual", en: "Always on time", es: "Siempre puntual" },
  geralmente: { pt: "Geralmente pontual", en: "Usually on time", es: "Generalmente puntual" },
  as_vezes: { pt: "Às vezes atrasa", en: "Sometimes late", es: "A veces se atrasa" },
  frequentemente: { pt: "Frequentemente atrasa", en: "Often late", es: "Se atrasa con frecuencia" },
  muito_facil: { pt: "Muito fácil", en: "Very easy", es: "Muy fácil" },
  facil: { pt: "Fácil", en: "Easy", es: "Fácil" },
  dificil: { pt: "Difícil", en: "Hard", es: "Difícil" },
  muito_dificil: { pt: "Muito difícil", en: "Very hard", es: "Muy difícil" },
  sim: { pt: "Sim", en: "Yes", es: "Sí" },
  talvez: { pt: "Talvez", en: "Maybe", es: "Tal vez" },
  nao: { pt: "Não", en: "No", es: "No" },
};

const AREAS: Record<string, Tri> = {
  service: { pt: "Tratamento e resultado", en: "Treatment and result", es: "Tratamiento y resultado" },
  professional: { pt: "Profissional", en: "Professional", es: "Profesional" },
  clinic: { pt: "Clínica e recepção", en: "Clinic and front desk", es: "Clínica y recepción" },
};

const COMMENT_AREAS: Record<string, Tri> = {
  service: { pt: "Sobre o serviço", en: "About the service", es: "Sobre el servicio" },
  professional: { pt: "Sobre o profissional", en: "About the professional", es: "Sobre el profesional" },
  clinic: { pt: "Sobre a clínica", en: "About the clinic", es: "Sobre la clínica" },
  general: { pt: "Observação geral", en: "General comment", es: "Observación general" },
};

const SENTIMENTS: Record<string, Tri> = {
  promoter: { pt: "Recomendaria", en: "Would recommend", es: "Recomendaría" },
  passive: { pt: "Talvez recomende", en: "Might recommend", es: "Tal vez recomiende" },
  detractor: { pt: "Não recomendaria", en: "Would not recommend", es: "No recomendaría" },
  unknown: { pt: "Sem resposta de recomendação", en: "No recommendation answer", es: "Sin respuesta de recomendación" },
};

export const serviceLabel = (key: string, l: FbLang) => pick(SERVICES, key, l);
export const itemLabel = (key: string, l: FbLang) => pick(ITEMS, key, l);
export const answerLabel = (key: string, l: FbLang) => pick(ANSWERS, key, l);
export const areaLabel = (key: FeedbackArea, l: FbLang) => pick(AREAS, key, l);
export const commentAreaLabel = (key: CommentArea, l: FbLang) => pick(COMMENT_AREAS, key, l);
export const sentimentLabel = (key: Sentiment, l: FbLang) => pick(SENTIMENTS, key, l);
