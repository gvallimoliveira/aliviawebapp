/**
 * Diagnóstico Diferencial Assistido.
 *
 * Regra central: a ferramenta só é OFERECIDA quando a hipótese da IA tem
 * confiança baixa ou moderada. Com confiança alta o profissional não é
 * incomodado (nada renderiza).
 *
 * O conteúdo é gerado sob demanda (clique) e persistido dentro de
 * `assessments.diagnosis.differentialDiagnosis` — sem migração de schema.
 */

export type Plausibility = "high" | "medium" | "low";

export interface DifferentialItem {
  /** Rótulo diagnóstico curto (mesmo padrão da hipótese principal). */
  hypothesis: string;
  plausibility: Plausibility;
  /** Por que compete com a hipótese principal (achados do paciente). */
  competesBecause: string;
  /** O que hoje fala contra esta alternativa. */
  arguesAgainst?: string | null;
  /** Discriminadores práticos (teste, pergunta, medida, teste terapêutico). */
  discriminators: string[];
  /** Consequência prática de errar. */
  whyItMatters: string;
  /** Alternativa extra-musculoesquelética → sinaliza encaminhamento. */
  referralFlag?: boolean;
}

export interface DifferentialDiagnosisData {
  differentials: DifferentialItem[];
  generatedAt: string;
  model?: string | null;
  /** Incluir bloco no PDF (desligado por padrão). */
  includeInPdf?: boolean;
}

const LOW_OR_MODERATE = new Set(["low", "moderate", "medium", "baixa", "moderada", "média", "media"]);

