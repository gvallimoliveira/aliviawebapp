import { acuteLoad, acwr, chronicBaselineReady, chronicLoad, type ReadinessLike, type SrpeEntryLike } from "./periodization";
import { addDaysISO, inWindow, rollingDailySeries } from "./loadWindows";

export interface LoadRecoveryPoint {
  date: string;
  load: number | null;
  /** Composição da carga do dia por frente; null quando não há sessão registrada. */
  tracks: { physio: number; gym: number; cardio: number; sport: number } | null;
  psr: number | null;
  psrBaseline: number | null;
  acute: number;
  previousWeek: number | null;
  chronic: number | null;
  ratio: number | null;
  pattern: "low_recovery_high_load" | "high_recovery_low_load" | null;
}

const validPsr = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 10;

/** PSR is the single reported item, never the composite readiness score.
 * Missing sessions/responses remain unknown. Interpretations are descriptive,
 * relative to the patient's own prior seven days, not clinical cut-offs.
 */
export function loadRecoverySeries(
  entries: SrpeEntryLike[], checkins: ReadinessLike[], from: string, to: string,
): LoadRecoveryPoint[] {
  const psrByDate = new Map<string, number>();
  for (const checkin of checkins) {
    if (validPsr(checkin.readiness)) psrByDate.set(checkin.checkin_date.slice(0, 10), checkin.readiness);
  }
  return rollingDailySeries(entries, from, to).map((day) => {
    const ref = new Date(`${day.date}T12:00:00`);
    const previousWindow = { from: addDaysISO(day.date, -7), to: addDaysISO(day.date, -1) };
    const previousPsr = [...psrByDate].filter(([date]) => inWindow(date, previousWindow)).map(([, value]) => value);
    const psrBaseline = previousPsr.length >= 3 ? previousPsr.reduce((a, b) => a + b, 0) / previousPsr.length : null;
    const psr = psrByDate.get(day.date) ?? null;
    const hasSession = entries.some((entry) => entry.session_date.slice(0, 10) === day.date);
    const acute = acuteLoad(entries, ref);
    const previousRef = new Date(`${addDaysISO(day.date, -7)}T12:00:00`);
    const previousWeekWindow = { from: addDaysISO(day.date, -13), to: addDaysISO(day.date, -7) };
    const previousWeek = entries.some((entry) => inWindow(entry.session_date, previousWeekWindow)) ? acuteLoad(entries, previousRef) : null;
    const chronic = chronicBaselineReady(entries, ref) ? chronicLoad(entries, ref) : null;
    const ratio = acwr(entries, ref);
    const highLoad = (previousWeek !== null && previousWeek > 0 && acute > previousWeek * 1.1) || (ratio !== null && ratio > 1.3);
    const lowLoad = (previousWeek !== null && previousWeek > 0 && acute < previousWeek * 0.9) || (ratio !== null && ratio < 0.8);
    let pattern: LoadRecoveryPoint["pattern"] = null;
    if (hasSession && psr !== null && psrBaseline !== null) {
      if (psr <= psrBaseline - 2 && highLoad) pattern = "low_recovery_high_load";
      else if (psr >= psrBaseline + 2 && lowLoad) pattern = "high_recovery_low_load";
    }
    return { date: day.date, load: hasSession ? day.total : null, tracks: hasSession ? { physio: day.physio, gym: day.gym, cardio: day.cardio, sport: day.sport } : null, psr, psrBaseline, acute, previousWeek, chronic, ratio, pattern };
  });
}