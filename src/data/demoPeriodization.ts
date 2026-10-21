import { localISODate, loadLevelFromRpe, trainingLoad } from "@/lib/periodization";
import { mockPatientAssessments } from "@/data/mockPatientData";
import { demoLoadProfiles } from "./demoLoadProfiles";
import type { PeriodizationCycle, PeriodizationPlan, PeriodizationSession, SrpeEntry, ReadinessCheckin } from "@/lib/periodizationData";

const day = (iso: string, offset: number) => {
  const date = new Date(`${iso}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
};

/** Fictional, date-relative history; never read from or written to a patient account. */
export function createDemoPeriodization(today = localISODate(), key = "patient", assessmentId?: string | null) {
  const assessment = assessmentId
    ? mockPatientAssessments.find(a => a.id === assessmentId)
    : mockPatientAssessments.filter(a => a.patient_name === key || a.patient_email === key)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  const profile = assessment ? demoLoadProfiles[assessment.id] : undefined;
  const patientId = `demo-load-${key}`;
  const planId = `${patientId}-plan`;
  const plan: PeriodizationPlan = {
    id: planId, patient_id: patientId, professional_id: null, clinic_id: null, assessment_id: assessment?.id ?? null,
    title: profile?.title ?? "Sem cenário de carga revisado", sport: profile?.sport ?? null, injured_limb: profile?.limb ?? null,
    start_date: day(today, -(profile?.historyDays ?? 0)), end_date: null, status: "active",
    notes: profile ? `Caso fictício. ${profile.notes}` : "Sem dados de carga para esta avaliação.", created_at: `${today}T12:00:00Z`,
  };
  const cycles: PeriodizationCycle[] = profile ? [{ id: `${planId}-current`, plan_id: planId, parent_id: null,
    level: "macro", name: profile.phase, goal: profile.goal, exit_criteria: null,
    start_date: today, end_date: null, sort_order: 0, is_current: true }] : [];
  const sessions: PeriodizationSession[] = [];
  const entries: SrpeEntry[] = [];
  const checkins: ReadinessCheckin[] = [];
  for (let offset = -(profile?.historyDays ?? 0); profile && offset <= 13; offset++) {
    const date = day(today, offset);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (offset <= 0) checkins.push({ id: `${patientId}-check-${date}`, patient_id: patientId, plan_id: planId,
      checkin_date: date, soreness: profile.pain >= 6 ? 6 : 2, sleep: profile.pain >= 6 ? 4 : 7,
      stress: profile.pain >= 6 ? 6 : 3, fatigue: profile.pain >= 6 ? 6 : 3,
      readiness: profile.readiness, pain: profile.pain, note: null, source: "patient" });
    let dose = profile.sessions.find(s => s.weekday === weekday);
    // João reported abandoning physio and running >10 km: show poor adherence, not a healthy six-day week.
    if (assessment?.id === "demo-002b" && offset < -2) {
      dose = weekday === 0 ? { weekday, track: "sport", title: "Corrida longa relatada — sobrecarga, não recomendação", minutes: 70, rpe: 8 } : undefined;
    }
    if (!dose) continue;
    // Before Juliana's latest release, recorded activity is preparation, not already-cleared running.
    if (assessment?.id === "demo-006d" && offset < -3 && dose.track === "sport") {
      dose = { ...dose, track: "physio", title: "Preparação neuromuscular pré-retorno" };
    }
    const { track, minutes: duration, rpe } = dose;
    const id = `${patientId}-session-${date}`;
    sessions.push({ id, patient_id: patientId, plan_id: planId, cycle_id: null, session_date: date, track,
      title: dose.title,
      planned_load: loadLevelFromRpe(rpe, duration), planned_duration_min: duration, planned_rpe: rpe,
      planned_target_load: trainingLoad(duration, rpe), exercise_program_id: null, notes: profile.notes, created_source: "professional" });
    if (offset < 0) entries.push({ id: `${patientId}-entry-${date}`, patient_id: patientId, plan_id: planId,
      session_date: date, track, duration_min: duration, rpe,
      training_load: trainingLoad(duration, rpe), source: "professional", notes: "Registro fictício", session_id: id });
  }
  return { patientId, plan, cycles, sessions, entries, checkins };
}

export function mergeDemoSession(entries: SrpeEntry[], entry: SrpeEntry) {
  const existing = entries.find(e => e.session_date === entry.session_date && e.track === entry.track);
  return existing ? entries.map(e => e.id === existing.id ? { ...entry, id: existing.id } : e) : [...entries, entry];
}