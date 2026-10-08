// Análise cardiovascular das sessões monitoradas — fonte única para o painel do
// prontuário e para o relatório especial (técnico e do paciente).
// Função pura e determinística: sem IA, sem rede. Mesmo dado = mesmo texto.
// Sempre sugestão ao fisioterapeuta, nunca diagnóstico.
//
// Referências: OMS 2020 (metas semanais), ACSM 2021, Diretriz SBC de
// Reabilitação Cardiovascular 2020, Diretriz Brasileira de Hipertensão 2020,
// Cole 1999 (recuperação da FC), Seiler 2010 (distribuição polarizada),
// Edwards 1993 (TRIMP por zonas), Foster 2001 (sRPE), Gellish 2007 (FC máx.).

import { type CardioProfile, type HrCeiling, SPO2_ALERT, profileRule } from "./cardioSafety";
import { edwardsZone, sanitizeZones, srpeLoad, type ZoneMinutes } from "./cardioLoad";

export interface CardioEntryLike {
  id: string;
  session_date: string;
  track: string;
  duration_min: number;
  rpe: number;
  training_load?: number | null;
  hr_avg?: number | null;
  hr_max?: number | null;
  spo2_min?: number | null;
  zone_minutes?: unknown;
  trimp?: number | null;
  monitor_source?: string | null;
  patient_rpe?: number | null;
  hr_recovery_1min?: number | null;
  distance_km?: number | null;
  avg_power_w?: number | null;
}

export interface RestingHrLike {
  checkin_date: string;
  resting_hr?: number | null;
}

/* ------------------------------------------------------------- metas */

export interface CardioGoal {
  title: string;
  intensity: string;
  weekly: string;
  distribution: "polarized" | "prescribed";
  /** Faixa de PSE (0–10) da zona prescrita para os perfis clínicos. */
  rpeRange: [number, number];
  source: string;
}

export const WHO_MODERATE_MIN = 150;
export const WHO_MODERATE_MAX = 300;
export const RECOVERY_LOW = 12;
export const RECOVERY_GOOD = 20;

export const CARDIO_GOALS: Record<CardioProfile, CardioGoal> = {
  pulmonary: {
    title: "Pneumopata / DPOC",
    intensity: "Esforço global individualizado, com dispneia e SpO₂ acompanhadas separadamente; FC complementar",
    weekly: "Construir atividade regular conforme tolerância e avaliação respiratória; 150 min/semana é referência geral, não obrigação clínica imediata",
    distribution: "prescribed",
    rpeRange: [3, 5],
    source: "ATS 2023; ATS/ERS 2013; OMS 2020",
  },
  cardiac: {
    title: "Cardiopata sob restrição",
    intensity: "Esforço global inicial PSE 3–5, individualizado pelo teste, sintomas e medicação; Borg 6–20 é escala distinta",
    weekly: "Referência de 150 min/semana, construída aos poucos (3–5 sessões de 30–60 min)",
    distribution: "prescribed",
    rpeRange: [3, 5],
    source: "Diretriz SBC de Reabilitação Cardiovascular 2020; ACSM 2021",
  },
  hypertensive: {
    title: "Hipertenso controlado",
    intensity: "Moderada, PSE 3–6, abaixo do teto de FC",
    weekly: "150 min/semana moderados (ex.: 30 min, 5 dias)",
    distribution: "prescribed",
    rpeRange: [3, 6],
    source: "Diretriz Brasileira de Hipertensão Arterial 2020; ACSM 2021",
  },
  sedentary: {
    title: "Sedentário",
    intensity: "Leve a moderada, PSE 3–6, progressão gradual",
    weekly: "Progressão até 150 min/semana moderados",
    distribution: "prescribed",
    rpeRange: [3, 6],
    source: "OMS 2020; ACSM 2021",
  },
  healthy: {
    title: "Saudável / ativo",
    intensity: "Moderada a vigorosa, com predomínio de intensidade leve/moderada",
    weekly: "150–300 min moderados ou 75–150 min vigorosos (1 min vigoroso = 2 moderados)",
    distribution: "polarized",
    rpeRange: [3, 8],
    source: "OMS 2020",
  },
  athletic: {
    title: "Atlético",
    intensity: "Distribuição polarizada: cerca de 80% leve/moderado e 20% intenso",
    weekly: "Volume individualizado, progressão de carga ≤10%/semana",
    distribution: "polarized",
    rpeRange: [3, 10],
    source: "Seiler 2010; Gabbett 2016",
  },
};

