import { describe, it, expect } from "vitest";
import { canViewClinicAppointment, agendaScopeSummary, normalizeAgendaScope, type AgendaAccess } from "@/lib/agendaVisibility";

const mine = ["pro-me"];
const osteo = { professional_id: "pro-other", service_type: "osteopatia" };
const pilates = { professional_id: "pro-other", service_type: "pilates" };
const physio = { professional_id: "pro-other", service_type: "fisioterapia" };
const access = (over: Partial<AgendaAccess>): AgendaAccess => ({ role: "osteopath", scope: "clinic", services: [], ...over });

describe("clinic agenda visibility per member", () => {
  it("own scope shows only the member's own appointments", () => {
    const a = access({ scope: "own" });
    expect(canViewClinicAppointment(a, { professional_id: "pro-me", service_type: "pilates" }, mine)).toBe(true);
    expect(canViewClinicAppointment(a, osteo, mine)).toBe(false);
  });
  it("osteopathy member does not see physiotherapy or pilates", () => {
    const a = access({ scope: "services", services: ["osteopatia"] });
    expect(canViewClinicAppointment(a, osteo, mine)).toBe(true);
    expect(canViewClinicAppointment(a, physio, mine)).toBe(false);
    expect(canViewClinicAppointment(a, pilates, mine)).toBe(false);
  });
  it("member with two functions sees both services and nothing else", () => {
    const a = access({ role: "therapist", scope: "services", services: ["pilates", "fisioterapia"] });
    expect(canViewClinicAppointment(a, pilates, mine)).toBe(true);
    expect(canViewClinicAppointment(a, physio, mine)).toBe(true);
    expect(canViewClinicAppointment(a, osteo, mine)).toBe(false);
  });
  it("custom catalog services match by catalog id; legacy type defaults to physiotherapy", () => {
    const a = access({ scope: "services", services: ["svc:abc", "fisioterapia"] });
    expect(canViewClinicAppointment(a, { professional_id: "x", service_type: "personalizado", service_id: "abc" }, mine)).toBe(true);
    expect(canViewClinicAppointment(a, { professional_id: "x", service_type: "personalizado", service_id: "zzz" }, mine)).toBe(false);
    expect(canViewClinicAppointment(a, { professional_id: "x", service_type: null }, mine)).toBe(true);
  });
  it("colleagues' personal commitments never show through a service grant", () => {
    const a = access({ scope: "services", services: ["compromisso", "pilates"] });
    expect(canViewClinicAppointment(a, { professional_id: "x", service_type: "compromisso" }, mine)).toBe(false);
    expect(canViewClinicAppointment(a, { professional_id: "pro-me", service_type: "compromisso" }, mine)).toBe(true);
  });
  it("owner, admin and secretary always see the whole clinic", () => {
    for (const role of ["owner", "admin", "secretary"]) {
      expect(canViewClinicAppointment(access({ role, scope: "own" }), osteo, mine)).toBe(true);
    }
  });
  it("whole-clinic scope and unknown stored values keep the full view", () => {
    expect(canViewClinicAppointment(access({ scope: "clinic" }), pilates, mine)).toBe(true);
    expect(normalizeAgendaScope(null)).toBe("clinic");
    expect(normalizeAgendaScope("own")).toBe("own");
  });
  it("services scope with no service behaves as own only", () => {
    expect(canViewClinicAppointment(access({ scope: "services" }), physio, mine)).toBe(false);
    expect(agendaScopeSummary("services", [], "pt", [])).toBe("Só a própria");
    expect(agendaScopeSummary("services", ["pilates", "fisioterapia", "rpg"], "pt", [])).toBe("Própria + Pilates, Fisioterapia +1");
  });
});
