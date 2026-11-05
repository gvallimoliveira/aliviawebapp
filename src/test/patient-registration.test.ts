import { beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ calls: [] as Array<{ table: string; op: string; args: unknown[] }>, error: null as unknown }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: (table: string) => {
    const query: any = {};
    for (const op of ["update", "eq", "is", "select", "in", "insert"]) {
      query[op] = (...args: unknown[]) => { mock.calls.push({ table, op, args }); return query; };
    }
    query.single = async () => ({ data: mock.error ? null : { id: "original-lucas" }, error: mock.error });
    query.then = (resolve: (result: unknown) => void) => Promise.resolve({ error: null }).then(resolve);
    return query;
  } },
}));
import { updatePatientRegistration } from "@/lib/patientRegistration";

describe("patient registration editing", () => {
  beforeEach(() => { mock.calls = []; mock.error = null; });
  it("renames Lucas Kegela to Kegele on the original row and keeps his no-email assessment", async () => {
    const saved = await updatePatientRegistration(
      { id: "original-lucas", full_name: "Lucas kegela", email: null, assessmentIds: ["lucas-assessment"] },
      { full_name: "Lucas kegele", email: null }, "solo-pro",
    );
    expect(mock.calls).toContainEqual({ table: "patients", op: "eq", args: ["id", "original-lucas"] });
    expect(mock.calls).toContainEqual({ table: "assessments", op: "in", args: ["id", ["lucas-assessment"]] });
    expect(mock.calls).toContainEqual({ table: "assessments", op: "update", args: [{ patient_name: "Lucas kegele", patient_email: null }] });
    expect(mock.calls.some((c) => c.op === "insert")).toBe(false);
    expect(saved).toMatchObject({ patientId: "original-lucas", oldKey: "Lucas kegela", newKey: "Lucas kegele", assessmentIds: ["lucas-assessment"] });
    for (const table of ["patients", "assessments"]) {
      expect(mock.calls).toContainEqual({ table, op: "is", args: ["clinic_id", null] });
      expect(mock.calls).toContainEqual({ table, op: "eq", args: ["professional_id", "solo-pro"] });
    }
  });
  it("rejects an edit missing its original patient ID instead of inserting a replacement", async () => {
    await expect(updatePatientRegistration({ id: "", full_name: "Lucas kegela" }, { full_name: "Lucas kegele", email: null }, "solo-pro")).rejects.toThrow();
    expect(mock.calls).toHaveLength(0);
  });
  it("does not touch history after an inaccessible original row", async () => {
    mock.error = new Error("not found");
    await expect(updatePatientRegistration({ id: "original-lucas", full_name: "Lucas kegela", assessmentIds: ["a"] }, { full_name: "Lucas kegele", email: null }, "solo-pro")).rejects.toThrow("not found");
    expect(mock.calls.every((c) => c.table === "patients")).toBe(true);
  });
  it("keeps clinic changes scoped to the selected clinic without demanding solo ownership", async () => {
    await updatePatientRegistration({ id: "p", full_name: "Old", email: "old@example.test", assessmentIds: ["a"] }, { full_name: "New", email: "new@example.test" }, "pro", "clinic-a");
    for (const table of ["patients", "assessments", "professional_appointments"]) {
      expect(mock.calls).toContainEqual({ table, op: "eq", args: ["clinic_id", "clinic-a"] });
    }
    expect(mock.calls.some((c) => c.op === "eq" && c.args[0] === "professional_id")).toBe(false);
  });
});