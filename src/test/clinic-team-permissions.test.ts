import { describe, it, expect } from "vitest";
import { canAssignClinicRole, canManageClinicMember } from "@/lib/clinicTeamPermissions";

describe("clinic team role permissions", () => {
  it("secretary cannot grant owner or admin", () => {
    expect(canAssignClinicRole("secretary", "admin")).toBe(false);
    expect(canAssignClinicRole("secretary", "owner")).toBe(false);
  });
  it("secretary can still assign clinical and secretary roles", () => {
    expect(canAssignClinicRole("secretary", "therapist")).toBe(true);
    expect(canAssignClinicRole("secretary", "pilates_instructor")).toBe(true);
    expect(canAssignClinicRole("secretary", "secretary")).toBe(true);
  });
  it("secretary can remove clinical members but not the owner or an admin", () => {
    expect(canManageClinicMember("secretary", "therapist")).toBe(true);
    expect(canManageClinicMember("secretary", "owner")).toBe(false);
    expect(canManageClinicMember("secretary", "admin")).toBe(false);
  });
  it("owner and admin keep full power", () => {
    for (const viewer of ["owner", "admin"]) {
      expect(canAssignClinicRole(viewer, "admin")).toBe(true);
      expect(canAssignClinicRole(viewer, "owner")).toBe(true);
      expect(canManageClinicMember(viewer, "admin")).toBe(true);
    }
  });
  it("clinical members manage no one", () => {
    expect(canAssignClinicRole("therapist", "therapist")).toBe(false);
    expect(canManageClinicMember("therapist", "intern")).toBe(false);
    expect(canAssignClinicRole(null, "therapist")).toBe(false);
  });
});