export function normalizeConfidence(value: unknown): string | null {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

/** Confiança que justifica oferecer o diferencial (baixa/moderada, ou ausente). */
export function isLowOrModerateConfidence(assessment: any): boolean {
  const conf = normalizeConfidence(assessment?.diagnosis?.confidence);
  if (!conf) return true; // sem confiança declarada = não é "alta"
  return LOW_OR_MODERATE.has(conf);
}

/**
 * Gate único usado no prontuário e no fluxo manual.
 * - existe hipótese da IA
 * - confiança baixa/moderada (nunca "high")
 * - ainda não há hipótese final registrada pelo profissional
 */
export function shouldOfferDifferential(assessment: any): boolean {
  if (!assessment) return false;
  const hypothesis = assessment?.diagnosis?.hypothesis;
  if (!hypothesis || !String(hypothesis).trim()) return false;
  if (assessment?.final_hypothesis && String(assessment.final_hypothesis).trim()) return false;
  return isLowOrModerateConfidence(assessment);
}

export function getDifferentialData(assessment: any): DifferentialDiagnosisData | null {
  const raw = assessment?.diagnosis?.differentialDiagnosis;
  if (!raw || !Array.isArray(raw.differentials) || raw.differentials.length === 0) return null;
  return raw as DifferentialDiagnosisData;
}

export function sanitizeDifferentials(input: any): DifferentialItem[] {
  const list = Array.isArray(input) ? input : Array.isArray(input?.differentials) ? input.differentials : [];
  return list
    .map((d: any) => ({
      hypothesis: String(d?.hypothesis || "").trim(),
      plausibility: (["high", "medium", "low"].includes(String(d?.plausibility)) ? d.plausibility : "medium") as Plausibility,
      competesBecause: String(d?.competesBecause || "").trim(),
      arguesAgainst: d?.arguesAgainst ? String(d.arguesAgainst).trim() : null,
      discriminators: (Array.isArray(d?.discriminators) ? d.discriminators : [])
        .map((s: any) => String(s || "").trim())
        .filter(Boolean)
        .slice(0, 3),
      whyItMatters: String(d?.whyItMatters || "").trim(),
      referralFlag: !!d?.referralFlag,
    }))
    .filter((d: DifferentialItem) => d.hypothesis && d.competesBecause)
    .slice(0, 4);
}

export const PLAUSIBILITY_LABEL: Record<Plausibility, { pt: string; en: string; es: string }> = {
  high: { pt: "Plausibilidade alta", en: "High plausibility", es: "Plausibilidad alta" },
  medium: { pt: "Plausibilidade média", en: "Medium plausibility", es: "Plausibilidad media" },
  low: { pt: "Plausibilidade baixa", en: "Low plausibility", es: "Plausibilidad baja" },
};

export function confidenceLabelPt(assessment: any): string {
  const conf = normalizeConfidence(assessment?.diagnosis?.confidence);
  if (conf === "low" || conf === "baixa") return "Confiança baixa";
  if (!conf) return "Confiança não declarada";
  return "Confiança moderada";
}

/**
 * Diferencial de DEMONSTRAÇÃO (demo profissional e demo clínica).
 * Não chama IA: retorna 1 única alternativa (em vez de 2–4) para agilizar a
 * navegação no ambiente simulado, escolhida por região a partir da hipótese.
 */
export function buildDemoDifferential(diagnosis: any): DifferentialDiagnosisData {
  const h = String(diagnosis?.hypothesis || "").toLowerCase();

  const knee: DifferentialItem = {
    hypothesis: "Tendinopatia patelar",
    plausibility: "medium",
    competesBecause:
      "Dor anterior de joelho em agachamento e escadas também é típica de sobrecarga do tendão patelar, sobretudo com histórico de aumento de volume de treino.",
    arguesAgainst: "Dor difusa peripatelar e crepitação apontam mais para irritação femoropatelar do que para dor focal no tendão.",
    discriminators: [
      "Palpação focal do polo inferior da patela vs. facetas patelares",
      "Agachamento em declive (25°) unipodal: dor focal no tendão sugere tendinopatia",
      "Teste terapêutico: isometria de extensão 5x45s — alívio imediato favorece tendinopatia",
    ],
    whyItMatters:
      "Muda a dosagem: tendinopatia responde a carga isométrica/progressiva no tendão; dor femoropatelar pede controle de quadril e ajuste de carga articular.",
  };

  const lumbar: DifferentialItem = {
    hypothesis: "Dor de origem sacroilíaca",
    plausibility: "medium",
    competesBecause:
      "Dor lombar baixa unilateral que piora ao levantar da cadeira e em apoio unipodal pode ser gerada na articulação sacroilíaca, imitando padrão mecânico lombar.",
    arguesAgainst: "Padrão de dor que muda com flexão/extensão repetida sugere componente lombar segmentar.",
    discriminators: [
      "Cluster de Laslett (≥3 testes positivos)",
      "Movimentos repetidos (McKenzie): resposta direcional favorece origem lombar",
      "Localização apontada pelo paciente com um dedo (Fortin sign)",
    ],
    whyItMatters: "Direciona o plano: estabilização/carga em cadeia posterior e pelve vs. preferência direcional lombar.",
  };

  const shoulder: DifferentialItem = {
    hypothesis: "Dor cervical referida (C5-C6)",
    plausibility: "medium",
    competesBecause:
      "Dor lateral de ombro sem restrição concordante e com piora em posturas prolongadas de cabeça/pescoço pode ser referida da coluna cervical.",
    arguesAgainst: "Dor reprodutível em testes resistidos do manguito favorece origem local no ombro.",
    discriminators: [
      "Testes de compressão/distração cervical e Spurling",
      "Reprodução da dor por movimentos ativos cervicais isolados",
      "Alívio dos sintomas do ombro após mobilização cervical (teste terapêutico)",
    ],
    whyItMatters: "Evita tratar o ombro por semanas quando a fonte é cervical, retardando a resposta clínica.",
  };

  const generic: DifferentialItem = {
    hypothesis: "Sensibilização central com componente nociplástico",
    plausibility: "medium",
    competesBecause:
      "Dor persistente, desproporcional aos achados e com piora ligada a sono/estresse sugere modulação central sobreposta ao quadro mecânico.",
    arguesAgainst: "Padrão mecânico claro (piora/alívio previsíveis com carga) ainda sustenta a hipótese principal.",
    discriminators: [
      "Triagem de mecanismo de dor (critérios de Kosek/Nijs)",
      "Central Sensitization Inventory e qualidade do sono",
      "Resposta à carga graduada em 2 semanas",
    ],
    whyItMatters:
      "Altera a estratégia: educação em dor, regularidade e exposição graduada ganham peso sobre progressão agressiva de carga.",
  };

  const pick = /joelho|patel|condromal|femoropat/.test(h)
    ? knee
    : /lomb|sacro|disc|l4|l5|hérnia|hernia/.test(h)
      ? lumbar
      : /ombro|manguito|escapul|cervic/.test(h)
        ? shoulder
        : generic;

  return {
    differentials: [pick],
    generatedAt: new Date().toISOString(),
    model: "demo",
    includeInPdf: false,
  };
}
