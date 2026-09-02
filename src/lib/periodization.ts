/**
 * Cálculos determinísticos de carga de treino (sem IA, sem crédito).
 *
 * Convenções:
 * - sRPE (session RPE): Training Load = duração (min) × RPE (0-10).
 * - Carga aguda = soma dos últimos 7 dias (média diária × 7 equivale à soma).
 * - Carga crônica = média das últimas 4 semanas, expressa por semana.
 * - ACWR = carga aguda / carga crônica semanal.
 * - Escalas subjetivas: 1-10 (prontidão: 10 = ótimo; fadiga/dor/estresse: 10 = pior).
 */

export type LoadTrack = "physio" | "gym" | "sport";
export type PlannedLoad = "rest" | "low" | "moderate" | "high";
export type LoadZone = "undertraining" | "optimal" | "caution" | "danger";

export interface SrpeEntryLike {
  session_date: string; // YYYY-MM-DD
  duration_min: number;
  rpe: number;
  track?: LoadTrack | string | null;
}

export interface ReadinessLike {
  checkin_date: string; // YYYY-MM-DD
  soreness?: number | null;
  sleep?: number | null;
  stress?: number | null;
  fatigue?: number | null;
  readiness?: number | null;
  pain?: number | null;
}

/** Training Load de uma sessão. */
export function trainingLoad(durationMin: number, rpe: number): number {
  if (!Number.isFinite(durationMin) || !Number.isFinite(rpe)) return 0;
  return Math.max(0, Math.round(durationMin * rpe));
}

const toDate = (iso: string): Date => new Date(`${iso.slice(0, 10)}T12:00:00Z`);

const daysBetween = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / 86400000);

/** Soma das cargas dentro de uma janela de N dias terminando em `ref` (inclusive). */
export function loadInWindow(entries: SrpeEntryLike[], days: number, ref: Date = new Date()): number {
  const end = toDate(ref.toISOString());
  return entries.reduce((sum, e) => {
    const diff = daysBetween(toDate(e.session_date), end);
    if (diff < 0 || diff >= days) return sum;
    return sum + trainingLoad(e.duration_min, e.rpe);
  }, 0);
}

/** Carga aguda: soma dos últimos 7 dias. */
export function acuteLoad(entries: SrpeEntryLike[], ref: Date = new Date()): number {
  return loadInWindow(entries, 7, ref);
}

/** Carga crônica: média semanal das últimas 4 semanas (28 dias). */
export function chronicLoad(entries: SrpeEntryLike[], ref: Date = new Date()): number {
  return Math.round(loadInWindow(entries, 28, ref) / 4);
}

/**
 * ACWR (acute:chronic workload ratio). Retorna null quando não há histórico
 * crônico suficiente — mostrar ACWR com poucos dias de dado engana.
 */
export function acwr(entries: SrpeEntryLike[], ref: Date = new Date()): number | null {
  const chronic = chronicLoad(entries, ref);
  if (chronic <= 0) return null;
  return Number((acuteLoad(entries, ref) / chronic).toFixed(2));
}

/** Zona de risco a partir do ACWR. */
export function loadZone(ratio: number | null): LoadZone | null {
  if (ratio === null) return null;
  if (ratio < 0.8) return "undertraining";
  if (ratio <= 1.3) return "optimal";
  if (ratio <= 1.5) return "caution";
  return "danger";
}

export interface WeeklyLoadPoint {
  /** Segunda-feira da semana (YYYY-MM-DD). */
  weekStart: string;
  load: number;
  /** Variação percentual em relação à semana anterior (null na primeira). */
  spikePct: number | null;
}

const mondayOf = (d: Date): string => {
  const copy = new Date(d.getTime());
  const dow = (copy.getUTCDay() + 6) % 7; // 0 = segunda
  copy.setUTCDate(copy.getUTCDate() - dow);
  return copy.toISOString().slice(0, 10);
};

