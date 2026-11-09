// Edge-safe mirror of src/lib/periodization.ts. Parity is covered by tests.
export interface LoadEntry {
  id: string;
  session_date: string;
  duration_min: number;
  rpe: number;
  notes: string | null;
}

const DAY_MS = 86400000;
const toDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00Z`);
const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / DAY_MS);

export function brazilRefDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function trainingLoad(durationMin: number, rpe: number): number {
  if (!Number.isFinite(durationMin) || !Number.isFinite(rpe)) return 0;
  return Math.max(0, Math.round(durationMin * rpe));
}

function loadInWindow(entries: LoadEntry[], days: number, ref: string): number {
  const end = toDate(ref);
  return entries.reduce((sum, e) => {
    const diff = daysBetween(toDate(e.session_date), end);
    if (diff < 0 || diff >= days) return sum;
    return sum + trainingLoad(e.duration_min, e.rpe);
  }, 0);
}

export function acuteLoad(entries: LoadEntry[], ref: string): number {
  return loadInWindow(entries, 7, ref);
}

export function chronicLoad(entries: LoadEntry[], ref: string): number {
  return Math.round(loadInWindow(entries, 28, ref) / 4);
}

export function acwr(entries: LoadEntry[], ref: string): number | null {
  const chronic = chronicLoad(entries, ref);
  if (chronic <= 0) return null;
  const end = toDate(ref);
  const inWindow = entries.filter((e) => {
    const diff = daysBetween(toDate(e.session_date), end);
    return diff >= 0 && diff < 28 && trainingLoad(e.duration_min, e.rpe) > 0;
  });
  if (inWindow.length < 4) return null;
  const oldest = Math.max(...inWindow.map((e) => daysBetween(toDate(e.session_date), end)));
  if (oldest < 14) return null;
  return Number((acuteLoad(entries, ref) / chronic).toFixed(2));
}

/** Best effort only: load failures must never break SSO or readiness refresh. */
export async function optionalPatientLoads(client: any, patientId: string, now: Date = new Date()) {
  try {
    const refDate = brazilRefDate(now);
    const start = new Date(toDate(refDate).getTime() - 34 * DAY_MS).toISOString().slice(0, 10);
    // Both professional entry and patient response already merge into the same
    // srpe_entries row. Do not group by day: different tracks are real sessions.
    const { data, error } = await client.from("srpe_entries")
      .select("id, session_date, duration_min, rpe, notes")
      .eq("patient_id", patientId).gte("session_date", start).lte("session_date", refDate)
      .order("session_date", { ascending: false }).order("id", { ascending: true }).limit(200)
      .abortSignal(AbortSignal.timeout(2000));
    if (error || !Array.isArray(data)) return {};
    const entries: LoadEntry[] = data;
    return {
      loads: entries.map((e) => ({
        sessionId: e.id, date: e.session_date, durationMin: e.duration_min, rpe: e.rpe, note: e.notes,
      })),
      loadSummary: {
        refDate, acute: acuteLoad(entries, refDate), chronic: chronicLoad(entries, refDate), acwr: acwr(entries, refDate),
      },
    };
  } catch {
    return {};
  }
}