/** Testes funcionais cardiorrespiratórios: cálculo e interpretação por regras fixas (sem IA). */
export type FunctionalTestType = "tsl1" | "tc6m" | "td6m";

export interface FunctionalTestData {
  sex?: "M" | "F" | null;
  age?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  result?: number | null; // repetições, metros ou subidas
  predictedManual?: number | null; // previsto informado (tabela de referência)
  hrRest?: number | null;
  hrPeak?: number | null;
  hrRecovery1?: number | null;
  recoveryActive?: boolean;
  spo2Rest?: number | null;
  spo2Min?: number | null;
  borgDyspneaRest?: number | null;
  borgDyspneaPeak?: number | null;
  borgLegsRest?: number | null;
  borgLegsPeak?: number | null;
  betaBlocker?: boolean;
}

export const TEST_INFO: Record<FunctionalTestType, { label: string; unit: string; reference: string; setup: string }> = {
  tsl1: {
    label: "Sentar e levantar 1 minuto (TSL 1-min)",
    unit: "repetições",
    reference: "Strassmann et al., 2013 (tabelas por idade e sexo) — informe o previsto da tabela.",
    setup: "Cadeira sem braços de 44–47 cm encostada na parede, braços cruzados no peito, máximo de repetições em 60 s.",
  },
  tc6m: {
    label: "Caminhada de 6 minutos (TC6M)",
    unit: "metros",
    reference: "Britto et al., 2013 (equação brasileira): 890,46 − 6,11×idade + 0,0345×idade² + 48,87×sexo(M=1) − 4,87×IMC.",
    setup: "Corredor plano de 30 m demarcado, frases padronizadas a cada minuto, sem correr.",
  },
  td6m: {
    label: "Degrau de 6 minutos (TD6M)",
    unit: "subidas",
    reference: "Valores brasileiros (Arcuri/Pessoa) — informe o previsto da referência usada.",
    setup: "Degrau único de 20 cm, ritmo livre, subir e descer o máximo possível em 6 minutos.",
  },
};

const num = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const r0 = (n: number) => Math.round(n);

export function predictedValue(type: FunctionalTestType, d: FunctionalTestData): { value: number | null; source: "equation" | "manual" | null } {
  if (type === "tc6m" && num(d.age) && num(d.heightCm) && num(d.weightKg) && d.sex) {
    const bmi = d.weightKg / Math.pow(d.heightCm / 100, 2);
    const v = 890.46 - 6.11 * d.age + 0.0345 * d.age * d.age + 48.87 * (d.sex === "M" ? 1 : 0) - 4.87 * bmi;
    return { value: r0(v), source: "equation" };
  }
  if (num(d.predictedManual) && d.predictedManual > 0) return { value: d.predictedManual, source: "manual" };
  return { value: null, source: null };
}

export interface FunctionalTestReport {
  predicted: number | null;
  predictedSource: "equation" | "manual" | null;
  percentPredicted: number | null;
  hrMax: number | null;
  pctHrMax: number | null;
  pctHrReserve: number | null;
  hrRise: number | null;
  hrRecoveryDrop: number | null;
  spo2Drop: number | null;
  alerts: string[];
  patterns: { key: string; title: string; conduct: string }[];
  notes: string[];
}

