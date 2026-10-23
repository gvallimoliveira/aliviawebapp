import { acwrZone } from "./cardioSafety";

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

export type LoadTrack = "physio" | "gym" | "sport" | "cardio";
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

/** Data local (YYYY-MM-DD) do aparelho. Nunca usar toISOString para "hoje": à noite no Brasil ela já é amanhã. */
export function localISODate(d: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const daysBetween = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / 86400000);

/** Soma das cargas dentro de uma janela de N dias terminando em `ref` (inclusive). */
export function loadInWindow(entries: SrpeEntryLike[], days: number, ref: Date = new Date()): number {
  const end = toDate(localISODate(ref));
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

/** Mínimos para a linha de base crônica fazer sentido. */
export const CHRONIC_MIN_DAYS = 14;
export const CHRONIC_MIN_SESSIONS = 4;

/**
 * A carga crônica só é comparável quando há histórico suficiente.
 * Com 1–3 sessões (ou menos de 2 semanas de registro) a média de 28 dias fica
 * artificialmente baixa e o ACWR dispara um "risco" que não existe.
 */
export function chronicBaselineReady(entries: SrpeEntryLike[], ref: Date = new Date()): boolean {
  const end = toDate(localISODate(ref));
  const inWindow = entries.filter((e) => {
    const diff = daysBetween(toDate(e.session_date), end);
    return diff >= 0 && diff < 28 && trainingLoad(e.duration_min, e.rpe) > 0;
  });
  if (inWindow.length < CHRONIC_MIN_SESSIONS) return false;
  const oldest = Math.max(...inWindow.map((e) => daysBetween(toDate(e.session_date), end)));
  return oldest >= CHRONIC_MIN_DAYS;
}

/**
 * ACWR (acute:chronic workload ratio). Retorna null quando não há histórico
 * crônico suficiente — mostrar ACWR com poucos dias de dado engana.
 */
export function acwr(entries: SrpeEntryLike[], ref: Date = new Date()): number | null {
  const chronic = chronicLoad(entries, ref);
  if (chronic <= 0) return null;
  if (!chronicBaselineReady(entries, ref)) return null;
  return Number((acuteLoad(entries, ref) / chronic).toFixed(2));
}


/** Zona de risco a partir do ACWR — delega à régua única por perfil (cardioSafety). */
export function loadZone(ratio: number | null, profile?: string | null): LoadZone | null {
  return acwrZone(ratio, profile);
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
  const clamp = (v: number) => Math.min(10, Math.max(1, v));
  const good: Array<number | null | undefined> = [c.readiness, c.sleep];
  const bad: Array<number | null | undefined> = [c.soreness, c.stress, c.fatigue, c.pain];
  const values: number[] = [];
  good.forEach((v) => { if (typeof v === "number") values.push(clamp(v)); });
  bad.forEach((v) => { if (typeof v === "number") values.push(11 - clamp(v)); });
  if (values.length === 0) return null;
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.min(100, Math.max(0, Math.round(((avg - 1) / 9) * 100)));
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
  /** Falso enquanto não há histórico suficiente para calcular o ACWR. */
  baselineReady: boolean;
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
  const baselineReady = chronicBaselineReady(entries, ref);
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
  } else if (!baselineReady && entries.length > 0) {
    messages.push(
      `ACWR ainda indisponível: precisa de pelo menos ${CHRONIC_MIN_SESSIONS} sessões registradas e ${CHRONIC_MIN_DAYS} dias de histórico. Até lá, só a carga por sessão é confiável.`,
    );
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
    chronicLoad: baselineReady ? chronicLoad(entries, ref) : 0,
    acwr: ratio,
    zone,
    weekly,
    spike,
    readiness,
    drop,
    level,
    baselineReady,
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
export const MACRO_PHASES: Array<{ key: string; name: string; goal: string; weeks: number; optional?: boolean }> = [
  { key: "healing", name: "Cicatrização tecidual", goal: "Controle de dor e proteção do tecido", weeks: 3 },
  { key: "hypertrophy", name: "Hipertrofia e força", goal: "Reconstrução de capacidade e tolerância à carga", weeks: 8 },
  { key: "power", name: "Potência e transição", goal: "Velocidade, pliometria e mudança de direção", weeks: 6, optional: true },
  { key: "rts", name: "Retorno ao esporte", goal: "Demanda específica do esporte e critérios de liberação", weeks: 4, optional: true },
];

/** Fases que só se aplicam a parte dos pacientes (atleta/esporte/alta demanda). */
export const OPTIONAL_MACRO_PHASE_KEYS = ["power", "rts"] as const;

/** Detecta, pelo nome do ciclo salvo, se a fase é opcional (caso aplicável). */
export function isOptionalMacroPhase(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return MACRO_PHASES.some((p) => p.optional && p.name.toLowerCase() === n);
}

/** Blocos padrão de mesociclo. */
export const MESO_BLOCKS: Array<{ key: string; name: string; goal: string }> = [
  { key: "accumulation", name: "Acumulação", goal: "Volume progressivo com intensidade moderada" },
  { key: "transmutation", name: "Transmutação", goal: "Converter volume em força/potência específica" },
  { key: "realization", name: "Realização", goal: "Pico de desempenho com volume reduzido" },
];

/* ------------------------------------------------------------------------- */
/* Dose planejada (prescrita) x carga percebida (sRPE do paciente)           */
/* ------------------------------------------------------------------------- */

export type DoseVerdict = "under" | "on_target" | "over";

/**
 * Faixa ÚNICA de "dose certa" (±10% do alvo), igual para sessão, frente e
 * semana — a mesma carga nunca recebe duas leituras diferentes.
 * Respaldo: variações de carga semanal acima de ~10% elevam o risco de lesão
 * (Gabbett, Br J Sports Med 2016;50:273-280) e o ACWR seguro fica em
 * 0,8–1,3 (Hulin et al., Br J Sports Med 2016;50:231-236). Desvios >10% do
 * planejado alimentam a carga aguda além do que a crônica sustenta.
 */
export const DOSE_ON_TARGET_MIN = 0.9;
export const DOSE_ON_TARGET_MAX = 1.1;
export const DOSE_WEEK_ON_TARGET_MIN = DOSE_ON_TARGET_MIN;
export const DOSE_WEEK_ON_TARGET_MAX = DOSE_ON_TARGET_MAX;

export interface PlannedDoseLike {
  id?: string;
  session_date: string;
  track?: LoadTrack | string | null;
  planned_duration_min?: number | null;
  planned_rpe?: number | null;
  title?: string | null;
}

/** Carga alvo de uma sessão prescrita (duração planejada × RPE alvo). */
export function plannedLoad(durationMin?: number | null, rpe?: number | null): number {
  if (!Number.isFinite(Number(durationMin)) || !Number.isFinite(Number(rpe))) return 0;
  return Math.max(0, Math.round(Number(durationMin) * Number(rpe)));
}

/**
 * Linguagem única: o profissional planeja em nota de sRPE alvo (0-10) e o
 * calendário continua mostrando o nível de intensidade correspondente.
 * A duração é opcional: o nível acompanha a nota mesmo antes de o tempo ser
 * preenchido; só vira "descanso" quando a duração informada é zero.
 */
export function loadLevelFromRpe(rpe?: number | null, durationMin?: number | null): "rest" | "low" | "moderate" | "high" {
  const r = Number(rpe);
  const hasDuration = durationMin !== null && durationMin !== undefined && String(durationMin) !== "" && Number.isFinite(Number(durationMin));
  if (!Number.isFinite(r) || r <= 0 || (hasDuration && Number(durationMin) <= 0)) return "rest";
  if (r <= 3) return "low";
  if (r <= 6) return "moderate";
  return "high";
}


/** Aderência de dose = carga real ÷ carga alvo. Null quando não há alvo. */
export function doseAdherence(real: number, planned: number): number | null {
  if (!Number.isFinite(planned) || planned <= 0) return null;
  return Number((real / planned).toFixed(2));
}

/** Leitura da aderência: subdosado, dose certa ou superdosado. */
export function doseVerdict(
  ratio: number | null,
  bounds: { min: number; max: number } = { min: DOSE_ON_TARGET_MIN, max: DOSE_ON_TARGET_MAX },
): DoseVerdict | null {
  if (ratio === null) return null;
  if (ratio < bounds.min) return "under";
  if (ratio > bounds.max) return "over";
  return "on_target";
}

export interface TrackAdherence {
  track: LoadTrack;
  planned: number;
  real: number;
  ratio: number | null;
  verdict: DoseVerdict | null;
  /** Parcelas que compõem o planejado, ex.: "45×7 = 315". */
  plannedParts: string[];
  /** Parcelas que compõem o percebido (sRPE), ex.: "40×3 = 120". */
  realParts: string[];
}

export interface DoseAdherenceSummary {
  weekStart: string;
  weekEnd: string;
  byTrack: TrackAdherence[];
  total: TrackAdherence;
  /** Sessões passadas sem sRPE: ficam à parte, nunca contam como subdose. */
  unanswered: PlannedDoseLike[];
  /** Sessões futuras da semana: fora da soma até acontecerem. */
  upcoming: PlannedDoseLike[];
  /** Treinos relatados sem sessão planejada correspondente. */
  extras: SrpeEntryLike[];
}

const TRACKS: LoadTrack[] = ["physio", "gym", "sport", "cardio"];

const normalizeTrack = (t?: string | null): LoadTrack =>
  t === "gym" || t === "sport" || t === "cardio" ? t : "physio";

/** Segunda-feira (YYYY-MM-DD) da semana da data informada. */
export function weekStartOf(ref: Date = new Date()): string {
  return mondayOf(toDate(localISODate(ref)));
}

export const addIsoDays = (iso: string, n: number): string => {
  const d = toDate(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * Cruza a dose prescrita com o sRPE relatado, por frente (fisio / academia /
 * campo) dentro de uma semana. O total também é devolvido, mas a leitura por
 * frente é o que orienta o ajuste — compensações entre frentes escondem
 * subdose em uma e superdose em outra.
 */
export function adherenceByTrack(
  entries: Array<SrpeEntryLike & { session_id?: string | null }>,
  sessions: PlannedDoseLike[],
  weekStart: string = weekStartOf(),
  today: string = localISODate(),
): DoseAdherenceSummary {
  const weekEnd = addIsoDays(weekStart, 6);
  const inWeek = (iso: string) => {
    const d = iso.slice(0, 10);
    return d >= weekStart && d <= weekEnd;
  };

  const planned: Record<LoadTrack, number> = { physio: 0, gym: 0, sport: 0, cardio: 0 };
  const real: Record<LoadTrack, number> = { physio: 0, gym: 0, sport: 0, cardio: 0 };
  const plannedParts: Record<LoadTrack, string[]> = { physio: [], gym: [], sport: [], cardio: [] };
  const realParts: Record<LoadTrack, string[]> = { physio: [], gym: [], sport: [], cardio: [] };
  const unanswered: PlannedDoseLike[] = [];
  const upcoming: PlannedDoseLike[] = [];

  // Regra única: só entram na comparação sessões já realizadas (data ≤ hoje)
  // E com resposta (sRPE do paciente ou do profissional). Sessão passada sem
  // nota fica "sem resposta" e sessão futura fica "a realizar" — nenhuma das
  // duas vira subdose.
  const weekEntries = entries.filter((e) => inWeek(e.session_date));
  const used = new Set<SrpeEntryLike>();
  sessions.forEach((s) => {
    if (!inWeek(s.session_date)) return;
    const load = plannedLoad(s.planned_duration_min, s.planned_rpe);
    if (load <= 0) return;
    if (s.session_date.slice(0, 10) > today) { upcoming.push(s); return; }
    const matched = weekEntries.filter((e) => !used.has(e) && (
      s.id && e.session_id
        ? e.session_id === s.id
        : e.session_date.slice(0, 10) === s.session_date.slice(0, 10) && normalizeTrack(e.track) === normalizeTrack(s.track)
    ));
    if (!matched.length) { unanswered.push(s); return; }
    const track = normalizeTrack(s.track);
    planned[track] += load;
    plannedParts[track].push(`${s.planned_duration_min}×${s.planned_rpe} = ${load}`);
    matched.forEach((e) => {
      used.add(e);
      const r = trainingLoad(e.duration_min, e.rpe);
      real[track] += r;
      if (r > 0) realParts[track].push(`${e.duration_min}×${e.rpe} = ${r}`);
    });
  });
  // Treinos extras (sem sessão planejada) aparecem à parte, fora da razão.
  const extras = weekEntries.filter((e) => !used.has(e) && trainingLoad(e.duration_min, e.rpe) > 0);

  const bounds = { min: DOSE_WEEK_ON_TARGET_MIN, max: DOSE_WEEK_ON_TARGET_MAX };
  // Cardio só aparece quando há dose planejada ou relatada (frente opcional).
  const byTrack: TrackAdherence[] = TRACKS.filter((t) => t !== "cardio" || planned[t] > 0 || real[t] > 0).map((track) => {
    const ratio = doseAdherence(real[track], planned[track]);
    return {
      track,
      planned: planned[track],
      real: real[track],
      ratio,
      verdict: doseVerdict(ratio, bounds),
      plannedParts: plannedParts[track],
      realParts: realParts[track],
    };
  });
  const totalPlanned = TRACKS.reduce((a, t) => a + planned[t], 0);
  const totalReal = TRACKS.reduce((a, t) => a + real[t], 0);
  const totalRatio = doseAdherence(totalReal, totalPlanned);

  return {
    weekStart,
    weekEnd,
    byTrack,
    total: {
      track: "physio",
      planned: totalPlanned,
      real: totalReal,
      ratio: totalRatio,
      verdict: doseVerdict(totalRatio, bounds),
      plannedParts: TRACKS.flatMap((t) => plannedParts[t]),
      realParts: TRACKS.flatMap((t) => realParts[t]),
    },
    unanswered,
    upcoming,
    extras,
  };
}

export interface SessionDosePair {
  session: PlannedDoseLike;
  plannedLoad: number;
  realLoad: number;
  ratio: number | null;
  verdict: DoseVerdict | null;
}

/**
 * Pareia cada sessão prescrita com o sRPE relatado. Prefere o vínculo
 * explícito (`session_id`); sem ele, casa por data + frente.
 */
export function pairSessionsWithSrpe(
  sessions: PlannedDoseLike[],
  entries: Array<SrpeEntryLike & { session_id?: string | null }>,
): SessionDosePair[] {
  return sessions
    .map((session) => {
      const target = plannedLoad(session.planned_duration_min, session.planned_rpe);
      const matched = entries.filter((e) =>
        session.id && e.session_id
          ? e.session_id === session.id
          : e.session_date.slice(0, 10) === session.session_date.slice(0, 10) &&
            normalizeTrack(e.track) === normalizeTrack(session.track),
      );
      const realLoad = matched.reduce((sum, e) => sum + trainingLoad(e.duration_min, e.rpe), 0);
      const ratio = matched.length ? doseAdherence(realLoad, target) : null;
      return { session, plannedLoad: target, realLoad, ratio, verdict: doseVerdict(ratio) };
    });
}

/**
 * Desvio repetido: mesma frente subdosada (ou superdosada) em 2 sessões
 * consecutivas com resposta do paciente — sinal para ajustar a prescrição.
 */
export function repeatedDoseDeviation(pairs: SessionDosePair[]): Array<{ track: LoadTrack; verdict: DoseVerdict }> {
  const out: Array<{ track: LoadTrack; verdict: DoseVerdict }> = [];
  TRACKS.forEach((track) => {
    const seq = pairs
      .filter((p) => normalizeTrack(p.session.track) === track && p.verdict !== null)
      .sort((a, b) => a.session.session_date.localeCompare(b.session.session_date));
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1].verdict;
      const b = seq[i].verdict;
      if (a === b && (b === "under" || b === "over")) {
        out.push({ track, verdict: b });
        break;
      }
    }
  });
  return out;
}


/** Checklist padrão de liberação (fisio → academia → esporte). */
export const CLEARANCE_TEMPLATE: Array<{ item_key: string; label: string }> = [
  { item_key: "lsi_strength", label: "Índice de simetria de força < 10%" },
  { item_key: "lsi_hop", label: "Testes de salto unipodal simétricos (< 10%)" },
  { item_key: "rom_full", label: "ADM completa e sem dor" },
  { item_key: "load_tolerance", label: "Tolerância à carga mecânica sem piora em 24h" },
  { item_key: "psych_readiness", label: "Prontidão psicológica (TSK / ACL-RSI)" },
  { item_key: "sport_specific", label: "Gestos específicos do esporte com controle" },
];

/* ------------------------------------------------------------------ */
/* Módulo cardiovascular — Fase 1: FC de repouso (FCR) matinal          */
/* ------------------------------------------------------------------ */

export interface RestingHrLike {
  checkin_date: string;
  resting_hr?: number | null;
}

export interface RestingHrStatus {
  latest: number | null;
  latestDate: string | null;
  baseline: number | null;
  /** latest − baseline (bpm). */
  delta: number | null;
  level: "ok" | "caution" | "danger" | "insufficient";
}

/**
 * Desvio da FCR matinal frente à linha de base pessoal: média dos registros
 * anteriores nos 28 dias que antecedem o último (mínimo 3). +5 bpm = atenção,
 * +7 bpm = sinal de recuperação insuficiente (hiperativação simpática,
 * sono/estresse ruins ou início infeccioso). Sempre sugestão, nunca decisão.
 */
export function restingHrStatus(checkins: RestingHrLike[]): RestingHrStatus {
  const valid = checkins
    .filter((c) => typeof c.resting_hr === "number" && c.resting_hr! > 0)
    .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  if (valid.length === 0) return { latest: null, latestDate: null, baseline: null, delta: null, level: "insufficient" };
  const last = valid[valid.length - 1];
  const from = addIsoDays(last.checkin_date.slice(0, 10), -28);
  const prior = valid.slice(0, -1).filter((c) => c.checkin_date.slice(0, 10) >= from);
  if (prior.length < 3) {
    return { latest: last.resting_hr!, latestDate: last.checkin_date, baseline: null, delta: null, level: "insufficient" };
  }
  const baseline = Math.round((prior.reduce((a, c) => a + c.resting_hr!, 0) / prior.length) * 10) / 10;
  const delta = Math.round((last.resting_hr! - baseline) * 10) / 10;
  const level = delta >= 7 ? "danger" : delta >= 5 ? "caution" : "ok";
  return { latest: last.resting_hr!, latestDate: last.checkin_date, baseline, delta, level };
}

/* ------------------------------------------------------------------ */
/* Sinal de recuperação: prontidão universal + FC matinal prioritária  */
/* ------------------------------------------------------------------ */

export interface RecoverySignal {
  /** Fonte que decidiu o sinal. */
  source: "resting_hr" | "readiness" | "both" | "none";
  level: "ok" | "caution" | "danger" | "insufficient";
  /** Recuperação comprometida (atenção ou alerta). */
  strained: boolean;
  text: string;
}

const RANK = { insufficient: 0, ok: 1, caution: 2, danger: 3 } as const;

/**
 * Hierarquia de recuperação: a prontidão do check-in é a base universal
 * (quase todo paciente responde); a FC ao acordar é opcional e, quando existe
 * com linha de base e é recente, tem prioridade. Com as duas, vale a mais
 * conservadora. Sempre sugestão ao fisioterapeuta.
 */
export function recoverySignal(checkins: Array<ReadinessLike & RestingHrLike>, rhrAlert = 7): RecoverySignal {
  const sorted = [...checkins].sort((a, b) => a.checkin_date.localeCompare(b.checkin_date));
  const scored = sorted.filter((c) => readinessScore(c) !== null);
  const last = scored[scored.length - 1];
  const score = last ? readinessScore(last) : null;
  const drop = readinessDrop(sorted);
  const rLevel: RecoverySignal["level"] = score === null ? "insufficient" : drop ? "danger" : score < 40 ? "caution" : "ok";

  const hr = restingHrStatus(sorted);
  const lastDate = sorted[sorted.length - 1]?.checkin_date.slice(0, 10);
  const fresh = hr.latestDate !== null && lastDate !== undefined && hr.latestDate.slice(0, 10) >= addIsoDays(lastDate, -2);
  const hLevel: RecoverySignal["level"] = !fresh || hr.delta === null
    ? "insufficient"
    : hr.delta >= rhrAlert ? "danger" : hr.delta >= 5 ? "caution" : "ok";

  const hasR = rLevel !== "insufficient";
  const hasH = hLevel !== "insufficient";
  if (!hasR && !hasH) return { source: "none", level: "insufficient", strained: false, text: "Sem check-in recente de prontidão." };

  const level = RANK[hLevel] >= RANK[rLevel] ? hLevel : rLevel;
  const source = hasH && hasR ? "both" : hasH ? "resting_hr" : "readiness";
  const parts: string[] = [];
  if (hasH) parts.push(`FC ao acordar ${hr.delta! > 0 ? "+" : ""}${hr.delta} bpm da base`);
  if (hasR) parts.push(drop ? `prontidão caiu ${drop.drop} pontos (${score}%)` : `prontidão ${score}%`);
  const tail = level === "danger" ? " — recuperação comprometida." : level === "caution" ? " — recuperação abaixo do habitual." : " — recuperação preservada.";
  return { source, level, strained: level === "caution" || level === "danger", text: parts.join(" · ") + tail };
}