export const CARDIO_REFERENCES = [
  "World Health Organization. WHO guidelines on physical activity and sedentary behaviour. Geneva: WHO; 2020.",
  "American College of Sports Medicine. ACSM's Guidelines for Exercise Testing and Prescription. 11ª ed. Wolters Kluwer; 2021.",
  "Carvalho T, et al. Diretriz Brasileira de Reabilitação Cardiovascular – 2020. Arq Bras Cardiol. 2020;114(5):943-987.",
  "Barroso WKS, et al. Diretrizes Brasileiras de Hipertensão Arterial – 2020. Arq Bras Cardiol. 2021;116(3):516-658.",
  "Cole CR, et al. Heart-rate recovery immediately after exercise as a predictor of mortality. N Engl J Med. 1999;341(18):1351-1357.",
  "Seiler S. What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform. 2010;5(3):276-291.",
  "Edwards S. The Heart Rate Monitor Book. Polar Electro Oy; 1993.",
  "Foster C, et al. A new approach to monitoring exercise training. J Strength Cond Res. 2001;15(1):109-115.",
  "Gellish RL, et al. Longitudinal modeling of the relationship between age and maximal heart rate. Med Sci Sports Exerc. 2007;39(5):822-829.",
  "Gabbett TJ. The training-injury prevention paradox. Br J Sports Med. 2016;50(5):273-280.",
  "Rochester CL, et al. Pulmonary Rehabilitation for Adults with Chronic Respiratory Disease: An Official ATS Clinical Practice Guideline. Am J Respir Crit Care Med. 2023;208:e7-e26.",
  "Spruit MA, et al. An Official ATS/ERS Statement: Key Concepts and Advances in Pulmonary Rehabilitation. Am J Respir Crit Care Med. 2013;188:e13-e64.",
];

export const CARDIO_CAVEATS = [
  "A FC máxima estimada pela idade tem desvio de ±8–12 bpm; um teste ergométrico permite ajustar o teto manualmente.",
  "Betabloqueadores achatam a resposta da FC: nesses casos o esforço percebido (PSE/Borg) é o guia principal.",
  "As zonas são calculadas em % da FC máxima (modelo de Edwards); o limite entre moderado (Z2–Z3) e vigoroso (Z4–Z5) é aproximado.",
  "Esta análise é um apoio ao acompanhamento e não substitui avaliação médica.",
  "Os tetos por perfil são referências operacionais, não limites universais de segurança. Em pneumopatas, a FC não substitui dispneia, sintomas e alvo individual de SpO₂.",
  "PSE global 0–10, Borg CR10 e Borg 6–20 não têm conversão exata. Zonas Edwards e equivalência OMS são aproximações; o app não mede VO₂máx nem adaptações mitocondriais.",
  "Recuperação da FC depende do protocolo: pico menos FC após 1 minuto é uma aproximação, não substitui teste padronizado.",
];

/* ------------------------------------------------------------- helpers */

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

