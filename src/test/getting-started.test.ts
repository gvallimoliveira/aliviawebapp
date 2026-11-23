import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gettingStartedDestination, gettingStartedKey, gettingStartedSteps, readGettingStartedPreferences, restoreGettingStarted, writeGettingStartedPreferences,
  type GettingStartedFacts } from "@/lib/gettingStarted";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useOnboarding } from "@/hooks/useOnboarding";

const empty: GettingStartedFacts = { patients: 0, assessments: 0, notes: 0, heps: 0, loads: 0, conversations: 0, appointments: 0 };
const steps = (facts = empty) => gettingStartedSteps(facts, false, true, true, true);
const completed = (facts: GettingStartedFacts) => steps(facts).filter((step) => step.complete === true).map((step) => step.id);
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("first steps persisted milestones", () => {
  it("offers five clinical milestones with none completed for an empty account", () => {
    expect(steps().map((step) => step.id)).toEqual(["link", "patient", "record", "hep", "followup"]);
    expect(completed(empty)).toEqual([]);
  });
  it("copying the link completes only that step, not patient registration or care", () => {
    expect(gettingStartedSteps(empty, true, true, true, true).filter((step) => step.complete).map((step) => step.id)).toEqual(["link"]);
  });
  it("a persisted patient completes registration but not the clinical record", () => {
    expect(completed({ ...empty, patients: 1 })).toEqual(["patient"]);
  });
  it("a saved evolution completes the visit without needing a new assessment", () => {
    expect(completed({ ...empty, notes: 1 })).toEqual(["record"]);
  });
  it("a completed assessment also establishes link and patient milestones", () => {
    expect(completed({ ...empty, assessments: 1 })).toEqual(["link", "patient", "record"]);
  });
  it("a saved HEP with items completes only the exercise milestone", () => {
    expect(completed({ ...empty, heps: 1 })).toEqual(["hep"]);
  });
  it("a recorded load session completes experimentation", () => {
    expect(completed({ ...empty, loads: 1 })).toEqual(["followup"]);
  });
  it("a replied Agent conversation is the alternative to a load session", () => {
    expect(completed({ ...empty, conversations: 1 })).toEqual(["followup"]);
    expect(gettingStartedSteps({ ...empty, conversations: 1 }, false, true, true, false).find((step) => step.id === "followup")?.complete).toBe(false);
  });
  it("failed queries remain unknown rather than reporting zero or completing a step", () => {
    expect(steps({ ...empty, heps: null }).find((step) => step.id === "hep")?.complete).toBeNull();
    expect(steps({ ...empty, notes: null, assessments: 1 }).find((step) => step.id === "record")?.complete).toBe(true);
  });
  it("reception gets only link, patient and agenda, never clinical prescriptions", () => {
    expect(gettingStartedSteps(empty, false, false, true, true).map((step) => step.id)).toEqual(["link", "patient", "appointment"]);
    expect(gettingStartedSteps({ ...empty, appointments: 1 }, false, false, true, true).find((step) => step.id === "appointment")?.complete).toBe(true);
  });
  it("read-only staff do not get a scheduling action", () => {
    expect(gettingStartedSteps(empty, false, false, false, true).map((step) => step.id)).toEqual(["link", "patient"]);
  });
});

describe("first steps account and scope isolation", () => {
  const solo = { userId: "user-a", professionalId: "pro-a" };
  const clinic = { ...solo, clinicId: "clinic-a" };
  it("uses different storage keys for solo, each clinic and each user", () => {
    expect(new Set([gettingStartedKey(solo), gettingStartedKey(clinic), gettingStartedKey({ ...clinic, clinicId: "clinic-b" }), gettingStartedKey({ ...clinic, userId: "user-b" })]).size).toBe(4);
  });
  it("dismissal persists only for the selected account and practice", () => {
    writeGettingStartedPreferences(gettingStartedKey(clinic), { dismissed: true });
    expect(readGettingStartedPreferences(gettingStartedKey(clinic)).dismissed).toBe(true);
    expect(readGettingStartedPreferences(gettingStartedKey(solo)).dismissed).toBe(false);
    expect(readGettingStartedPreferences(gettingStartedKey({ ...clinic, userId: "user-b" })).dismissed).toBe(false);
  });
  it("review preserves progress and leaves authentication storage untouched", () => {
    localStorage.setItem("sb-test-auth-token", "unchanged");
    writeGettingStartedPreferences(gettingStartedKey(clinic), { copiedLink: true, dismissed: true });
    restoreGettingStarted(clinic);
    expect(readGettingStartedPreferences(gettingStartedKey(clinic))).toEqual({ copiedLink: true, dismissed: false, review: true });
    expect(localStorage.getItem("sb-test-auth-token")).toBe("unchanged");
  });
  it("shortcuts preserve patient context and route to existing scoped record tools", () => {
    const clinicPath = new URL(gettingStartedDestination("clinic-a", "hep", "Ana sem e-mail"), "https://example.test");
    expect(clinicPath.searchParams.get("tab")).toBe("patients");
    expect(clinicPath.searchParams.get("patient")).toBe("Ana sem e-mail");
    expect(clinicPath.searchParams.get("gettingStarted")).toBe("hep");
    expect(new URL(gettingStartedDestination(null, "load", "ana@example.test"), "https://example.test").searchParams.get("tab")).toBe("professional");
    expect(new URL(gettingStartedDestination("clinic-a", "appointment"), "https://example.test").searchParams.get("tab")).toBe("agenda");
  });
  for (const clinicId of [null, "clinic-a"]) {
    it(`keeps visit and manual assessment as separate shortcuts in ${clinicId ? "clinic" : "solo"} scope`, () => {
      const visit = new URL(gettingStartedDestination(clinicId, "record", "Ana sem e-mail"), "https://example.test");
      const manual = new URL(gettingStartedDestination(clinicId, "manual-assessment", "Ana sem e-mail"), "https://example.test");
      expect(visit.searchParams.get("gettingStarted")).toBe("record");
      expect(manual.searchParams.get("gettingStarted")).toBe("manual-assessment");
      expect(manual.searchParams.get("patient")).toBe("Ana sem e-mail");
      expect(manual.searchParams.get("tab")).toBe(clinicId ? "patients" : "professional");
      expect(visit.searchParams.get("patient")).toBe(manual.searchParams.get("patient"));
    });
  }
  it("keeps the old automatic tour inactive, including after restart", () => {
    const { result } = renderHook(() => useOnboarding("onboarding_professional_completed_v2", [{ targetId: "patients", titleKey: "title", descriptionKey: "desc" }]));
    expect(result.current.isActive).toBe(false);
    act(() => result.current.restart());
    expect(result.current.currentStep).toBe(-1);
    expect(result.current.isActive).toBe(false);
  });
});