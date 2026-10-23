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

/** Splits occurrences into free dates and dates whose slot is already taken. */
export function splitConflicts(
  dates: string[], time: string,
  taken: { appointment_date: string; appointment_time: string | null }[],
) {
  const hhmm = time.slice(0, 5);
  const busy = new Set(taken.filter((a) => (a.appointment_time || "").slice(0, 5) === hhmm).map((a) => a.appointment_date));
  return { free: dates.filter((d) => !busy.has(d)), conflicts: dates.filter((d) => busy.has(d)) };
}
