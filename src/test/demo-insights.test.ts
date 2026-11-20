import { describe, expect, it } from "vitest";
import { createDemoInsights } from "@/data/demoInsights";
import { createDemoPeriodization } from "@/data/demoPeriodization";
import { pairSessionsWithSrpe } from "@/lib/periodization";
import { DEMO_STEPS } from "@/data/demoSteps";

describe("demo STEPS and weekly planning", () => {
  it("has five clinical phases and terminal sixth step without a discharge cycle", () => {
    expect(DEMO_STEPS).toHaveLength(6);
    const demo = createDemoPeriodization("2026-11-20", "Roberto Tavares");
    expect(demo.cycles.map(c => c.sort_order)).toEqual([0, 1, 2, 3, 4]);
    expect(demo.cycles.find(c => c.is_current)?.sort_order).toBe(4);
    const discharged = createDemoPeriodization("2026-11-20", "Maria Silva");
    expect(discharged.plan.status).toBe("completed");
    expect(discharged.cycles.some(c => c.is_current)).toBe(false);
  });
  it("fills the current and next week with activities or zero-load recovery, never future realized load", () => {
    const demo = createDemoPeriodization("2026-11-20", "Maria Silva");
    for (const date of ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29"]) {
      expect(demo.sessions.some(s => s.session_date === date)).toBe(true);
    }
    expect(demo.sessions.filter(s => s.planned_duration_min === 0).every(s => s.planned_target_load === 0)).toBe(true);
    expect(demo.entries.every(e => e.session_date < "2026-11-20" && e.training_load > 0)).toBe(true);
    expect(demo.entries.some(e => e.session_date < "2026-10-07")).toBe(true);
  });
});

describe("demo insights use their patient data", () => {
  it("includes latest patients and discharge, matching record phases", () => {
    const insights = createDemoInsights("2026-11-20");
    expect(insights.patients).toHaveLength(7);
    expect(insights.patients.filter(p => p.completed)).toHaveLength(3);
    expect(insights.patients.find(p => p.name === "Roberto Tavares")?.phase).toBe(DEMO_STEPS[4].name);
    expect(insights.patients.find(p => p.name === "Carlos Mendes")?.load.acwr).toBeNull();
  });
  it("does not classify unanswered or recovery sessions as underdose", () => {
    const fixture = createDemoPeriodization("2026-11-20", "Maria Silva");
    const pairs = pairSessionsWithSrpe(fixture.sessions, fixture.entries).filter(p => p.session.session_date >= "2026-11-07" && p.session.session_date <= "2026-11-20" && p.plannedLoad > 0);
    const patient = createDemoInsights("2026-11-20").patients.find(p => p.name === "Maria Silva");
    expect(patient?.under).toBe(pairs.filter(p => p.verdict === "under").length);
    expect(patient?.over).toBe(pairs.filter(p => p.verdict === "over").length);
    expect(patient?.missing).toBe(pairs.filter(p => p.ratio === null).length);
    expect((patient?.under ?? 0) + (patient?.over ?? 0)).toBeLessThanOrEqual(patient?.answered ?? 0);
  });
  it("reflects schedule classification and excludes personal commitments from money", () => {
    const appointment = { id: "slot", appointment_date: "2026-11-19", status: "completed", patient_name: "Example", professional_id: "demo-pro-owner" };
    expect(createDemoInsights("2026-11-20", [appointment]).revenue).toBe(150);
    expect(createDemoInsights("2026-11-20", [{ ...appointment, status: "no_show" }]).chair.lostValue).toBe(150);
    expect(createDemoInsights("2026-11-20", [{ ...appointment, service_type: "compromisso" }]).revenue).toBe(0);
    expect(createDemoInsights("2026-11-20", [{ ...appointment, status: "no_show", service_type: "compromisso" }]).chair.lostValue).toBe(0);
  });
});
