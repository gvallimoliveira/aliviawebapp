/**
 * Pure, deterministic management metrics for the Insights tab.
 * No AI, no network. All inputs are already scoped (clinic or solo PRO).
 */

export interface MgmtAppt {
  id: string;
  appointment_date: string; // YYYY-MM-DD
  appointment_time?: string | null;
  status: string;
  duration_minutes?: number | null;
  service_type?: string | null;
  professional_id?: string | null;
  patient_email?: string | null;
  patient_name?: string | null;
}

export interface MgmtNote {
  appointment_id?: string | null;
  patient_email?: string | null;
  session_date?: string | null;
  created_at: string;
}

export const LOST_STATUSES = ["no_show", "no_show_justified", "cancelled"];
export const DROPOUT_DAYS = 30;
export const RECORD_DEADLINE_HOURS = 48;

const DAY_MS = 86400000;
const toDay = (iso: string) => Date.parse(iso.slice(0, 10) + "T00:00:00Z");
export const addDays = (iso: string, n: number) => new Date(toDay(iso) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((toDay(a) - toDay(b)) / DAY_MS);

/** Billable care appointments: personal commitments never count. */
export const isCare = (a: MgmtAppt) => (a.service_type || "") !== "compromisso";

export const patientKey = (a: { patient_email?: string | null; patient_name?: string | null }) => {
  const e = (a.patient_email || "").trim().toLowerCase();
  if (e) return e;
  const n = (a.patient_name || "").trim().toLowerCase();
  return n ? `name:${n}` : "";
};

const inWindow = (a: MgmtAppt, from: string, today: string) => a.appointment_date >= from && a.appointment_date <= today;

export function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* ---------------- Custo da cadeira vazia ---------------- */
export function emptyChairCost(appts: MgmtAppt[], price: number, today: string, days: number) {
  const from = addDays(today, -(days - 1));
  const care = appts.filter((a) => isCare(a) && inWindow(a, from, today));
  const lost = care.filter((a) => LOST_STATUSES.includes(a.status));
  const noShow = lost.filter((a) => a.status !== "cancelled").length;
  const cancelled = lost.length - noShow;
  const byMonth: Record<string, number> = {};
  const byWeekday = [0, 0, 0, 0, 0, 0, 0];
  const byHour: Record<string, number> = {};
  for (const a of lost) {
    const m = a.appointment_date.slice(0, 7);
    byMonth[m] = (byMonth[m] || 0) + price;
    byWeekday[new Date(toDay(a.appointment_date)).getUTCDay()] += 1;
    const h = (a.appointment_time || "").slice(0, 2);
    if (h) byHour[h] = (byHour[h] || 0) + 1;
  }
  const topHours = Object.entries(byHour).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([h, n]) => ({ hour: `${h}h`, count: n }));
  return {
    lostCount: lost.length,
    noShow,
    cancelled,
    lostValue: lost.length * price,
    lossRate: care.length ? Math.round((lost.length / care.length) * 100) : 0,
    byMonth: Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, value })),
    byWeekday,
    topHours,
  };
}

/* ---------------- Horas disponíveis / Receita por hora ---------------- */
export function availableHours(opts: {
  today: string;
  days: number;
  start?: string | null;
  end?: string | null;
  workingDays?: number[] | null;
  therapists?: number;
}) {
  const start = parseHour(opts.start) ?? 8;
  const end = parseHour(opts.end) ?? 18;
  const perDay = Math.max(0, end - start);
  const wd = opts.workingDays && opts.workingDays.length ? opts.workingDays : [1, 2, 3, 4, 5];
  let n = 0;
  for (let i = 0; i < opts.days; i++) {
    const d = new Date(toDay(opts.today) - i * DAY_MS).getUTCDay();
    if (wd.includes(d)) n++;
  }
  return n * perDay * Math.max(1, opts.therapists ?? 1);
}

function parseHour(v?: string | null): number | null {
  if (!v) return null;
  const [h, m] = v.split(":").map(Number);
  return Number.isFinite(h) ? h + (Number.isFinite(m) ? m / 60 : 0) : null;
}

