/** Pure overlap detection for the appointment-request approval warning. Never blocks. */
export interface AgendaSlot {
  id?: string;
  appointment_time: string | null;
  duration_minutes: number | null;
  patient_name?: string | null;
  service_type?: string | null;
  status?: string | null;
}

export interface SlotOverlap { slot: AgendaSlot; start: number; end: number; overlapMin: number; }

const IGNORED = new Set(["cancelled", "canceled", "no_show", "no_show_justified"]);
export const DEFAULT_SLOT_MIN = 50;

export const toMinutes = (t: string | null | undefined): number | null => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const fmtMinutes = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

export function findOverlaps(startTime: string, durationMin: number, slots: AgendaSlot[]): SlotOverlap[] {
  const s = toMinutes(startTime);
  if (s === null) return [];
  const e = s + (durationMin > 0 ? durationMin : DEFAULT_SLOT_MIN);
  const out: SlotOverlap[] = [];
  for (const slot of slots) {
    if (slot.status && IGNORED.has(slot.status)) continue;
    const a = toMinutes(slot.appointment_time);
    if (a === null) continue;
    const b = a + (slot.duration_minutes && slot.duration_minutes > 0 ? slot.duration_minutes : DEFAULT_SLOT_MIN);
    const overlap = Math.min(e, b) - Math.max(s, a);
    if (overlap > 0) out.push({ slot, start: a, end: b, overlapMin: overlap });
  }
  return out.sort((x, y) => x.start - y.start);
}
