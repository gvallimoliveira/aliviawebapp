import { describe, it, expect } from "vitest";
import { dailyConduct } from "@/lib/dailyConduct";
const base = { sessions: [], ceiling: 150, maxHr: 180, today: "2026-10-07" };
describe("dailyConduct", () => {
  it("prioriza segurança quando FC passou do teto", () => {
    const r = dailyConduct({ ...base, entries: [{ session_date: "2026-10-06", duration_min: 40, rpe: 6, hr_max: 165 }], checkins: [] });
    expect(r.headline.tone).toBe("stop");
  });
  it("com só 1 check-in bom já orienta", () => {
    const r = dailyConduct({ ...base, entries: [], checkins: [{ checkin_date: "2026-10-07", readiness: 9, sleep: 8 }] });
    expect(r.headline.tone).toBe("go");
  });
  it("detecta nota subestimada", () => {
    const r = dailyConduct({ ...base, entries: [{ session_date: "2026-10-07", duration_min: 40, rpe: 3, hr_avg: 155 }], checkins: [{ checkin_date: "2026-10-07", readiness: 8 }] });
    expect([r.headline, ...r.others].some((i) => i.action.includes("subestimada"))).toBe(true);
  });
  it("sem check-in pede check-in", () => {
    const r = dailyConduct({ ...base, entries: [{ session_date: "2026-10-01", duration_min: 50, rpe: 5 }], checkins: [] });
    expect(r.headline.action).toMatch(/check-in/);
  });
});