/** Série de carga semanal ordenada, com o salto percentual semana a semana. */
export function weeklyLoadSeries(entries: SrpeEntryLike[]): WeeklyLoadPoint[] {
  const byWeek = new Map<string, number>();
  entries.forEach((e) => {
    const key = mondayOf(toDate(e.session_date));
    byWeek.set(key, (byWeek.get(key) || 0) + trainingLoad(e.duration_min, e.rpe));
  });
  const weeks = Array.from(byWeek.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return weeks.map(([weekStart, load], i) => {
    const prev = i > 0 ? weeks[i - 1][1] : 0;
    const spikePct = i === 0 || prev <= 0 ? null : Number((((load - prev) / prev) * 100).toFixed(1));
    return { weekStart, load, spikePct };
  });
}

/** Regra do salto semanal < 10%. */
export function weeklySpikeAlert(series: WeeklyLoadPoint[]): { spikePct: number; weekStart: string } | null {
  const last = series[series.length - 1];
  if (!last || last.spikePct === null || last.spikePct <= 10) return null;
  return { spikePct: last.spikePct, weekStart: last.weekStart };
}

/**
 * Score de prontidão do check-in (0-100). Itens são opcionais: só entram
 * no cálculo os que foram respondidos.
 */
export function readinessScore(c: ReadinessLike): number | null {
  const good: Array<number | null | undefined> = [c.readiness, c.sleep];
  const bad: Array<number | null | undefined> = [c.soreness, c.stress, c.fatigue, c.pain];
  const values: number[] = [];
  good.forEach((v) => { if (typeof v === "number") values.push(v); });
  bad.forEach((v) => { if (typeof v === "number") values.push(11 - v); });
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.round(((avg - 1) / 9) * 100);
}

/**
 * Queda abrupta de prontidão: compara o último check-in com a média dos
 * anteriores (até 7). Queda ≥ 20 pontos é sinal de alerta.
 */
export function readinessDrop(checkins: ReadinessLike[]): { current: number; baseline: number; drop: number } | null {
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const scores = sorted.map(readinessScore).filter((s): s is number => s !== null);
  if (scores.length < 3) return null;
  const current = scores[scores.length - 1];
  const prev = scores.slice(Math.max(0, scores.length - 8), scores.length - 1);
  const baseline = Math.round(prev.reduce((a, b) => a + b, 0) / prev.length);
  const drop = baseline - current;
  return drop >= 20 ? { current, baseline, drop } : null;
}

export type AlertLevel = "ok" | "caution" | "danger";

export interface LoadStatus {
  acuteLoad: number;
  chronicLoad: number;
  acwr: number | null;
  zone: LoadZone | null;
  weekly: WeeklyLoadPoint[];
  spike: { spikePct: number; weekStart: string } | null;
  readiness: number | null;
  drop: { current: number; baseline: number; drop: number } | null;
  level: AlertLevel;
  /** Sugestões — a decisão clínica é sempre do fisioterapeuta. */
  messages: string[];
}

/** Consolida carga + prontidão em um status único para a UI. */
export function loadStatus(
  entries: SrpeEntryLike[],
  checkins: ReadinessLike[],
  ref: Date = new Date(),
): LoadStatus {
  const ratio = acwr(entries, ref);
  const zone = loadZone(ratio);
  const weekly = weeklyLoadSeries(entries);
  const spike = weeklySpikeAlert(weekly);
  const sortedCheckins = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const lastCheckin = sortedCheckins[sortedCheckins.length - 1];
  const readiness = lastCheckin ? readinessScore(lastCheckin) : null;
  const drop = readinessDrop(sortedCheckins);

  const messages: string[] = [];
  let level: AlertLevel = "ok";

  if (zone === "danger") {
    level = "danger";
    messages.push("Carga aguda muito acima da crônica (ACWR > 1,5). Sugestão: reduzir volume nos próximos dias.");
  } else if (zone === "caution") {
    level = "caution";
    messages.push("Carga subindo rápido (ACWR entre 1,3 e 1,5). Sugestão: manter volume, sem novos incrementos.");
  } else if (zone === "undertraining") {
    messages.push("Carga aguda abaixo da crônica. Há espaço para progressão gradual.");
  }

  if (spike) {
    if (level === "ok") level = "caution";
    messages.push(`Salto de ${spike.spikePct}% na carga semanal (recomendado até 10%).`);
  }

  if (drop) {
    level = "danger";
    messages.push(`Queda de ${drop.drop} pontos na prontidão em relação à média recente.`);
  } else if (readiness !== null && readiness < 40) {
    if (level !== "danger") level = "caution";
    messages.push("Prontidão baixa no último check-in.");
  }

  return {
    acuteLoad: acuteLoad(entries, ref),
    chronicLoad: chronicLoad(entries, ref),
    acwr: ratio,
    zone,
    weekly,
    spike,
    readiness,
    drop,
    level,
    messages,
  };
}

/** Peso relativo de cada carga planejada, para a heurística do microciclo. */
const LOAD_WEIGHT: Record<PlannedLoad, number> = { rest: 0, low: 1, moderate: 2, high: 3 };

export interface PlannedSessionLike {
  session_date: string;
  track?: LoadTrack | string | null;
  planned_load: PlannedLoad | string;
}

/**
 * Dias com estresse alto em sequência (back-to-back). Retorna as datas do
 * segundo dia de cada sequência, para destaque visual no microciclo.
 */
export function backToBackHighDays(sessions: PlannedSessionLike[]): string[] {
  const byDay = new Map<string, number>();
  sessions.forEach((s) => {
    const w = LOAD_WEIGHT[(s.planned_load as PlannedLoad)] ?? 0;
    const key = s.session_date.slice(0, 10);
    byDay.set(key, Math.max(byDay.get(key) || 0, w));
  });
  const days = Array.from(byDay.entries())
    .filter(([, w]) => w >= 3)
    .map(([d]) => d)
    .sort();
  const flagged: string[] = [];
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(toDate(days[i - 1]), toDate(days[i])) === 1) flagged.push(days[i]);
  }
  return flagged;
}

