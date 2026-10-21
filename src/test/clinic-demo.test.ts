import { describe, expect, it } from "vitest";
import { clinicDemoTabs, scopeDemoRows, DEMO_THERAPIST_ID } from "@/lib/clinicDemoViews";
import { createDemoPeriodization, mergeDemoSession } from "@/data/demoPeriodization";
import { acwr } from "@/lib/periodization";

describe("clinic demo views", () => {
  const rows = [{ professional_id: "demo-pro-owner" }, { professional_id: DEMO_THERAPIST_ID }, { professional_id: null }];
  it("owner sees the entire fictional clinic", () => {
    expect(scopeDemoRows(rows, "owner")).toHaveLength(3);
    expect(clinicDemoTabs("owner")).toContain("clinic");
  });
  it("therapist sees assigned patients and schedule only", () => {
    expect(scopeDemoRows(rows, "therapist")).toEqual([{ professional_id: DEMO_THERAPIST_ID }]);
    expect(clinicDemoTabs("therapist")).toEqual(["agenda", "patients", "agente"]);
  });
  it("secretary gets reception without clinical records or management", () => {
    expect(clinicDemoTabs("secretary")).toEqual(["agenda", "reception"]);
  });
});

describe("fictional load data", () => {
  const demo = createDemoPeriodization("2026-10-21", "maria");
  it("has sufficient recorded history for ACWR, no future completed sessions", () => {
    expect(acwr(demo.entries, new Date("2026-10-21T12:00:00Z"))).toBeGreaterThan(0);
    expect(demo.entries.every(e => e.session_date < "2026-10-21")).toBe(true);
    expect(demo.sessions.some(s => s.session_date > "2026-10-21")).toBe(true);
    expect(demo.checkins.filter(c => c.checkin_date >= "2026-10-15")).toHaveLength(7);
  });
  it("local monitored entry merges same date and track instead of doubling load", () => {
    const original = demo.entries[0];
    const changed = { ...original, id: "new-id", duration_min: 50, rpe: 5, training_load: 250 };
    const result = mergeDemoSession(demo.entries, changed);
    expect(result).toHaveLength(demo.entries.length);
    expect(result.find(e => e.id === original.id)?.training_load).toBe(250);
    expect(original.training_load).not.toBe(250);
  });
});