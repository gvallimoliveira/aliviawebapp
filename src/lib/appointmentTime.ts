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

/** Minimum on-grid card height (px) so short appointments stay readable. */
export const MIN_CARD_HEIGHT_PX = 46;
export const MIN_CONCURRENT_CARD_HEIGHT_PX = 32;

/** Card height in px for the schedule grid; never below the readability minimum. */
export function cardPixelHeight(durationMinutes: number, hourPx: number, concurrent: boolean): number {
  const dur = Math.max(15, durationMinutes || 50);
  const natural = (dur / 60) * hourPx - 2;
  return Math.max(concurrent ? MIN_CONCURRENT_CARD_HEIGHT_PX : MIN_CARD_HEIGHT_PX, natural);
}

/** From this many appointments starting in the same hour, the slot grows and uses a 2-column grid. */
export const CROWDED_SLOT_THRESHOLD = 3;
export const CROWDED_ROW_PX = 52;

/** Height of an hour row: grows only when some day has a crowded slot (2 cards per line). */
export function slotRowHeight(maxCountInSlot: number, hourPx: number): number {
  if (maxCountInSlot < CROWDED_SLOT_THRESHOLD) return hourPx;
  return Math.max(hourPx, Math.ceil(maxCountInSlot / 2) * CROWDED_ROW_PX);
}

/** Grid position (2 columns) for the index-th appointment of a crowded slot, or null when not crowded. */
export function crowdedSlotPosition(index: number, count: number): { col: number; row: number; top: number; height: number } | null {
  if (count < CROWDED_SLOT_THRESHOLD) return null;
  const row = Math.floor(index / 2);
  return { col: index % 2, row, top: row * CROWDED_ROW_PX + 1, height: CROWDED_ROW_PX - 3 };
}

/** Custom catalog services (e.g. "Recovery") use this agenda type and filter by their own catalog ID. */
export const CUSTOM_SERVICE_TYPE = "personalizado";

/** Agenda filter key for an appointment: custom services by catalog ID, others by type (legacy default physio). */
export function serviceFilterKey(apt: { service_type?: string | null; service_id?: string | null }): string {
  if (apt.service_type === CUSTOM_SERVICE_TYPE && apt.service_id) return `svc:${apt.service_id}`;
  return apt.service_type || "fisioterapia";
}