/** Carga planejada somada por dia (peso 0-3 por trilha), para a grade semanal. */
export function dailyPlannedWeight(sessions: PlannedSessionLike[]): Record<string, number> {
  const out: Record<string, number> = {};
  sessions.forEach((s) => {
    const key = s.session_date.slice(0, 10);
    out[key] = (out[key] || 0) + (LOAD_WEIGHT[(s.planned_load as PlannedLoad)] ?? 0);
  });
  return out;
}

/** Fases padrão do macrociclo, espelhando as fases do STEPS. */
export const MACRO_PHASES: Array<{ key: string; name: string; goal: string; weeks: number }> = [
  { key: "healing", name: "Cicatrização tecidual", goal: "Controle de dor e proteção do tecido", weeks: 3 },
  { key: "hypertrophy", name: "Hipertrofia e força", goal: "Reconstrução de capacidade e tolerância à carga", weeks: 8 },
  { key: "power", name: "Potência e transição", goal: "Velocidade, pliometria e mudança de direção", weeks: 6 },
  { key: "rts", name: "Retorno ao esporte", goal: "Demanda específica do esporte e critérios de liberação", weeks: 4 },
];

/** Blocos padrão de mesociclo. */
export const MESO_BLOCKS: Array<{ key: string; name: string; goal: string }> = [
  { key: "accumulation", name: "Acumulação", goal: "Volume progressivo com intensidade moderada" },
  { key: "transmutation", name: "Transmutação", goal: "Converter volume em força/potência específica" },
  { key: "realization", name: "Realização", goal: "Pico de desempenho com volume reduzido" },
];

/** Checklist padrão de liberação (fisio → academia → esporte). */
export const CLEARANCE_TEMPLATE: Array<{ item_key: string; label: string }> = [
  { item_key: "lsi_strength", label: "Índice de simetria de força < 10%" },
  { item_key: "lsi_hop", label: "Testes de salto unipodal simétricos (< 10%)" },
  { item_key: "rom_full", label: "ADM completa e sem dor" },
  { item_key: "load_tolerance", label: "Tolerância à carga mecânica sem piora em 24h" },
  { item_key: "psych_readiness", label: "Prontidão psicológica (TSK / ACL-RSI)" },
  { item_key: "sport_specific", label: "Gestos específicos do esporte com controle" },
];
