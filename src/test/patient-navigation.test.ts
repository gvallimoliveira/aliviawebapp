import { describe, expect, it } from "vitest";
import { resolvePatientTab } from "@/lib/patientNavigation";

describe("patient navigation", () => {
  it("opens daily care for a linked patient", () => {
    expect(resolvePatientTab(null, true)).toBe("today");
  });
  it("preserves self-service health for an unlinked patient", () => {
    expect(resolvePatientTab("today", false)).toBe("health");
  });
  it("keeps existing assessment links in evolution", () => {
    expect(resolvePatientTab("health", true)).toBe("health");
  });
  it("redirects announcement links into messages", () => {
    expect(resolvePatientTab("notices", true)).toBe("messages");
  });
  it("preserves scheduling and conversations", () => {
    expect(resolvePatientTab("appointments", true)).toBe("appointments");
    expect(resolvePatientTab("messages", true)).toBe("messages");
  });
});