export function revenuePerHour(appts: MgmtAppt[], price: number, today: string, days: number, availHours: number) {
  const from = addDays(today, -(days - 1));
  const done = appts.filter((a) => isCare(a) && a.status === "completed" && inWindow(a, from, today));
  const revenue = done.length * price;
  const workedHours = done.reduce((s, a) => s + (a.duration_minutes || 50), 0) / 60;
  const per: Record<string, { sessions: number; hours: number }> = {};
  for (const a of done) {
    const k = a.professional_id || "—";
    per[k] = per[k] || { sessions: 0, hours: 0 };
    per[k].sessions++;
    per[k].hours += (a.duration_minutes || 50) / 60;
  }
  return {
    revenue,
    sessions: done.length,
    availableHours: availHours,
    workedHours: round1(workedHours),
    perAvailableHour: availHours > 0 ? round2(revenue / availHours) : 0,
    perWorkedHour: workedHours > 0 ? round2(revenue / workedHours) : 0,
    byTherapist: Object.entries(per)
      .map(([id, v]) => ({ id, sessions: v.sessions, revenue: v.sessions * price, perWorkedHour: v.hours > 0 ? round2((v.sessions * price) / v.hours) : 0 }))
      .sort((a, b) => b.revenue - a.revenue),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ---------------- Ciclos encerrados (base de LTV e alta x evasão) ---------------- */
export interface ClosedCycle {
  key: string;
  name: string;
  sessions: number;
  therapistId: string | null;
  outcome: "discharge" | "dropout";
  lastDate: string;
}

/**
 * A cycle is closed when the patient has a recorded discharge (completed plan)
 * or has had no completed session for DROPOUT_DAYS and nothing scheduled ahead.
 */
export function closedCycles(appts: MgmtAppt[], dischargedKeys: Set<string>, today: string): ClosedCycle[] {
  const byPatient = new Map<string, MgmtAppt[]>();
  for (const a of appts) {
    if (!isCare(a)) continue;
    const k = patientKey(a);
    if (!k) continue;
    if (!byPatient.has(k)) byPatient.set(k, []);
    byPatient.get(k)!.push(a);
  }
  const out: ClosedCycle[] = [];
  for (const [key, list] of byPatient) {
    const done = list.filter((a) => a.status === "completed" && a.appointment_date <= today);
    if (!done.length) continue;
    const hasFuture = list.some((a) => a.status === "scheduled" && a.appointment_date >= today);
    const lastDate = done.map((a) => a.appointment_date).sort().at(-1)!;
    const discharged = dischargedKeys.has(key);
    const dropout = !discharged && !hasFuture && diffDays(today, lastDate) >= DROPOUT_DAYS;
    if (!discharged && !dropout) continue;
    const count: Record<string, number> = {};
    for (const a of done) if (a.professional_id) count[a.professional_id] = (count[a.professional_id] || 0) + 1;
    const therapistId = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    out.push({ key, name: done[0].patient_name || key, sessions: done.length, therapistId, outcome: discharged ? "discharge" : "dropout", lastDate });
  }
  return out;
}

export function clinicalLtv(cycles: ClosedCycle[], price: number) {
  const vals = cycles.map((c) => c.sessions * price);
  const sess = cycles.map((c) => c.sessions);
  const group = (o: ClosedCycle["outcome"]) => {
    const g = cycles.filter((c) => c.outcome === o);
    return { patients: g.length, avgValue: g.length ? round2((g.reduce((s, c) => s + c.sessions, 0) * price) / g.length) : 0, avgSessions: g.length ? round1(g.reduce((s, c) => s + c.sessions, 0) / g.length) : 0 };
  };
  return {
    patients: cycles.length,
    avgValue: vals.length ? round2(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    medianValue: median(vals),
    avgSessions: sess.length ? round1(sess.reduce((a, b) => a + b, 0) / sess.length) : 0,
    discharge: group("discharge"),
    dropout: group("dropout"),
  };
}

export const MIN_CASES_PER_THERAPIST = 3;

export function dischargeVsDropout(cycles: ClosedCycle[], today: string, days: number) {
  const from = addDays(today, -(days - 1));
  const inPeriod = cycles.filter((c) => c.lastDate >= from);
  const per: Record<string, { discharge: number; dropout: number }> = {};
  for (const c of inPeriod) {
    const k = c.therapistId || "—";
    per[k] = per[k] || { discharge: 0, dropout: 0 };
    per[k][c.outcome]++;
  }
  const total = inPeriod.length;
  const discharges = inPeriod.filter((c) => c.outcome === "discharge").length;
  return {
    total,
    discharges,
    dropouts: total - discharges,
    dischargeRate: total ? Math.round((discharges / total) * 100) : 0,
    byTherapist: Object.entries(per)
      .map(([id, v]) => {
        const n = v.discharge + v.dropout;
        return { id, ...v, total: n, rate: Math.round((v.discharge / n) * 100), enough: n >= MIN_CASES_PER_THERAPIST };
      })
      .sort((a, b) => Number(b.enough) - Number(a.enough) || b.rate - a.rate),
  };
}

/* ---------------- Prontuário em dia ---------------- */
export function recordCompliance(appts: MgmtAppt[], notes: MgmtNote[], now: Date, days: number) {
  const today = now.toISOString().slice(0, 10);
  const from = addDays(today, -(days - 1));
  const done = appts.filter((a) => isCare(a) && a.status === "completed" && inWindow(a, from, today));
  const byAppt = new Map<string, MgmtNote[]>();
  const byPatientDay = new Map<string, MgmtNote[]>();
  for (const n of notes) {
    if (n.appointment_id) {
      if (!byAppt.has(n.appointment_id)) byAppt.set(n.appointment_id, []);
      byAppt.get(n.appointment_id)!.push(n);
    }
    const e = (n.patient_email || "").trim().toLowerCase();
    if (e && n.session_date) {
      const k = `${e}|${n.session_date.slice(0, 10)}`;
      if (!byPatientDay.has(k)) byPatientDay.set(k, []);
      byPatientDay.get(k)!.push(n);
    }
  }
  let onTime = 0, late = 0;
  const pending: { id: string; name: string; date: string; therapistId: string | null; hoursSince: number }[] = [];
  const per: Record<string, { total: number; onTime: number }> = {};
  for (const a of done) {
    const e = (a.patient_email || "").trim().toLowerCase();
    const cands = [...(byAppt.get(a.id) || []), ...(e ? byPatientDay.get(`${e}|${a.appointment_date}`) || [] : [])];
    const start = Date.parse(`${a.appointment_date}T${(a.appointment_time || "00:00").slice(0, 5)}:00`);
    const deadline = start + RECORD_DEADLINE_HOURS * 3600000;
    const k = a.professional_id || "—";
    per[k] = per[k] || { total: 0, onTime: 0 };
    const elapsed = now.getTime() - start;
    if (!cands.length) {
      if (elapsed < RECORD_DEADLINE_HOURS * 3600000) continue; // still inside the window
      per[k].total++;
      pending.push({ id: a.id, name: a.patient_name || a.patient_email || "—", date: a.appointment_date, therapistId: a.professional_id || null, hoursSince: Math.floor(elapsed / 3600000) });
      continue;
    }
    per[k].total++;
    const first = Math.min(...cands.map((n) => Date.parse(n.created_at)));
    if (first <= deadline) { onTime++; per[k].onTime++; } else late++;
  }
  const evaluated = onTime + late + pending.length;
  return {
    evaluated,
    onTime,
    late,
    pendingCount: pending.length,
    rate: evaluated ? Math.round((onTime / evaluated) * 100) : 100,
    pending: pending.sort((a, b) => b.hoursSince - a.hoursSince),
    byTherapist: Object.entries(per).filter(([, v]) => v.total > 0).map(([id, v]) => ({ id, ...v, rate: Math.round((v.onTime / v.total) * 100) })).sort((a, b) => a.rate - b.rate),
  };
}
