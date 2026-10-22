/**
 * Segurança cardiovascular (Fase 2D) — fonte única dos perfis, teto de FC e
 * régua de alerta por perfil. Tudo é sugestão ao fisioterapeuta, nunca diagnóstico.
 * Refs: Gellish 2007 (FC máx.), ACSM 2021, Diretriz SBC Reabilitação 2020.
 */
import { formatHealthConditions, normalizeHealthHistory } from "@/lib/healthHistory";
export type CardioProfile = "athletic" | "healthy" | "sedentary" | "hypertensive" | "cardiac" | "pulmonary";

export const CARDIO_PROFILES: Array<{
  key: CardioProfile;
  label: string;
  ceilingPct: number;
  acwrMax: number;
  acwrAlert: number;
  rhrAlert: number;
}> = [
  { key: "athletic", label: "Atlético", ceilingPct: 0.9, acwrMax: 1.3, acwrAlert: 1.5, rhrAlert: 7 },
  { key: "healthy", label: "Saudável / ativo", ceilingPct: 0.85, acwrMax: 1.3, acwrAlert: 1.5, rhrAlert: 7 },
  { key: "sedentary", label: "Sedentário", ceilingPct: 0.75, acwrMax: 1.25, acwrAlert: 1.4, rhrAlert: 6 },
  { key: "hypertensive", label: "Hipertenso controlado", ceilingPct: 0.7, acwrMax: 1.2, acwrAlert: 1.3, rhrAlert: 5 },
  { key: "cardiac", label: "Cardiopata sob restrição", ceilingPct: 0.65, acwrMax: 1.2, acwrAlert: 1.3, rhrAlert: 5 },
  { key: "pulmonary", label: "Pneumopata / DPOC", ceilingPct: 0.7, acwrMax: 1.2, acwrAlert: 1.3, rhrAlert: 5 },
];

export const DEFAULT_CARDIO_PROFILE: CardioProfile = "healthy";
export const SPO2_ALERT = 92;

export function profileRule(p?: string | null) {
  return CARDIO_PROFILES.find((x) => x.key === p) ?? CARDIO_PROFILES[1];
}

export type AcwrZone = "undertraining" | "optimal" | "caution" | "danger";

/**
 * Zona de risco do ACWR com a régua do perfil — fonte única para força e cardio.
 * Sem perfil, usa "Saudável / ativo" (0,8–1,3 ideal; até 1,5 atenção).
 */
export function acwrZone(ratio: number | null, profile?: string | null): AcwrZone | null {
  if (ratio === null) return null;
  const r = profileRule(profile);
  if (ratio < 0.8) return "undertraining";
  if (ratio <= r.acwrMax) return "optimal";
  if (ratio <= r.acwrAlert) return "caution";
  return "danger";
}

export function ageFromBirth(birth?: string | null, today = new Date()): number | null {
  if (!birth) return null;
  const b = new Date(birth + "T00:00:00Z");
  if (Number.isNaN(b.getTime())) return null;
  let age = today.getUTCFullYear() - b.getUTCFullYear();
  const m = today.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < b.getUTCDate())) age--;
  return age >= 5 && age <= 110 ? age : null;
}

/** FC máx. estimada (Gellish): 207 − 0,7 × idade. */
export function estimatedMaxHr(age: number): number {
  return Math.round(207 - 0.7 * age);
}

export interface HrCeiling {
  ceiling: number | null;
  maxHr: number | null;
  source: "manual" | "estimated" | "unknown";
  profile: CardioProfile;
  pct: number;
}

export function hrCeiling(opts: { profile?: string | null; age?: number | null; override?: number | null }): HrCeiling {
  const rule = profileRule(opts.profile);
  if (opts.override && opts.override >= 60 && opts.override <= 230) {
    return { ceiling: opts.override, maxHr: opts.age ? estimatedMaxHr(opts.age) : null, source: "manual", profile: rule.key, pct: rule.ceilingPct };
  }
  if (!opts.age) return { ceiling: null, maxHr: null, source: "unknown", profile: rule.key, pct: rule.ceilingPct };
  const maxHr = estimatedMaxHr(opts.age);
  return { ceiling: Math.round(maxHr * rule.ceilingPct), maxHr, source: "estimated", profile: rule.key, pct: rule.ceilingPct };
}

