import { localISODate, loadLevelFromRpe, trainingLoad } from "@/lib/periodization";
import { mockPatientAssessments } from "@/data/mockPatientData";
import { demoLoadProfiles } from "./demoLoadProfiles";
import type { PeriodizationCycle, PeriodizationPlan, PeriodizationSession, SrpeEntry, ReadinessCheckin } from "@/lib/periodizationData";

/** Deterministic pseudo-random [0,1) per date so the demo is stable across renders. */
const noise = (seed: string) => {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 1000) / 1000;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

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
    notes: profile ? `Cenário de carga fictício, não prescrição. Doses e prontidão ilustrativas; dor atual e fase alinhadas à avaliação. ${profile.notes}` : "Sem dados de carga para esta avaliação.", created_at: `${today}T12:00:00Z`,
  };
  const cycles: PeriodizationCycle[] = profile ? [{ id: `${planId}-current`, plan_id: planId, parent_id: null,
    level: "macro", name: profile.phase, goal: profile.goal, exit_criteria: null,
    start_date: today, end_date: null, sort_order: 0, is_current: true }] : [];
  const sessions: PeriodizationSession[] = [];
  const entries: SrpeEntry[] = [];
  const checkins: ReadinessCheckin[] = [];
  // Real-world texture: physio + concurrent activities (pilates/gym/sport), skipped,
  // shortened (underdose), on-target and overdone (overdose) days, and readiness that
  // dips after heavy days and recovers. Today's check-in stays aligned to the assessment.
  let fatigueDebt = 0;
  for (let offset = -(profile?.historyDays ?? 0); profile && offset <= 13; offset++) {
    const date = day(today, offset);
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const r = noise(`${patientId}:${date}`);
    if (offset <= 0) {
      const base = profile.readiness;
      const readiness = offset === 0 ? base : clamp(base - fatigueDebt + (r - 0.5) * 2.4, 1, 10);
      const strain = clamp(10 - readiness, 1, 9);
      const pain = offset === 0 ? profile.pain : clamp(profile.pain + (fatigueDebt >= 2 ? 1 : 0) + (r > 0.85 ? 1 : 0) - (r < 0.15 ? 1 : 0), 0, 10);
      checkins.push({ id: `${patientId}-check-${date}`, patient_id: patientId, plan_id: planId,
        checkin_date: date, soreness: clamp(strain * 0.8 + fatigueDebt, 1, 10), sleep: clamp(readiness - 0.5 + (r - 0.5) * 2, 1, 10),
        stress: clamp(strain * 0.7 + r * 2, 1, 10), fatigue: clamp(strain + fatigueDebt * 0.5, 1, 10),
        readiness, pain, note: null, source: "patient" });
    }
    fatigueDebt = Math.max(0, fatigueDebt - 1);
    const planned = [...profile.sessions, ...(profile.concurrent ?? [])].filter(s => s.weekday === weekday);
    let doses = planned;
    // João reported abandoning physio and running >10 km: show poor adherence, not a healthy six-day week.
    if (assessment?.id === "demo-002b" && offset < -2) {
      doses = weekday === 0 ? [{ weekday, track: "sport", title: "Corrida longa relatada — sobrecarga, não recomendação", minutes: 70, rpe: 8 }] : [];
    }
    doses.forEach((planDose, idx) => {
      let dose = planDose;
      // Before Juliana's latest release, recorded activity is preparation, not already-cleared running.
      if (assessment?.id === "demo-006d" && offset < -3 && dose.track === "sport") {
        dose = { ...dose, track: "physio", title: "Preparação neuromuscular pré-retorno" };
      }
      const { track, minutes: duration, rpe } = dose;
      const id = `${patientId}-session-${date}-${track}-${idx}`;
      sessions.push({ id, patient_id: patientId, plan_id: planId, cycle_id: null, session_date: date, track,
        title: dose.title,
        planned_load: loadLevelFromRpe(rpe, duration), planned_duration_min: duration, planned_rpe: rpe,
        planned_target_load: trainingLoad(duration, rpe), exercise_program_id: null, notes: profile.notes, created_source: "professional" });
      if (offset >= 0) return;
      const v = noise(`${id}:dose`);
      if (v < 0.12) return; // skipped: no record
      let realMin = duration, realRpe = rpe, label = "dose certa";
      if (v < 0.32) { realMin = Math.round(duration * 0.6); realRpe = Math.max(1, rpe - 1); label = "subdose — sessão encurtada"; }
      else if (v > 0.84) { realMin = Math.round(duration * 1.35); realRpe = Math.min(10, rpe + 2); label = "superdose — passou do combinado"; }
      else { realMin = Math.round(duration * (0.9 + v * 0.2)); }
      if (realRpe >= 7 || label.startsWith("superdose")) fatigueDebt += 2;
      entries.push({ id: `${patientId}-entry-${date}-${track}-${idx}`, patient_id: patientId, plan_id: planId,
        session_date: date, track, duration_min: realMin, rpe: realRpe,
        training_load: trainingLoad(realMin, realRpe), source: track === "physio" ? "professional" : "patient", notes: `Registro fictício (${label})`, session_id: id });
    });
  }
  return { patientId, plan, cycles, sessions, entries, checkins };
}

export function mergeDemoSession(entries: SrpeEntry[], entry: SrpeEntry) {
  const existing = entries.find(e => e.session_date === entry.session_date && e.track === entry.track);
  return existing ? entries.map(e => e.id === existing.id ? { ...entry, id: existing.id } : e) : [...entries, entry];
}