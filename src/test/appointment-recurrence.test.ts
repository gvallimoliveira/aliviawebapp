import { describe, it, expect } from "vitest";
import { expandRecurrence, splitConflicts } from "@/lib/appointmentRecurrence";

describe("appointment recurrence", () => {
  it("weekly for 10 sessions", () => {
    const d = expandRecurrence("2026-10-23", { freq: "weekly", count: 10 });
    expect(d.length).toBe(10);
    expect(d[1]).toBe("2026-10-30");
    expect(d[9]).toBe("2026-12-25");
  });
  it("chosen weekdays (mon + wed)", () => {
    expect(expandRecurrence("2026-10-26", { freq: "weekdays", days: [1, 3], count: 4 }))
      .toEqual(["2026-10-26", "2026-10-28", "2026-11-02", "2026-11-04"]);
  });
  it("biweekly", () => {
    expect(expandRecurrence("2026-10-23", { freq: "biweekly", count: 3 })).toEqual(["2026-10-23", "2026-11-06", "2026-11-20"]);
  });
  it("monthly on day 31 clamps to month end", () => {
    expect(expandRecurrence("2027-01-31", { freq: "monthly", count: 3 })).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
  });
  it("caps at 60 sessions", () => {
    expect(expandRecurrence("2026-10-23", { freq: "daily", count: 500 }).length).toBe(60);
  });
  it("ends on date inclusive", () => {
    expect(expandRecurrence("2026-10-23", { freq: "weekly", until: "2026-11-06" })).toEqual(["2026-10-23", "2026-10-30", "2026-11-06"]);
  });
  it("no repeat returns single date", () => {
    expect(expandRecurrence("2026-10-23", { freq: "none" })).toEqual(["2026-10-23"]);
  });
  it("detects taken slots", () => {
    const r = splitConflicts(["2026-10-23", "2026-10-30"], "09:00", [{ appointment_date: "2026-10-30", appointment_time: "09:00:00" }]);
    expect(r.conflicts).toEqual(["2026-10-30"]);
    expect(r.free).toEqual(["2026-10-23"]);
  });
});
