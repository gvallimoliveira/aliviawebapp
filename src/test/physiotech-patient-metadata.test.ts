// @vitest-environment node
import { describe, expect, it } from "vitest";
import { optionalPatientEmail } from "../../supabase/functions/physiotech-sso/patientMetadata";

describe("PhysioTech optional patient email", () => {
  it("omits synthetic patient identifiers rather than sending an invalid email", () => {
    expect(optionalPatientEmail("patient:e41b0bf4-ed46-4118-917d-ff9aef2b8f5c")).toBeNull();
  });
  it("omits missing, malformed and placeholder contacts", () => {
    for (const value of [null, undefined, "", " ", "sem-email", "teste@", "a..b@example.com", "patient@local", 123]) {
      expect(optionalPatientEmail(value)).toBeNull();
    }
  });
  it("retains real contacts and trims only surrounding whitespace", () => {
    expect(optionalPatientEmail("  Patient+test@Example.com  ")).toBe("Patient+test@Example.com");
  });
});