export const addIsoDays = (iso: string, n: number): string => {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const shortDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

/** PSE (0–10) convertida para a zona equivalente (1–5) de percepção. */
export function perceivedZone(rpe: number): number {
  if (rpe < 3) return 1;
  if (rpe < 5) return 2;
  if (rpe < 7) return 3;
  if (rpe < 9) return 4;
  return 5;
}

/** Sessões que contam para a meta aeróbia: cardio, outro esporte ou qualquer sessão com dados do monitor. */
export function isAerobic(e: CardioEntryLike): boolean {
  return e.track === "cardio" || e.track === "sport" || isNum(e.hr_avg) || !!sanitizeZones(e.zone_minutes as number[] | null);
}

/* ------------------------------------------------------------- sessão */

export type IntensitySource = "zones" | "avg_hr" | "rpe";
export type CoherenceStatus = "aligned" | "heart_higher" | "perceived_higher";
export type RecoveryStatus = "low" | "adequate" | "good";
export type SessionFlag = "hr_above_ceiling" | "spo2_low" | "recovery_low" | "heart_higher";

export interface SessionAnalysis {
  id: string;
  date: string;
  track: string;
  durationMin: number;
  rpe: number;
  aerobic: boolean;
  zones: ZoneMinutes | null;
  intensity: { light: number; moderate: number; vigorous: number; source: IntensitySource };
  srpe: number;
  trimp: number | null;
  hrAvg: number | null;
  hrMax: number | null;
  hrAvgPctMax: number | null;
  hrMaxPctMax: number | null;
  /** Minutos estimados acima do teto (só com zonas e FC máx. conhecida). */
  minutesAboveCeiling: number | null;
  pctAboveCeiling: number | null;
  aboveCeiling: boolean;
  spo2Min: number | null;
  spo2Low: boolean;
  coherence: { hrZone: number; perceivedZone: number; diff: number; status: CoherenceStatus } | null;
  recovery: { drop: number; status: RecoveryStatus } | null;
  paceMinKm: number | null;
  speedKmh: number | null;
  /** Metros por batimento (corrida/caminhada) ou watts por bpm (bicicleta). */
  efficiency: { kind: "speed" | "power"; value: number } | null;
  /** Perfis clínicos: sessão dentro da zona prescrita (PSE na faixa e FC abaixo do teto). */
  inPrescribedZone: boolean | null;
  flags: SessionFlag[];
}

export interface AnalysisContext {
  profile: CardioProfile;
  betaBlocker: boolean;
  ceiling: HrCeiling;
}

function classify(zoneOrRpe: number, by: "zone" | "rpe"): "light" | "moderate" | "vigorous" {
  if (by === "rpe") return zoneOrRpe >= 7 ? "vigorous" : zoneOrRpe >= 5 ? "moderate" : "light";
  return zoneOrRpe >= 4 ? "vigorous" : zoneOrRpe >= 2 ? "moderate" : "light";
}

/** Minutos acima do teto, interpolando dentro da zona que contém o teto. */
function minutesAbove(zones: ZoneMinutes, ceiling: number, maxHr: number): number {
  const frac = ceiling / maxHr;
  let total = 0;
  zones.forEach((m, i) => {
    const lo = 0.5 + 0.1 * i;
    const hi = i === 4 ? 1 : lo + 0.1;
    if (frac <= lo) total += m;
    else if (frac < hi) total += m * ((hi - frac) / (hi - lo));
  });
  return round1(total);
}

export function analyzeSession(e: CardioEntryLike, ctx: AnalysisContext): SessionAnalysis {
  const maxHr = ctx.ceiling.maxHr;
  const ceiling = ctx.ceiling.ceiling;
  const zones = sanitizeZones(e.zone_minutes as number[] | null);
  const dur = Math.max(0, Number(e.duration_min) || 0);
  const rpe = Number(e.rpe) || 0;
  const hrAvg = isNum(e.hr_avg) && e.hr_avg > 0 ? e.hr_avg : null;
  const hrMax = isNum(e.hr_max) && e.hr_max > 0 ? e.hr_max : null;

  // Intensidade: betabloqueador ou sem FC → PSE; com zonas → zonas; senão FC média.
  let intensity: SessionAnalysis["intensity"];
  if (!ctx.betaBlocker && zones) {
    intensity = { light: zones[0], moderate: zones[1] + zones[2], vigorous: zones[3] + zones[4], source: "zones" };
  } else if (!ctx.betaBlocker && hrAvg && maxHr) {
    const c = classify(edwardsZone(hrAvg, maxHr), "zone");
    intensity = { light: 0, moderate: 0, vigorous: 0, source: "avg_hr" };
    intensity[c] = dur;
  } else {
    const c = classify(rpe, "rpe");
    intensity = { light: 0, moderate: 0, vigorous: 0, source: "rpe" };
    intensity[c] = dur;
  }

  // TRIMP: usa o salvo; se faltar, recalcula com zonas ou FC média.
  let trimpValue: number | null = isNum(e.trimp) ? e.trimp : null;
  if (trimpValue === null && zones) trimpValue = Math.round(zones.reduce((s, m, i) => s + m * (i + 1), 0));
  if (trimpValue === null && hrAvg && maxHr && dur > 0) trimpValue = Math.round(dur * edwardsZone(hrAvg, maxHr));

  const aboveCeiling = !!(ceiling && hrMax && hrMax > ceiling);
  const minutesAboveCeiling = zones && ceiling && maxHr ? minutesAbove(zones, ceiling, maxHr) : null;
  const zoneTotal = zones ? zones.reduce((a, b) => a + b, 0) : 0;
  const pctAboveCeiling = minutesAboveCeiling !== null && zoneTotal > 0 ? Math.round((minutesAboveCeiling / zoneTotal) * 100) : null;
  const spo2Min = isNum(e.spo2_min) && e.spo2_min > 0 ? e.spo2_min : null;
  const spo2Low = spo2Min !== null && spo2Min < SPO2_ALERT;

  let coherence: SessionAnalysis["coherence"] = null;
  if (trimpValue !== null && dur > 0 && (zones || (hrAvg && maxHr))) {
    const hrZone = round1(trimpValue / dur);
    const pz = perceivedZone(rpe);
    const diff = round1(hrZone - pz);
    const status: CoherenceStatus = diff >= 1.5 ? "heart_higher" : diff <= -1.5 ? "perceived_higher" : "aligned";
    coherence = { hrZone, perceivedZone: pz, diff, status };
  }

  let recovery: SessionAnalysis["recovery"] = null;
  if (hrMax && isNum(e.hr_recovery_1min) && e.hr_recovery_1min > 0 && e.hr_recovery_1min < hrMax) {
    const drop = Math.round(hrMax - e.hr_recovery_1min);
    recovery = { drop, status: drop <= RECOVERY_LOW ? "low" : drop > RECOVERY_GOOD ? "good" : "adequate" };
  }

  const dist = isNum(e.distance_km) && e.distance_km > 0 ? e.distance_km : null;
  const paceMinKm = dist && dur > 0 ? round1(dur / dist) : null;
  const speedKmh = dist && dur > 0 ? round1(dist / (dur / 60)) : null;
  let efficiency: SessionAnalysis["efficiency"] = null;
  if (hrAvg && isNum(e.avg_power_w) && e.avg_power_w > 0) efficiency = { kind: "power", value: round2(e.avg_power_w / hrAvg) };
  else if (hrAvg && dist && dur > 0) efficiency = { kind: "speed", value: round2((dist * 1000) / (hrAvg * dur)) };

  const goal = CARDIO_GOALS[ctx.profile];
  const aerobic = isAerobic(e);
  let inPrescribedZone: boolean | null = null;
  if (goal.distribution === "prescribed" && aerobic) {
    const rpeOk = rpe >= goal.rpeRange[0] && rpe <= goal.rpeRange[1];
    const hrOk = ctx.betaBlocker || !hrMax || !ceiling || hrMax <= ceiling;
    // Pulmonary tolerance also needs dyspnea and an individualized saturation target,
    // which are not captured as structured fields: never claim full adherence.
    inPrescribedZone = ctx.profile === "pulmonary" ? null : rpeOk && hrOk;
  }

  const flags: SessionFlag[] = [];
  if (aboveCeiling) flags.push("hr_above_ceiling");
  if (spo2Low) flags.push("spo2_low");
  if (recovery?.status === "low") flags.push("recovery_low");
  if (coherence?.status === "heart_higher" && !ctx.betaBlocker) flags.push("heart_higher");

  return {
    id: e.id,
    date: e.session_date.slice(0, 10),
    track: e.track,
    durationMin: dur,
    rpe,
    aerobic,
    zones,
    intensity,
    srpe: isNum(e.training_load) && e.training_load > 0 ? e.training_load : srpeLoad(dur, rpe),
    trimp: trimpValue,
    hrAvg,
    hrMax,
    hrAvgPctMax: hrAvg && maxHr ? Math.round((hrAvg / maxHr) * 100) : null,
    hrMaxPctMax: hrMax && maxHr ? Math.round((hrMax / maxHr) * 100) : null,
    minutesAboveCeiling,
    pctAboveCeiling,
    aboveCeiling,
    spo2Min,
    spo2Low,
    coherence,
    recovery,
    paceMinKm,
    speedKmh,
    efficiency,
    inPrescribedZone,
    flags,
  };
}

export const fmtNum = (n: number) => n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Texto curto de interpretação de uma sessão (técnico), por regras. */
export function sessionReadings(s: SessionAnalysis, ctx: AnalysisContext): string[] {
  const out: string[] = [];
  const ceil = ctx.ceiling.ceiling;
  if (s.aboveCeiling && ceil) {
    out.push(`FC máxima de ${s.hrMax} bpm acima do teto do perfil (${ceil} bpm)${s.minutesAboveCeiling ? `, cerca de ${fmtNum(s.minutesAboveCeiling)} min acima` : ""}.`);
  } else if (s.hrMax && ceil) {
    out.push(`FC máxima de ${s.hrMax} bpm dentro do teto (${ceil} bpm).`);
  }
  if (s.spo2Low) out.push(`SpO₂ mínima de ${s.spo2Min}% (abaixo de ${SPO2_ALERT}%): conferir sintomas e considerar avaliação médica.`);
  if (s.recovery) {
    out.push(
      s.recovery.status === "low"
        ? `Recuperação no 1º minuto de ${s.recovery.drop} bpm (≤${RECOVERY_LOW}): sinal de atenção (Cole 1999).`
        : `Recuperação no 1º minuto de ${s.recovery.drop} bpm: ${s.recovery.status === "good" ? "boa" : "adequada"}.`,
    );
  }
  if (s.coherence) {
    if (s.coherence.status === "heart_higher") out.push("A resposta cardíaca foi maior do que o esforço percebido: conferir calor, hidratação, sono, início de infecção ou PSE subestimada.");
    else if (s.coherence.status === "perceived_higher") out.push(ctx.betaBlocker
      ? "Esforço percebido maior que a resposta cardíaca, esperado com betabloqueador: guiar pela PSE."
      : "Esforço percebido maior que a resposta cardíaca: possível fadiga, dor ou efeito de medicação.");
    else out.push("Esforço percebido coerente com a resposta cardíaca.");
  }
  if (s.inPrescribedZone === true) out.push("Sessão dentro da zona prescrita para o perfil.");
  if (s.inPrescribedZone === false) out.push("Sessão fora da zona prescrita para o perfil (PSE ou FC acima do planejado).");
  return out;
}

/* ------------------------------------------------------------- período */

export interface WeekBucket {
  start: string;
  end: string;
  label: string;
  light: number;
  moderate: number;
  vigorous: number;
  /** Minutos moderados equivalentes (1 vigoroso = 2 moderados). */
  equivalent: number;
  metWho: boolean;
  sessions: number;
  trimp: number;
  srpe: number;
  restingHr: number | null;
}

export interface TrendPoint { date: string; value: number }
export interface Trend { first: number; last: number; changePct: number }

export interface PeriodAnalysis {
  weeks: WeekBucket[];
  from: string;
  to: string;
  sessions: SessionAnalysis[];
  aerobicSessions: number;
  monitoredSessions: number;
  whoWeeksMet: number;
  avgEquivalent: number;
  distribution: { lowMin: number; highMin: number; pctHigh: number; status: "balanced" | "excess" | "low_stimulus" } | null;
  prescribed: { inZone: number; total: number; pct: number } | null;
  counts: { aboveCeiling: number; spo2Low: number; recoveryLow: number; heartHigher: number; perceivedHigher: number };
  recoverySeries: TrendPoint[];
  efficiencySeries: TrendPoint[];
  powerSeries: TrendPoint[];
  recoveryTrend: Trend | null;
  efficiencyTrend: Trend | null;
  powerTrend: Trend | null;
  restingTrend: Trend | null;
  avgRecovery: number | null;
}

function halfTrend(points: TrendPoint[]): Trend | null {
  if (points.length < 4) return null;
  const mid = Math.floor(points.length / 2);
  const mean = (a: TrendPoint[]) => a.reduce((s, p) => s + p.value, 0) / a.length;
  const first = mean(points.slice(0, mid));
  const last = mean(points.slice(points.length - mid));
  if (first === 0) return null;
  return { first: round2(first), last: round2(last), changePct: Math.round(((last - first) / first) * 100) };
}

export function analyzePeriod(opts: {
  entries: CardioEntryLike[];
  checkins: RestingHrLike[];
  ctx: AnalysisContext;
  weeks: number;
  today: string;
}): PeriodAnalysis {
  const { ctx, today } = opts;
  const n = Math.max(1, Math.min(12, Math.round(opts.weeks)));
  const from = addIsoDays(today, -(n * 7 - 1));
  const inRange = opts.entries
    .filter((e) => e.session_date.slice(0, 10) >= from && e.session_date.slice(0, 10) <= today)
    .sort((a, b) => a.session_date.localeCompare(b.session_date) || a.id.localeCompare(b.id));
  const sessions = inRange.map((e) => analyzeSession(e, ctx));

  const weeks: WeekBucket[] = Array.from({ length: n }, (_, k) => {
    const end = addIsoDays(today, -7 * (n - 1 - k));
    const start = addIsoDays(end, -6);
    const ws = sessions.filter((s) => s.date >= start && s.date <= end && s.aerobic);
    const sum = (f: (s: SessionAnalysis) => number) => ws.reduce((a, s) => a + f(s), 0);
    const moderate = Math.round(sum((s) => s.intensity.moderate));
    const vigorous = Math.round(sum((s) => s.intensity.vigorous));
    const rhr = opts.checkins.filter((c) => c.checkin_date.slice(0, 10) >= start && c.checkin_date.slice(0, 10) <= end && isNum(c.resting_hr) && c.resting_hr! > 0);
    return {
      start, end,
      label: shortDate(start),
      light: Math.round(sum((s) => s.intensity.light)),
      moderate,
      vigorous,
      equivalent: moderate + 2 * vigorous,
      metWho: moderate + 2 * vigorous >= WHO_MODERATE_MIN,
      sessions: ws.length,
      trimp: Math.round(sum((s) => s.trimp ?? 0)),
      srpe: Math.round(sum((s) => s.srpe)),
      restingHr: rhr.length ? round1(rhr.reduce((a, c) => a + c.resting_hr!, 0) / rhr.length) : null,
    };
  });

  const aerobic = sessions.filter((s) => s.aerobic);
  const lowMin = aerobic.reduce((a, s) => a + s.intensity.light + s.intensity.moderate, 0);
  const highMin = aerobic.reduce((a, s) => a + s.intensity.vigorous, 0);
  const goal = CARDIO_GOALS[ctx.profile];
  let distribution: PeriodAnalysis["distribution"] = null;
  if (goal.distribution === "polarized" && lowMin + highMin >= 60) {
    const pctHigh = Math.round((highMin / (lowMin + highMin)) * 100);
    const status = pctHigh > 30 ? "excess" : pctHigh < 5 && ctx.profile === "athletic" ? "low_stimulus" : "balanced";
    distribution = { lowMin: Math.round(lowMin), highMin: Math.round(highMin), pctHigh, status };
  }
  let prescribed: PeriodAnalysis["prescribed"] = null;
  const judged = sessions.filter((s) => s.inPrescribedZone !== null);
  if (goal.distribution === "prescribed" && judged.length) {
    const inZone = judged.filter((s) => s.inPrescribedZone).length;
    prescribed = { inZone, total: judged.length, pct: Math.round((inZone / judged.length) * 100) };
  }

  const recoverySeries = sessions.filter((s) => s.recovery).map((s) => ({ date: s.date, value: s.recovery!.drop }));
  const efficiencySeries = sessions.filter((s) => s.efficiency?.kind === "speed").map((s) => ({ date: s.date, value: s.efficiency!.value }));
  const powerSeries = sessions.filter((s) => s.efficiency?.kind === "power").map((s) => ({ date: s.date, value: s.efficiency!.value }));
  const rhrPoints = weeks.filter((w) => w.restingHr !== null).map((w) => ({ date: w.start, value: w.restingHr! }));
  let restingTrend: Trend | null = null;
  if (rhrPoints.length >= 2) {
    const first = rhrPoints[0].value;
    const last = rhrPoints[rhrPoints.length - 1].value;
    restingTrend = { first, last, changePct: first ? Math.round(((last - first) / first) * 100) : 0 };
  }

  const count = (f: (s: SessionAnalysis) => boolean) => sessions.filter(f).length;
  return {
    weeks,
    from,
    to: today,
    sessions,
    aerobicSessions: aerobic.length,
    monitoredSessions: count((s) => s.hrAvg !== null || s.hrMax !== null || s.zones !== null),
    whoWeeksMet: weeks.filter((w) => w.metWho).length,
    avgEquivalent: Math.round(weeks.reduce((a, w) => a + w.equivalent, 0) / weeks.length),
    distribution,
    prescribed,
    counts: {
      aboveCeiling: count((s) => s.aboveCeiling),
      spo2Low: count((s) => s.spo2Low),
      recoveryLow: count((s) => s.recovery?.status === "low"),
      heartHigher: count((s) => s.coherence?.status === "heart_higher"),
      perceivedHigher: count((s) => s.coherence?.status === "perceived_higher"),
    },
    recoverySeries,
    efficiencySeries,
    powerSeries,
    recoveryTrend: halfTrend(recoverySeries),
    efficiencyTrend: halfTrend(efficiencySeries),
    powerTrend: halfTrend(powerSeries),
    restingTrend,
    avgRecovery: recoverySeries.length ? Math.round(recoverySeries.reduce((a, p) => a + p.value, 0) / recoverySeries.length) : null,
  };
}

/* ------------------------------------------------------------- leituras */

/** Leituras técnicas do período, em ordem fixa (fisioterapeuta / cardiologista). */
export function periodReadings(p: PeriodAnalysis, ctx: AnalysisContext, extra?: { matrixText?: string | null }): string[] {
  const out: string[] = [];
  const n = p.weeks.length;
  if (p.aerobicSessions === 0) {
    out.push("Sem sessões aeróbias registradas no período.");
    return out;
  }
  out.push(`Meta da OMS (≥${WHO_MODERATE_MIN} min moderados equivalentes por semana) cumprida em ${p.whoWeeksMet} de ${n} semanas; média de ${p.avgEquivalent} min/semana.`);
  const totalMinutes = p.sessions.filter((s) => s.aerobic).reduce((sum, s) => sum + s.durationMin, 0);
  out.push(`Trabalho realizado: ${plural(p.aerobicSessions, "sessão aeróbia", "sessões aeróbias")} e ${fmtNum(totalMinutes)} minutos registrados no período, incluindo atividade leve. Esse esforço deve ser valorizado mesmo abaixo da referência da OMS; os registros não representam necessariamente toda a atividade realizada.`);
  if (p.whoWeeksMet < n) out.push("Próximo passo: revisar frequência e duração com progressão individualizada conforme tolerância e perfil, sem compensar a meta com intensidade acima do teto. Semanas sem registro não comprovam inatividade.");
  if (ctx.ceiling.ceiling && p.monitoredSessions > 0) {
    out.push(p.counts.aboveCeiling > 0
      ? `${p.counts.aboveCeiling} de ${plural(p.monitoredSessions, "sessão monitorada", "sessões monitoradas")} passaram do teto de ${ctx.ceiling.ceiling} bpm.`
      : `Nenhuma das ${plural(p.monitoredSessions, "sessão monitorada", "sessões monitoradas")} passou do teto de ${ctx.ceiling.ceiling} bpm.`);
  }
  if (p.counts.spo2Low > 0) out.push(`${plural(p.counts.spo2Low, "sessão", "sessões")} com SpO₂ abaixo de ${SPO2_ALERT}%: conferir sintomas e considerar avaliação médica.`);
  if (p.recoveryTrend) {
    const better = p.recoveryTrend.last > p.recoveryTrend.first;
    out.push(`Recuperação da FC no 1º minuto ${better ? "melhorou" : p.recoveryTrend.last < p.recoveryTrend.first ? "piorou" : "ficou estável"}: média de ${Math.round(p.recoveryTrend.first)} → ${Math.round(p.recoveryTrend.last)} bpm.`);
  } else if (p.avgRecovery !== null) {
    out.push(`Recuperação média da FC no 1º minuto: ${p.avgRecovery} bpm.`);
  }
  if (p.counts.recoveryLow > 0) out.push(`${plural(p.counts.recoveryLow, "sessão", "sessões")} com recuperação ≤${RECOVERY_LOW} bpm no 1º minuto: sinal de atenção (Cole 1999).`);
  if (p.distribution) {
    const d = p.distribution;
    out.push(d.status === "excess"
      ? `Distribuição de intensidade: ${d.pctHigh}% do tempo em zona intensa (Z4–Z5), acima do modelo de cerca de 20% (Seiler). Sugere mais volume leve.`
      : d.status === "low_stimulus"
        ? `Distribuição de intensidade: só ${d.pctHigh}% do tempo em zona intensa; para atleta, o modelo prevê cerca de 20% (Seiler).`
        : `Distribuição de intensidade: ${100 - d.pctHigh}% leve/moderado e ${d.pctHigh}% intenso, coerente com o modelo polarizado.`);
  }
  if (p.prescribed) out.push(`${p.prescribed.inZone} de ${plural(p.prescribed.total, "sessão", "sessões")} (${p.prescribed.pct}%) dentro da zona prescrita para o perfil.`);
  if (p.counts.heartHigher >= 2 && !ctx.betaBlocker) out.push(`Em ${p.counts.heartHigher} sessões a resposta cardíaca foi maior do que o esforço percebido: conferir calor, hidratação, sono ou PSE subestimada.`);
  if (p.counts.perceivedHigher >= 2) out.push(ctx.betaBlocker
    ? `Em ${p.counts.perceivedHigher} sessões o esforço percebido superou a resposta cardíaca, esperado com betabloqueador.`
    : `Em ${p.counts.perceivedHigher} sessões o esforço percebido superou a resposta cardíaca: possível fadiga, dor ou efeito de medicação.`);
  if (p.efficiencyTrend) {
    const t = p.efficiencyTrend;
    out.push(`Eficiência cardíaca (metros por batimento): ${fmtNum(t.first)} → ${fmtNum(t.last)} (${t.changePct > 0 ? "+" : ""}${t.changePct}%)${t.changePct >= 3 ? ", sinal de melhora do condicionamento" : t.changePct <= -3 ? ", queda que merece atenção" : ""}.`);
  }
  if (p.powerTrend) {
    const t = p.powerTrend;
    out.push(`Eficiência na bicicleta (W por bpm): ${fmtNum(t.first)} → ${fmtNum(t.last)} (${t.changePct > 0 ? "+" : ""}${t.changePct}%).`);
  }
  if (p.restingTrend) out.push(`FC ao acordar (média semanal): ${fmtNum(Math.round(p.restingTrend.first * 10) / 10)} → ${fmtNum(Math.round(p.restingTrend.last * 10) / 10)} bpm.`);
  if (extra?.matrixText) out.push(`Leitura do momento (ACWR cardio × prontidão/FC ao acordar): ${extra.matrixText}`);
  if (ctx.profile === "pulmonary") out.push("Perfil pneumopata: revisar dispneia, sintomas e alvo individual de SpO₂ junto da carga. Sem registro específico de dispneia, não é possível confirmar adesão à prescrição respiratória pela FC/PSE global isoladas.");
  if (ctx.betaBlocker) out.push("Paciente em uso de betabloqueador: intensidade avaliada pela PSE; FC usada só como apoio.");
  return out;
}

/** Leituras em linguagem simples para a versão do paciente. */
export function patientReadings(p: PeriodAnalysis, ctx: AnalysisContext): string[] {
  const out: string[] = [];
  const n = p.weeks.length;
  if (p.aerobicSessions === 0) return ["Ainda não há treinos aeróbios registrados neste período. Isso não significa que você não se movimentou; registrar suas atividades ajuda a reconhecer seu esforço e combinar os próximos passos."];
  const totalMinutes = p.sessions.filter((s) => s.aerobic).reduce((sum, s) => sum + s.durationMin, 0);
  out.push(`Seu esforço conta: você registrou ${plural(p.aerobicSessions, "treino", "treinos")} e ${fmtNum(totalMinutes)} minutos de atividade neste período, incluindo os momentos mais leves. Cada atividade realizada merece ser reconhecida, mesmo quando a meta ainda não foi alcançada.`);
  out.push(p.whoWeeksMet === n
    ? `Você atingiu a meta de atividade física em todas as ${n} semanas. Excelente!`
    : p.whoWeeksMet > 0
      ? `Você atingiu a referência da OMS em ${p.whoWeeksMet} de ${n} semanas registradas. Essa conquista vale ser celebrada; nas demais semanas, a atividade realizada também conta.`
      : "Nos registros deste período, você ainda não atingiu a referência semanal da OMS. Isso não apaga o que você já fez: atividade abaixo dessa referência também conta.");
  if (p.whoWeeksMet < n) out.push(`Como próximo passo, combine com seu fisioterapeuta uma frequência e uma duração possíveis para sua rotina, aumentando aos poucos conforme sua tolerância. Os ${WHO_MODERATE_MIN} minutos moderados por semana são uma referência geral, não uma cobrança nem uma autorização para ultrapassar seu limite. Semanas sem registro não significam semanas sem atividade.`);
  if (ctx.ceiling.ceiling && p.monitoredSessions > 0) {
    out.push(p.counts.aboveCeiling > 0
      ? `Em ${plural(p.counts.aboveCeiling, "treino", "treinos")} seu coração passou do limite combinado (${ctx.ceiling.ceiling} batimentos por minuto). Vale reduzir o ritmo quando chegar perto dele.`
      : `Seu coração ficou dentro do limite combinado (${ctx.ceiling.ceiling} batimentos por minuto) em todos os treinos medidos.`);
  }
  if (p.recoveryTrend && p.recoveryTrend.last > p.recoveryTrend.first) out.push("Nos registros, seu coração está se recuperando mais rápido depois do esforço. É um ponto positivo para acompanhar com seu fisioterapeuta, comparando treinos em condições semelhantes.");
  if (p.recoveryTrend && p.recoveryTrend.last < p.recoveryTrend.first) out.push("Nos registros mais recentes, os batimentos diminuíram menos no primeiro minuto após o esforço. Vale revisar com seu fisioterapeuta a recuperação e as condições dos treinos.");
  if (p.counts.recoveryLow > 0) out.push("Em alguns treinos o coração demorou a desacelerar depois do esforço. Mesmo que a média tenha melhorado, seu fisioterapeuta deve acompanhar esses episódios de perto.");
  if (p.efficiencyTrend && p.efficiencyTrend.changePct >= 3) out.push("Você percorreu mais metros por batimento nos registros recentes. É um resultado encorajador; compare treinos em condições semelhantes antes de concluir que o condicionamento melhorou.");
  if (p.efficiencyTrend && p.efficiencyTrend.changePct <= -3) out.push("Nos registros recentes, você percorreu menos metros por batimento. Converse com seu fisioterapeuta sobre ritmo, recuperação e condições dos treinos antes de aumentar a carga.");
  if (p.distribution?.status === "balanced") out.push("Sua distribuição de intensidade está coerente com a referência usada nesta análise, com espaço para os treinos mais leves.");
  if (p.distribution?.status === "excess") out.push("Uma parcela maior que a referência do seu tempo de treino foi intensa. Vale abrir mais espaço para atividades leves, sem desvalorizar os treinos já feitos.");
  if (p.distribution?.status === "low_stimulus") out.push("Seus registros têm pouco tempo de treino intenso para a referência esportiva. Seu fisioterapeuta pode revisar se isso corresponde à fase atual do seu treino; não aumente a intensidade por conta própria.");
  if (p.prescribed) out.push(p.prescribed.pct >= 80
    ? "Você treinou na intensidade combinada na maior parte das vezes. Continue assim!"
    : "Parte dos treinos ficou fora da faixa combinada de esforço ou batimentos. Revise com seu fisioterapeuta como ajustar a intensidade ao seu momento.");
  if (p.counts.spo2Low > 0) out.push("Em algum treino a oxigenação ficou baixa. Se sentir falta de ar, tontura ou dor no peito, pare e avise seu profissional.");
  if (ctx.betaBlocker) out.push("Como você usa um remédio que deixa os batimentos mais baixos, guie-se principalmente pela sensação de esforço.");
  if (ctx.profile === "pulmonary") out.push("Seu esforço merece ser reconhecido também quando a falta de ar limita o ritmo. Combine pausas e intensidade com seu fisioterapeuta; batimentos e nota de esforço não contam sozinhos toda a resposta respiratória.");
  return out;
}

export function profileGoal(profile?: string | null): CardioGoal {
  return CARDIO_GOALS[profileRule(profile).key];
}