export function analyzeFunctionalTest(type: FunctionalTestType, d: FunctionalTestData): FunctionalTestReport {
  const { value: predicted, source } = predictedValue(type, d);
  const percentPredicted = predicted && num(d.result) ? r0((d.result / predicted) * 100) : null;
  const hrMax = num(d.age) ? r0(207 - 0.7 * d.age) : null;
  const pctHrMax = hrMax && num(d.hrPeak) ? r0((d.hrPeak / hrMax) * 100) : null;
  const pctHrReserve = hrMax && num(d.hrPeak) && num(d.hrRest) && hrMax > d.hrRest
    ? r0(((d.hrPeak - d.hrRest) / (hrMax - d.hrRest)) * 100) : null;
  const hrRise = num(d.hrPeak) && num(d.hrRest) ? d.hrPeak - d.hrRest : null;
  const hrRecoveryDrop = num(d.hrPeak) && num(d.hrRecovery1) ? d.hrPeak - d.hrRecovery1 : null;
  const spo2Drop = num(d.spo2Rest) && num(d.spo2Min) ? d.spo2Rest - d.spo2Min : null;

  const alerts: string[] = [];
  if (num(d.spo2Min) && d.spo2Min < 92) alerts.push(`SpO₂ mínima de ${d.spo2Min}% (abaixo de 92%): sinal de triagem — investigar dessaturação ao esforço.`);
  if (spo2Drop != null && spo2Drop >= 4) alerts.push(`Queda de SpO₂ de ${spo2Drop} pontos (≥ 4): dessaturação induzida pelo esforço.`);
  if (hrRecoveryDrop != null) {
    const cut = d.recoveryActive ? 12 : 18;
    if (hrRecoveryDrop < cut) alerts.push(`Recuperação da FC de ${hrRecoveryDrop} bpm em 1 min (< ${cut} bpm, ${d.recoveryActive ? "recuperação ativa" : "recuperação passiva"}): possível atraso da reativação vagal.`);
  }

  const dysP = d.borgDyspneaPeak, legP = d.borgLegsPeak;
  const patterns: FunctionalTestReport["patterns"] = [];
  const spo2Flag = (spo2Drop != null && spo2Drop >= 4);
  if (num(dysP) && num(legP) && dysP >= 5 && legP < 4 && ((pctHrMax != null && pctHrMax < 75) || spo2Flag)) {
    patterns.push({ key: "ventilatory", title: "Padrão sugestivo de limitação ventilatória", conduct: "Considerar treino intervalado de baixa carga, estratégias de controle respiratório e progressão guiada pela dispneia (Borg)." });
  }
  if (num(dysP) && num(legP) && legP >= 6 && dysP < 4 && (pctHrMax == null || pctHrMax < 85)) {
    patterns.push({ key: "peripheral", title: "Padrão sugestivo de limitação muscular periférica", conduct: "Considerar priorizar fortalecimento de membros inferiores e resistência muscular local." });
  }
  if (hrRise != null && hrRise < 20 && num(dysP) && num(legP) && (dysP >= 3 || legP >= 3)) {
    patterns.push({ key: "chronotropic", title: d.betaBlocker ? "Resposta de FC atenuada, compatível com betabloqueador" : "Resposta de FC atenuada (subida < 20 bpm)", conduct: "Dosar a intensidade pela escala de Borg em vez da FC; " + (d.betaBlocker ? "efeito farmacológico esperado." : "verificar medicações e investigar incompetência cronotrópica.") });
  }
  if (pctHrReserve != null && pctHrReserve > 85 && num(dysP) && num(legP) && Math.abs(dysP - legP) <= 2 && !d.betaBlocker) {
    patterns.push({ key: "deconditioning", title: "Padrão sugestivo de descondicionamento cardiovascular", conduct: "Considerar treino aeróbio progressivo em zonas moderadas, com progressão de volume antes da intensidade." });
  }

  const notes: string[] = [];
  if (d.betaBlocker) notes.push("Betabloqueador: a FC fica menos confiável; priorize o Borg para interpretar o esforço.");
  if (!patterns.length) notes.push("Nenhum padrão limitante claro pelos critérios usados. Interprete junto com a avaliação clínica.");
  notes.push("Hipóteses de apoio ao raciocínio clínico; a conduta final é do fisioterapeuta.");

  return { predicted, predictedSource: source, percentPredicted, hrMax, pctHrMax, pctHrReserve, hrRise, hrRecoveryDrop, spo2Drop, alerts, patterns, notes };
}

export const STOP_CRITERIA = [
  "Dor ou aperto no peito",
  "Falta de ar intensa (Borg dispneia ≥ 7) ou chiado",
  "Tontura, palidez, suor frio ou confusão",
  "SpO₂ abaixo de 85% (ou do alvo individual definido pelo fisioterapeuta)",
  "Dor nas pernas que impeça continuar ou desequilíbrio",
];
