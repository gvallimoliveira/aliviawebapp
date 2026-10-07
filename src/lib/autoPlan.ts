/**
 * Planejamento automático (Fase 2C) — 100% local, sem IA. Sempre sugestão editável.
 * Regras: salto semanal ≤10%, ACWR alvo dentro da faixa do perfil, sem dois dias
 * intensos seguidos, ajuste do dia pela FC ao acordar / prontidão.
 */
import { profileRule } from "./cardioSafety";
import { readinessScore, restingHrStatus } from "./periodization";

export interface PlanEntry { session_date: string; training_load: number; track?: string | null }
export interface SuggestedSession { date: string; track: string; duration: number; rpe: number; kind: "hard" | "light" }

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (date: string, ref: Date) => Math.round((ref.getTime() - new Date(`${date}T12:00:00Z`).getTime()) / 86400000);

/** Segunda-feira da próxima semana. */
export function nextMonday(ref = new Date()): Date {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), 12));
  const dow = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() + (7 - dow));
  return d;
}

/** Dias da semana (0=seg) espalhados, sem dois "intensos" seguidos. */
export function spreadDays(n: number): Array<{ day: number; kind: "hard" | "light" }> {
  const patterns: Record<number, number[]> = { 1: [2], 2: [1, 4], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 3, 4, 6], 6: [0, 1, 2, 3, 4, 5] };
  const days = patterns[Math.max(1, Math.min(6, n))];
  let prevHard = -9;
  return days.map((day, i) => {
    const hard = i % 2 === 0 && day - prevHard > 1;
    if (hard) prevHard = day;
    return { day, kind: hard ? "hard" : "light" };
  });
}

/** Faixa usual de duração por frente (min). Fora dela, a dose é ajustada pelo esforço. */
export const TRACK_DURATION: Record<string, [number, number]> = { physio: [50, 60], gym: [45, 60] };

export interface PlannedLike { session_date: string; track?: string | null; planned_duration_min?: number | null; planned_rpe?: number | null }

/**
 * Sugere a próxima semana por frente.
 * Referência: a dose planejada da semana atual (o que o profissional prescreveu);
 * sem prescrição, a carga real da última semana. Progride 10% só quando as
 * sessões já respondidas da semana ficaram na dose certa; senão mantém.
 * O teto de ACWR do perfil só limita quando há ≥3 semanas de histórico real —
 * com histórico curto a "carga crônica" é artificialmente baixa (ex.: 1 sessão
 * ÷ 4 semanas) e esmagaria a sugestão.
 */
