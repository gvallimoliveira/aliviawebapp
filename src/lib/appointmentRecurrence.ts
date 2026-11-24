// Pure recurrence expansion for agenda appointments. Dates are calendar
// strings (yyyy-MM-dd) handled without timezone conversion.

export type RecurrenceFreq = "none" | "daily" | "weekly" | "weekdays" | "biweekly" | "monthly" | "yearly";

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** Weekdays 0=Sun..6=Sat, used by "weekdays". */
  days?: number[];
  /** Ends after N occurrences (including the first). */
  count?: number;
  /** Or ends on this date (inclusive). */
  until?: string;
}

export const MAX_OCCURRENCES = 60;
export const MAX_MONTHS = 6;

const pad = (n: number) => String(n).padStart(2, "0");
const toStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return { y, m: m - 1, d }; };
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
const addDays = (s: string, n: number) => {
  const { y, m, d } = parse(s);
  const t = new Date(Date.UTC(y, m, d + n));
  return toStr(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
};
const weekday = (s: string) => { const { y, m, d } = parse(s); return new Date(Date.UTC(y, m, d)).getUTCDay(); };
const addMonthsClamped = (s: string, n: number, anchorDay: number) => {
  const { y, m } = parse(s);
  const total = m + n;
  const ny = y + Math.floor(total / 12);
  const nm = ((total % 12) + 12) % 12;
  return toStr(ny, nm, Math.min(anchorDay, daysInMonth(ny, nm)));
};

/** Returns every occurrence date, starting with `start`. */
export function expandRecurrence(start: string, rule: RecurrenceRule): string[] {
  if (!rule || rule.freq === "none") return [start];
  const hardLimit = addMonthsClamped(start, MAX_MONTHS, parse(start).d);
  const until = rule.until && rule.until < hardLimit ? rule.until : hardLimit;
  const count = Math.min(Math.max(1, rule.count ?? MAX_OCCURRENCES), MAX_OCCURRENCES);
  const out: string[] = [];
  const push = (d: string) => { if (d >= start && d <= until && out.length < count) out.push(d); };

  if (rule.freq === "monthly" || rule.freq === "yearly") {
    const anchor = parse(start).d;
    const step = rule.freq === "monthly" ? 1 : 12;
    for (let i = 0; out.length < count; i++) {
      const d = addMonthsClamped(start, i * step, anchor);
      if (d > until) break;
      push(d);
    }
    return out;
  }
  if (rule.freq === "weekdays") {
    const days = rule.days && rule.days.length ? rule.days : [weekday(start)];
    for (let d = start; d <= until && out.length < count; d = addDays(d, 1)) {
      if (d === start || days.includes(weekday(d))) push(d);
    }
    return out;
  }
  const step = rule.freq === "daily" ? 1 : rule.freq === "weekly" ? 7 : 14;
  for (let d = start; d <= until && out.length < count; d = addDays(d, step)) push(d);
  return out;
}

export interface RecurrenceSlot {
  time: string;
  professional_id?: string | null;
  patient_name?: string | null;
  patient_email?: string | null;
}
export interface SlotOccupant {
  appointment_date: string;
  appointment_time: string | null;
  professional_id?: string | null;
  patient_name?: string | null;
  patient_email?: string | null;
}

const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
/** Same person: e-mails decide when both exist; otherwise the exact (normalized) name. */
const samePatient = (a: RecurrenceSlot, b: SlotOccupant) => {
  const ea = norm(a.patient_email), eb = norm(b.patient_email);
  if (ea && eb) return ea === eb;
  const na = norm(a.patient_name);
  return !!na && na === norm(b.patient_name);
};

/**
 * Plans a series over slots that may already hold other appointments.
 * Simultaneous appointments are allowed (groups, parallel care), so a busy
 * slot never drops a date. Only a true duplicate is skipped: the same patient,
 * with the same professional, already booked at that date and time.
 * `shared` lists created dates that sit beside another appointment of the
 * same professional (informational only).
 */
export function planRecurrenceDates(dates: string[], slot: RecurrenceSlot, taken: SlotOccupant[]) {
  const hhmm = slot.time.slice(0, 5);
  const pro = slot.professional_id ?? null;
  const duplicate = new Set<string>();
  const busy = new Set<string>();
  for (const a of taken) {
    if ((a.appointment_time || "").slice(0, 5) !== hhmm) continue;
    if ((a.professional_id ?? null) !== pro) continue;
    if (samePatient(slot, a)) duplicate.add(a.appointment_date);
    else busy.add(a.appointment_date);
  }
  const free = dates.filter((d) => !duplicate.has(d));
  return {
    free,
    duplicates: dates.filter((d) => duplicate.has(d)),
    shared: free.filter((d) => busy.has(d)),
  };
}
