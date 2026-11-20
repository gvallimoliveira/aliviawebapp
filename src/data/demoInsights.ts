import { mockPatientAssessments } from "./mockPatientData";
import { createDemoPeriodization } from "./demoPeriodization";
import { DEMO_STEPS } from "./demoSteps";
import { localISODate, loadStatus, pairSessionsWithSrpe, readinessScore } from "@/lib/periodization";
import { addDaysISO } from "@/lib/loadWindows";
import { buildPriceResolver, careOccupancyStats, emptyChairCost, lateCancellations, recordCompliance, type MgmtAppt, type MgmtNote } from "@/lib/managementMetrics";

/** Local demo signals. No RPCs, AI, diaries or messages are metric inputs. */
export function createDemoInsights(today = localISODate(), appointments: MgmtAppt[] = []) {
  const latest = new Map<string, (typeof mockPatientAssessments)[number]>();
  for (const assessment of mockPatientAssessments) {
    const key = assessment.patient_email;
    const previous = latest.get(key);
    if (!previous || assessment.created_at > previous.created_at) latest.set(key, assessment);
  }
  const patients = [...latest.values()].map(assessment => {
    const demo = createDemoPeriodization(today, assessment.patient_name, assessment.id);
    const recentCheckins = demo.checkins.filter(c => c.checkin_date >= addDaysISO(today, -13));
    const recentPairs = pairSessionsWithSrpe(demo.sessions, demo.entries).filter(p => p.session.session_date >= addDaysISO(today, -13) && p.session.session_date <= today && p.plannedLoad > 0);
    const answered = recentPairs.filter(p => p.ratio !== null);
    const lastCheckin = demo.checkins.at(-1);
    const phase = demo.plan.status === "completed" ? "Alta" : demo.cycles.find(c => c.is_current)?.name ?? "Sem fase";
    return {
      id: assessment.id, name: assessment.patient_name, phase, completed: demo.plan.status === "completed",
      pain: lastCheckin?.pain ?? null, readiness: lastCheckin ? readinessScore(lastCheckin) : null,
      load: loadStatus(demo.entries, demo.checkins, new Date(`${today}T12:00:00`)),
      checkinDays: recentCheckins.length, planned: recentPairs.length, answered: answered.length,
      under: answered.filter(p => p.verdict === "under").length,
      over: answered.filter(p => p.verdict === "over").length,
      // An unanswered planned session is not an underdose.
      missing: recentPairs.filter(p => p.ratio === null).length,
      notes: demo.plan.notes,
    };
  });
  const price = 150;
  const services = [{ id: "demo-physio", name: "Fisioterapia", price, billing_type: "per_session" as const }];
  const priceOf = buildPriceResolver(appointments, services, price);
  const recent = appointments.filter(a => a.appointment_date >= addDaysISO(today, -6) && a.appointment_date <= today);
  const month = appointments.filter(a => a.appointment_date.startsWith(today.slice(0, 7)) && a.appointment_date <= today && a.status === "completed");
  const notes: MgmtNote[] = [];
  const professionals = new Set(appointments.map(a => a.professional_id).filter(Boolean)).size || 1;
  const careDays = Array.from({ length: 7 }, (_, i) => addDaysISO(today, -i)).filter(d => ![0, 6].includes(new Date(`${d}T12:00:00Z`).getUTCDay())).length;
  return {
    today, patients, phases: DEMO_STEPS.map(step => ({ name: step.name, count: patients.filter(p => p.phase === step.name).length })),
    revenue: month.reduce((sum, a) => sum + priceOf(a), 0), realized: month.length, price,
    chair: emptyChairCost(appointments, price, today, 30, priceOf),
    occupancy: careOccupancyStats(recent, careDays * 8 * professionals),
    records: recordCompliance(appointments, notes, new Date(`${today}T20:00:00`), 30),
    cancellations: lateCancellations(appointments, today, 30),
    team: [...new Set(appointments.map(a => a.professional_id).filter(Boolean))].map(id => ({
      id, completed: month.filter(a => a.professional_id === id).length,
      revenue: month.filter(a => a.professional_id === id).reduce((sum, a) => sum + priceOf(a), 0),
    })),
  };
}