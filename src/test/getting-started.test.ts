import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { gettingStartedDestination, gettingStartedKey, gettingStartedSteps, readGettingStartedPreferences, restoreGettingStarted, writeGettingStartedPreferences,
  clinicIdentityReady, agendaGuidanceState, type GettingStartedFacts } from "@/lib/gettingStarted";
import { renderHook, act, cleanup } from "@testing-library/react";
import { useOnboarding } from "@/hooks/useOnboarding";

const empty: GettingStartedFacts = { patients: 0, assessments: 0, notes: 0, heps: 0, loads: 0, conversations: 0, appointments: 0 };
const steps = (facts = empty) => gettingStartedSteps(facts, false, true, true, true);
const completed = (facts: GettingStartedFacts) => steps(facts).filter((step) => step.complete === true).map((step) => step.id);
beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("first steps persisted milestones", () => {
  it("offers four clinical milestones without load in the initial checklist", () => {
    expect(steps().map((step) => step.id)).toEqual(["link", "patient", "record", "hep"]);
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
  it("a recorded load session does not change initial checklist progress", () => {
    expect(completed({ ...empty, loads: 1 })).toEqual([]);
  });
  it("Agent replies do not change initial checklist progress", () => {
    expect(completed({ ...empty, conversations: 1 })).toEqual([]);
    expect(gettingStartedSteps(empty, false, true, true, false)).toEqual(steps());
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

describe("clinic operational activation", () => {
  const managerSteps = (facts: GettingStartedFacts) => gettingStartedSteps(facts, false, true, true, true, true);
  it("replaces clinical tasks with five operational tasks for owner/admin", () => {
    expect(managerSteps(empty).map((step) => step.id)).toEqual(["identity", "team", "services", "link", "appointment"]);
    expect(managerSteps({ ...empty, notes: 4, heps: 2, loads: 8 }).filter((step) => step.complete).map((step) => step.id)).toEqual([]);
  });
  it("uses persisted operational facts for completion", () => {
    expect(managerSteps({ ...empty, identity: true, team: 1, services: 1, appointments: 1 }).filter((step) => step.complete).map((step) => step.id)).toEqual(["identity", "team", "services", "appointment"]);
    expect(managerSteps({ ...empty, identity: false, team: 0, services: null }).slice(0, 3).map((step) => step.complete)).toEqual([false, false, null]);
  });
  it("requires saved clinic name, logo, phone and opening/closing times for identity", () => {
    const clinic = { name: "Clinic", logo_url: "logo", phone: "123", operating_hours_start: "08:00", operating_hours_end: "18:00" };
    expect(clinicIdentityReady(clinic)).toBe(true);
    for (const field of Object.keys(clinic)) expect(clinicIdentityReady({ ...clinic, [field]: "" })).toBe(false);
    expect(clinicIdentityReady(null)).toBe(false);
  });
  it("routes operations to existing clinic and Insights screens with explicit clinic context", () => {
    for (const [action, tab] of [["identity", "clinic"], ["team", "clinic"], ["services", "insights"], ["appointment", "agenda"]] as const) {
      const path = new URL(gettingStartedDestination("clinic-a", action), "https://example.test");
      expect(path.searchParams.get("tab")).toBe(tab);
      expect(path.searchParams.get("clinicId")).toBe("clinic-a");
      expect(path.searchParams.get("context")).toBe("clinic");
      expect(path.searchParams.get("gettingStarted")).toBe(action);
    }
  });
});

describe("contextual Agenda guidance", () => {
  const state = (appointments: { status: string; service_type?: string | null }[], loading = false, error = false, canSchedule = true, clinical = true, dismissed = false, demo = false) => agendaGuidanceState(appointments, loading, error, canSchedule, clinical, dismissed, demo);
  it("offers an empty-period shortcut only when permitted, excluding commitments and cancelled care", () => {
    expect(state([{ status: "scheduled", service_type: "compromisso" }, { status: "cancelled", service_type: "fisioterapia" }]).empty).toBe(true);
    expect(state([{ status: "scheduled", service_type: null }]).empty).toBe(false);
    expect(state([], false, false, false).empty).toBe(false);
  });
  it("never interprets loading, errors or demo as an empty real schedule", () => {
    expect(state([], true).empty).toBe(false);
    expect(state([], false, true).empty).toBe(false);
    expect(state([], false, false, true, true, false, true)).toEqual({ empty: false, tip: false });
  });
  it("shows the clinical tip independently of scheduling rights but never for reception or after dismissal", () => {
    expect(state([], false, false, false).tip).toBe(true);
    expect(state([], false, false, true, false).tip).toBe(false);
    expect(state([], false, false, true, true, true).tip).toBe(false);
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