export function suggestNextWeek(
  entries: PlanEntry[],
  profile?: string | null,
  ref = new Date(),
  planned: PlannedLike[] = [],
): SuggestedSession[] {
  const rule = profileRule(profile);
  const intenseRpe = profile === "hypertensive" || profile === "cardiac" ? 6 : profile === "sedentary" ? 6 : 7;
  const lightRpe = 4;
  const monday = nextMonday(ref);
  const thisMonday = new Date(monday); thisMonday.setUTCDate(thisMonday.getUTCDate() - 7);
  const thisMon = iso(thisMonday);
  const thisSun = iso(new Date(monday.getTime() - 86400000));
  const todayIso = iso(new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), 12)));
  const tr = (t?: string | null) => t || "physio";
  const pLoad = (s: PlannedLike) => Math.max(0, Number(s.planned_duration_min || 0) * Number(s.planned_rpe || 0));
  const tracks = Array.from(new Set([...entries.map((e) => tr(e.track)), ...planned.map((s) => tr(s.track))]));
  const out: SuggestedSession[] = [];

  for (const track of tracks) {
    const rows = entries.filter((e) => tr(e.track) === track && daysAgo(e.session_date, ref) >= 0 && daysAgo(e.session_date, ref) < 28);
    const weekPlan = planned.filter((s) => tr(s.track) === track && s.session_date >= thisMon && s.session_date <= thisSun && pLoad(s) > 0);
    if (!rows.length && !weekPlan.length) continue;

    const oldest = rows.reduce((m, e) => Math.max(m, daysAgo(e.session_date, ref)), 0);
    const realWeeks = rows.length ? Math.max(1, Math.min(4, Math.ceil((oldest + 1) / 7))) : 0;
    const chronicWeekly = realWeeks ? rows.reduce((a, e) => a + (Number(e.training_load) || 0), 0) / realWeeks : 0;
    const lastWeek = rows.filter((e) => daysAgo(e.session_date, ref) < 7).reduce((a, e) => a + (Number(e.training_load) || 0), 0);
    const plannedWeek = weekPlan.reduce((a, s) => a + pLoad(s), 0);

    // Aderência das sessões já realizadas e respondidas desta semana.
    let pDone = 0, rDone = 0;
    weekPlan.filter((s) => s.session_date <= todayIso).forEach((s) => {
      const real = rows.filter((e) => e.session_date === s.session_date).reduce((a, e) => a + (Number(e.training_load) || 0), 0);
      if (real > 0) { pDone += pLoad(s); rDone += real; }
    });
    const ratio = pDone > 0 ? rDone / pDone : null;
    const progress = ratio !== null && ratio >= 0.9 && ratio <= 1.1 ? 1.1 : 1;

    const base = plannedWeek > 0 ? plannedWeek : lastWeek > 0 ? lastWeek : chronicWeekly;
    let target = base * progress;
    if (realWeeks >= 3 && chronicWeekly > 0) {
      target = Math.min(target, chronicWeekly * rule.acwrMax);
      target = Math.max(target, chronicWeekly * 0.8);
    }
    if (target <= 0) continue;

    const perWeek = Math.max(1, Math.min(6, weekPlan.length || Math.round(rows.filter((e) => e.training_load > 0).length / Math.max(1, realWeeks))));
    const slots = spreadDays(perWeek);
    const weights = slots.map((s) => (s.kind === "hard" ? intenseRpe : lightRpe));
    const wSum = weights.reduce((a, b) => a + b, 0);
    slots.forEach((s, i) => {
      const load = (target * weights[i]) / wSum;
      let rpe = s.kind === "hard" ? intenseRpe : lightRpe;
      let duration = Math.max(10, Math.round(load / rpe / 5) * 5);
      const range = TRACK_DURATION[track];
      if (range) {
        duration = Math.max(range[0], Math.min(range[1], duration));
        rpe = Math.max(1, Math.min(10, Math.round(load / duration)));
      }
      const d = new Date(monday); d.setUTCDate(d.getUTCDate() + s.day);
      out.push({ date: iso(d), track, rpe, duration, kind: s.kind });
    });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.track.localeCompare(b.track));
}

export interface DayAdjustment { reason: string; duration: number; rpe: number }

/** Ajuste dinâmico do dia: FC ao acordar alta ou prontidão baixa → −50% duração ou PSE ≤4. */
export function adjustToday(
  session: { planned_duration_min: number | null; planned_rpe: number | null },
  checkins: Array<{ checkin_date: string; resting_hr?: number | null; readiness?: number | null; sleep?: number | null; soreness?: number | null; stress?: number | null; fatigue?: number | null; pain?: number | null }>,
  profile?: string | null,
  todayISO = new Date().toISOString().slice(0, 10),
): DayAdjustment | null {
  const rule = profileRule(profile);
  const today = checkins.find((c) => c.checkin_date === todayISO);
  if (!today) return null;
  const hr = restingHrStatus(checkins as any);
  const hrHigh = hr.latestDate === todayISO && hr.delta !== null && hr.delta >= rule.rhrAlert;
  const score = readinessScore(today as any);
  const low = score !== null && score < 40;
  if (!hrHigh && !low) return null;
  const dur = session.planned_duration_min ?? 0;
  const rpe = session.planned_rpe ?? 0;
  return {
    reason: hrHigh ? `FC ao acordar +${hr.delta} bpm` : `prontidão baixa (${score}/100)`,
    duration: Math.max(10, Math.round(dur / 2)),
    rpe: Math.min(rpe || 4, 4),
  };
}
