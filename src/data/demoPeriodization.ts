import { MACRO_PHASES, localISODate, loadLevelFromRpe, trainingLoad } from "@/lib/periodization";
import type { PeriodizationCycle, PeriodizationPlan, PeriodizationSession, SrpeEntry, ReadinessCheckin } from "@/lib/periodizationData";

const day = (iso: string, offset: number) => {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

/** Fictional, date-relative history; never read from or written to a patient account. */
export function createDemoPeriodization(today = localISODate(), key = "patient") {
  const patientId = `demo-load-${key}`;
  const planId = `${patientId}-plan`;
  const plan: PeriodizationPlan = {
    id: planId, patient_id: patientId, professional_id: null, clinic_id: null, assessment_id: null,
    title: "Recuperação funcional", sport: "Atividade física", injured_limb: null,
    start_date: day(today, -28), end_date: null, status: "active", notes: "Caso fictício", created_at: `${today}T12:00:00Z`,
  };
  let cursor = plan.start_date;
  const cycles: PeriodizationCycle[] = MACRO_PHASES.map((phase, i) => {
    const start = cursor;
    cursor = day(cursor, phase.weeks * 7);
    return { id: `${planId}-${i}`, plan_id: planId, parent_id: null, level: "macro", name: phase.name,
      goal: phase.goal, exit_criteria: null, start_date: start, end_date: day(cursor, -1), sort_order: i, is_current: i === 1 };
  });
  const sessions: PeriodizationSession[] = [];
  const entries: SrpeEntry[] = [];
  const checkins: ReadinessCheckin[] = [];
  for (let offset = -34; offset <= 13; offset++) {
    const date = day(today, offset);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (offset <= 0) checkins.push({ id: `${patientId}-check-${date}`, patient_id: patientId, plan_id: planId,
      checkin_date: date, soreness: 3, sleep: 7, stress: 3, fatigue: offset === -1 ? 5 : 3,
      readiness: offset === -1 ? 5 : 8, pain: 2, note: null, source: "patient" });
    if (weekday === 0) continue;
    const track = weekday === 1 || weekday === 3 || weekday === 5 ? "physio" : "gym";
    const duration = track === "physio" ? 40 : 30;
    const rpe = track === "physio" ? 4 : 5;
    const id = `${patientId}-session-${date}`;
    sessions.push({ id, patient_id: patientId, plan_id: planId, cycle_id: null, session_date: date, track,
      title: track === "physio" ? "Controle motor e força" : "Fortalecimento supervisionado",
      planned_load: loadLevelFromRpe(rpe, duration), planned_duration_min: duration, planned_rpe: rpe,
      planned_target_load: trainingLoad(duration, rpe), exercise_program_id: null, notes: null, created_source: "professional" });
    if (offset < 0) entries.push({ id: `${patientId}-entry-${date}`, patient_id: patientId, plan_id: planId,
      session_date: date, track, duration_min: duration, rpe: offset === -1 ? rpe + 1 : rpe,
      training_load: trainingLoad(duration, offset === -1 ? rpe + 1 : rpe), source: "professional", notes: null, session_id: id });
  }
  return { patientId, plan, cycles, sessions, entries, checkins };
}

export function mergeDemoSession(entries: SrpeEntry[], entry: SrpeEntry) {
  const existing = entries.find(e => e.session_date === entry.session_date && e.track === entry.track);
  return existing ? entries.map(e => e.id === existing.id ? { ...entry, id: existing.id } : e) : [...entries, entry];
}