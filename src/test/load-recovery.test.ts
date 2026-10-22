import { describe, expect, it } from "vitest";
import { loadRecoverySeries } from "@/lib/loadRecovery";
import { addDaysISO } from "@/lib/loadWindows";

describe("load × PSR", () => {
  const date = "2026-10-13";
  it("sums tracks on the same date and uses raw PSR, not composite readiness", () => {
    const [point] = loadRecoverySeries([
      { session_date: date, duration_min: 40, rpe: 5, track: "gym" },
      { session_date: date, duration_min: 20, rpe: 3, track: "physio" },
    ], [{ checkin_date: date, readiness: 7, fatigue: 10, sleep: 1 }], date, date);
    expect(point.load).toBe(260);
    expect(point.psr).toBe(7);
  });
  it("keeps unanswered PSR and unrecorded load null; fills the seven calendar days", () => {
    const points = loadRecoverySeries([], [{ checkin_date: date, sleep: 8 }], addDaysISO(date, -6), date);
    expect(points).toHaveLength(7);
    expect(points.every((point) => point.load === null && point.psr === null)).toBe(true);
  });
  it("ignores future data and does not calculate chronic comparison with sparse history", () => {
    const [point] = loadRecoverySeries([{ session_date: addDaysISO(date, 1), duration_min: 60, rpe: 10 }], [{ checkin_date: date, readiness: 5 }], date, date);
    expect(point.acute).toBe(0);
    expect(point.chronic).toBeNull();
    expect(point.pattern).toBeNull();
  });
  it.each([
    [3, 8, 300, 50, "low_recovery_high_load"],
    [9, 5, 30, 300, "high_recovery_low_load"],
  ] as const)("detects descriptive inverse pattern %s", (psr, baseline, load, previous, pattern) => {
    const entries = Array.from({ length: 28 }, (_, i) => ({ session_date: addDaysISO(date, -i), duration_min: i < 7 ? load : previous, rpe: 1 }));
    const checkins = [{ checkin_date: date, readiness: psr }, ...[1, 2, 3].map((i) => ({ checkin_date: addDaysISO(date, -i), readiness: baseline }))];
    const [point] = loadRecoverySeries(entries, checkins, date, date);
    expect(point.pattern).toBe(pattern);
    expect(point.chronic).not.toBeNull();
  });
  it("requires three prior PSR responses and never infers low load from no session", () => {
    const entries = [{ session_date: addDaysISO(date, -8), duration_min: 500, rpe: 1 }];
    const checkins = [{ checkin_date: date, readiness: 10 }, ...[1, 2, 3].map((i) => ({ checkin_date: addDaysISO(date, -i), readiness: 3 }))];
    expect(loadRecoverySeries(entries, checkins, date, date)[0].pattern).toBeNull();
    expect(loadRecoverySeries(entries, checkins.slice(0, 3), date, date)[0].psrBaseline).toBeNull();
  });
});
describe("daily load composition by track", () => {
  const date = "2026-10-22";
  it("breaks the day bar down by track and keeps null without a session", () => {
    const entries = [
      { session_date: date, duration_min: 30, rpe: 5, track: "physio" },
      { session_date: date, duration_min: 40, rpe: 6, track: "gym" },
      { session_date: date, duration_min: 20, rpe: 4, track: "cardio" },
    ];
    const [point] = loadRecoverySeries(entries, [], date, date);
    expect(point.tracks).toEqual({ physio: 150, gym: 240, cardio: 80, sport: 0 });
    expect(point.load).toBe(470);
    const [empty] = loadRecoverySeries([], [], date, date);
    expect(empty.tracks).toBeNull();
  });
});
