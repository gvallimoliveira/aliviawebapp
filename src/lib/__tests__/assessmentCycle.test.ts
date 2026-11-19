import { describe, it, expect } from "vitest";
import { cycleAssessments, cycleWindow, inWindow } from "../assessmentCycle";
const A = [
  { id: "neck1", created_at: "2026-08-21T10:00:00Z", pain_regions: ["neck"] },
  { id: "neck2", created_at: "2026-09-10T10:00:00Z", pain_regions: ["neck", "head"] },
  { id: "ankle", created_at: "2026-11-19T10:00:00Z", pain_regions: ["foot_left"] },
];
describe("gaveta do ciclo", () => {
  it("avaliação atual de tornozelo não mostra cervical", () => {
    expect(cycleAssessments(A, A[2]).map((a) => a.id)).toEqual(["ankle"]);
  });
  it("ciclo cervical reúne as avaliações da mesma região", () => {
    expect(cycleAssessments(A, A[0]).map((a) => a.id)).toEqual(["neck1", "neck2"]);
  });
  it("janela do ciclo cervical termina quando começa o tornozelo", () => {
    const w = cycleWindow(A, A[1]);
    expect(w).toEqual({ start: "2026-08-21", end: "2026-11-19" });
    expect(inWindow("2026-11-19", w)).toBe(false);
    expect(inWindow("2026-10-01", w)).toBe(true);
  });
  it("ciclo atual fica aberto até hoje", () => {
    expect(cycleWindow(A, A[2])).toEqual({ start: "2026-11-19", end: null });
  });
});
