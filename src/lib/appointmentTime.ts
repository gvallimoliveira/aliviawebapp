// Pure helpers for appointment start/end/duration and calendar layout.
export function toMinutes(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm ?? "");
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]);
  if (h > 23 || mi > 59) return null;
  return h * 60 + mi;
}

export function fromMinutes(total: number): string {
  const t = Math.max(0, Math.min(total, 23 * 60 + 59));
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/** End time "HH:MM" from start + duration (clamped to 23:59). */
export function endTimeFrom(start: string, durationMin: number): string {
  const s = toMinutes(start) ?? 0;
  return fromMinutes(s + Math.max(0, durationMin || 0));
}

/** Duration between two times; null when end is not after start (same day only). */
export function durationBetween(start: string, end: string): number | null {
  const s = toMinutes(start), e = toMinutes(end);
  if (s == null || e == null || e <= s) return null;
  return e - s;
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

export interface LaneItem { id: string; start: number; end: number }
/** Assigns side-by-side lanes to overlapping items. */
export function assignLanes(items: LaneItem[]): Map<string, { lane: number; lanes: number }> {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out = new Map<string, { lane: number; lanes: number }>();
  let cluster: { id: string; lane: number }[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    for (const c of cluster) out.set(c.id, { lane: c.lane, lanes: laneEnds.length });
    cluster = []; laneEnds = [];
  };
  for (const it of sorted) {
    const end = Math.max(it.end, it.start + 1);
    if (it.start >= clusterEnd) { flush(); clusterEnd = -1; }
    let lane = laneEnds.findIndex((e) => e <= it.start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); } else laneEnds[lane] = end;
    cluster.push({ id: it.id, lane });
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();
  return out;
}
