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
  const demo = createDemoPeriodization("2026-10-21", "Maria Silva");
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

describe("demo scenarios follow the latest assessment, never the same generic program", () => {
  const today = "2026-10-21";
  it.each([
    ["Maria Silva", "demo-001c", 1], ["João Santos", "demo-002b", 7],
    ["Ana Oliveira", "demo-003b", 4], ["Carlos Mendes", "demo-004b", 6],
    ["Roberto Tavares", "demo-005c", 1], ["Juliana Castro", "demo-006d", 0],
    ["Helena Rocha", "demo-007c", 1],
  ])("%s links the latest assessment and current pain", (name, id, pain) => {
    const scenario = createDemoPeriodization(today, String(name));
    expect(scenario.plan.assessment_id).toBe(id);
    expect(scenario.checkins.find(c => c.checkin_date === today)?.pain).toBe(pain);
    expect(scenario.cycles.filter(c => c.is_current)).toHaveLength(1);
    expect(scenario.cycles[0].start_date).toBe(today);
    expect(scenario.entries.every(e => e.session_date < today)).toBe(true);
  });
  it("Maria is in maintenance, not active generic strengthening", () => {
    const scenario = createDemoPeriodization(today, "Maria Silva");
    expect(scenario.cycles[0].name).toBe("Manutenção e prevenção secundária");
    expect(scenario.sessions.every(s => s.track === "home")).toBe(true);
  });
  it("João has historical overload but no future running prescription", () => {
    const scenario = createDemoPeriodization(today, "João Santos");
    expect(scenario.entries.some(e => e.track === "sport" && e.training_load === 560)).toBe(true);
    expect(scenario.sessions.filter(s => s.session_date >= today).every(s => s.track === "physio" && s.planned_rpe === 2)).toBe(true);
    expect(scenario.checkins.at(-1)?.readiness).toBe(4);
  });
  it("Carlos has no fabricated exercise history before today's medical investigation", () => {
    const scenario = createDemoPeriodization(today, "Carlos Mendes");
    expect(scenario.entries).toHaveLength(0);
    expect(scenario.sessions.every(s => s.session_date >= today)).toBe(true);
    expect(scenario.checkins).toHaveLength(1);
    expect(scenario.plan.notes).toContain("Cardiopatia parcialmente controlada");
  });
  it("Roberto remains in preparation, without full sports release", () => {
    const scenario = createDemoPeriodization(today, "Roberto Tavares");
    expect(scenario.cycles[0].name).toBe("Força específica e transição esportiva");
    expect(scenario.sessions.some(s => s.track === "sport")).toBe(false);
  });
  it("Juliana only starts fictional running after her latest RTS release", () => {
    const scenario = createDemoPeriodization(today, "Juliana Castro");
    expect(scenario.entries.filter(e => e.track === "sport").every(e => e.session_date >= "2026-10-18")).toBe(true);
    expect(scenario.sessions.some(s => s.track === "sport" && s.session_date > today)).toBe(true);
  });
  it("Helena has home maintenance without gym access or uncontrolled progression", () => {
    const scenario = createDemoPeriodization(today, "Helena Rocha");
    expect(scenario.sessions.every(s => s.track === "home" && s.planned_rpe === 2)).toBe(true);
    expect(scenario.plan.notes).toContain("Asma sem acompanhamento");
  });
  it("unknown or older assessment has no unreviewed generic load", () => {
    expect(createDemoPeriodization(today, "unknown").sessions).toHaveLength(0);
    expect(createDemoPeriodization(today, "Maria Silva", "demo-001").entries).toHaveLength(0);
  });
});