export type SafetyFlag = "hr_above_ceiling" | "spo2_low";

export function checkinSafetyFlags(c: { peak_hr?: number | null; spo2?: number | null }, ceiling: number | null): SafetyFlag[] {
  const out: SafetyFlag[] = [];
  if (ceiling && typeof c.peak_hr === "number" && c.peak_hr > ceiling) out.push("hr_above_ceiling");
  if (typeof c.spo2 === "number" && c.spo2 < SPO2_ALERT) out.push("spo2_low");
  return out;
}

/** Comorbidades da anamnese só como lembrete — nunca classificam sozinhas. */
export function comorbidityHint(text?: string | null): string | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/(dpoc|pneumopat|enfisema|doen[cç]a pulmonar)/.test(t)) return "A anamnese cita condição pulmonar — confira o perfil e as restrições respiratórias.";
  if (/(cardiopat|infarto|insufici[eê]ncia card|arritmi|stent|angina|marca-?passo)/.test(t)) return "A anamnese cita condição cardíaca — confira o perfil.";
  if (/(hipertens|press[aã]o alta)/.test(t)) return "A anamnese cita hipertensão — confira o perfil.";
  return null;
}

/** Read structured condition IDs, not a regex over untranslated JSON keys. */
export function cardioHealthHint(raw: unknown): string | null {
  const h = normalizeHealthHistory(raw);
  const conditions = formatHealthConditions(h);
  if (!conditions || h.healthConditions?.every((id) => id === "none")) return null;
  const reminder = comorbidityHint(conditions);
  const unknownHypertension = h.healthConditions?.includes("hypertension") && !h.healthConditionsControl?.hypertension;
  return `${conditions}.${reminder ? ` ${reminder}` : " Confira as condições na prescrição do esforço."}${unknownHypertension ? " Controle da hipertensão não informado; não presumir que esteja controlada." : ""}`;
}

export const OXIMETER_GUIDE =
  "Sem monitor cardíaco (cinta, relógio ou pulseira)? Use um oxímetro de dedo: meça em repouso, ao fim da série ou bloco e após 2–3 min de recuperação.";

export type CardioQuadrant = "optimal" | "msk_spike" | "overreaching" | "extra_stress" | "detraining" | "insufficient";

/**
 * Matriz ACWR cardio × recuperação, com a régua do perfil. Sempre sugestão.
 * Recuperação: FC ao acordar (prioritária, quando há linha de base) ou, na
 * falta dela, a prontidão do check-in (`readinessStrained`).
 */
export function cardioMatrix(
  ratio: number | null,
  rhrDelta: number | null,
  profile?: string | null,
  readinessStrained = false,
): { quadrant: CardioQuadrant; text: string } {
  const r = profileRule(profile);
  if (ratio === null) return { quadrant: "insufficient", text: "Histórico de cardio insuficiente (mínimo 4 sessões em 14 dias)." };
  const hrHigh = rhrDelta !== null && rhrDelta >= r.rhrAlert;
  const strained = hrHigh || readinessStrained;
  const why = hrHigh ? "FC ao acordar elevada" : "prontidão baixa no check-in";
  if (ratio > r.acwrAlert && strained) return { quadrant: "overreaching", text: `Carga alta com ${why}: possível overreaching não funcional. Sugere deload (−50% da duração ou PSE ≤4).` };
  if (ratio > r.acwrAlert) return { quadrant: "msk_spike", text: "Pico agudo de carga com recuperação preservada: segure novos incrementos e reduza o impacto." };
  if (ratio < 0.8 && strained) return { quadrant: "extra_stress", text: `Carga baixa com ${why}: provável estresse fora do treino (sono, emocional, início de infecção). Investigue antes de progredir.` };
  if (ratio < 0.8) return { quadrant: "detraining", text: "Carga abaixo do habitual com boa recuperação: há espaço para progredir até 10%." };
  if (strained) return { quadrant: "extra_stress", text: `Carga na faixa, mas ${why}: mantenha a dose e acompanhe o próximo check-in.` };
  if (ratio <= r.acwrMax) return { quadrant: "optimal", text: "Adaptação aeróbia na faixa ideal." };
  return { quadrant: "msk_spike", text: "Carga cardio acima da faixa ideal do perfil: atenção." };
}
