/**
 * Planejamento automático (Fase 2C) — 100% local, sem IA. Sempre sugestão editável.
 * Regras: salto semanal ≤10%, ACWR alvo dentro da faixa do perfil, sem dois dias
 * duros seguidos, ajuste do dia pela FC ao acordar / prontidão.
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

/** Dias da semana (0=seg) espalhados, sem dois "duros" seguidos. */
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

export function suggestNextWeek(entries: PlanEntry[], profile?: string | null, ref = new Date()): SuggestedSession[] {
  const rule = profileRule(profile);
  const hardRpe = profile === "hypertensive" || profile === "cardiac" ? 6 : profile === "sedentary" ? 6 : 7;
  const lightRpe = 4;
  const monday = nextMonday(ref);
  const tracks = Array.from(new Set(entries.map((e) => e.track || "physio")));
  const out: SuggestedSession[] = [];
  const usedDay = new Map<number, number>();

  for (const track of tracks) {
    const rows = entries.filter((e) => (e.track || "physio") === track && daysAgo(e.session_date, ref) >= 0 && daysAgo(e.session_date, ref) < 28);
    if (!rows.length) continue;
    const chronicWeekly = rows.reduce((a, e) => a + (Number(e.training_load) || 0), 0) / 4;
    const lastWeek = rows.filter((e) => daysAgo(e.session_date, ref) < 7).reduce((a, e) => a + (Number(e.training_load) || 0), 0);
    const base = lastWeek > 0 ? lastWeek : chronicWeekly;
    // Meta: progredir até 10%, sem ultrapassar o teto de ACWR do perfil nem cair abaixo de 0,8.
    let target = Math.min(base * 1.1, chronicWeekly * rule.acwrMax);
    target = Math.max(target, chronicWeekly * 0.8);
    if (target <= 0) continue;
    const perWeek = Math.max(1, Math.min(6, Math.round(rows.filter((e) => e.training_load > 0).length / 4)));
    const slots = spreadDays(perWeek);
    const weights = slots.map((s) => (s.kind === "hard" ? hardRpe : lightRpe));
    const wSum = weights.reduce((a, b) => a + b, 0);
    slots.forEach((s, i) => {
      const load = (target * weights[i]) / wSum;
      const rpe = s.kind === "hard" ? hardRpe : lightRpe;
      const day = (s.day + (usedDay.get(s.day) ? 0 : 0));
      usedDay.set(day, (usedDay.get(day) || 0) + 1);
      const d = new Date(monday); d.setUTCDate(d.getUTCDate() + day);
      out.push({ date: iso(d), track, rpe, duration: Math.max(10, Math.round(load / rpe / 5) * 5), kind: s.kind });
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
