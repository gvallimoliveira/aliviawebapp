import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchGettingStartedFacts, fetchGettingStartedPatients } from "@/lib/gettingStartedData";

const mock = vi.hoisted(() => ({ from: vi.fn(), errorTable: "", requests: [] as { table: string; calls: [string, ...unknown[]][] }[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mock.from } }));
beforeEach(() => {
  mock.errorTable = "";
  mock.requests = [];
  mock.from.mockReset().mockImplementation((table: string) => {
    const request = { table, calls: [] as [string, ...unknown[]][] };
    mock.requests.push(request);
    const chain: Record<string, any> = {};
    for (const method of ["select", "eq", "is", "in", "or", "not", "neq", "order", "limit"]) chain[method] = (...args: unknown[]) => { request.calls.push([method, ...args]); return chain; };
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], count: table === "patients" ? 1 : 0, error: table === mock.errorTable ? new Error("read failed") : null }).then(resolve);
    return chain;
  });
});
const calls = (table: string) => mock.requests.find((r) => r.table === table)?.calls ?? [];

describe("first steps data reads", () => {
  it("PRO reads include explicit ownership and clinic_id IS NULL", async () => {
    await fetchGettingStartedFacts({ userId: "u", professionalId: "p" }, true, true);
    for (const table of ["patients", "assessments", "session_notes", "exercise_programs"]) {
      expect(calls(table)).toContainEqual(["eq", "professional_id", "p"]);
      expect(calls(table)).toContainEqual(["is", "clinic_id", null]);
    }
    expect(calls("srpe_entries")).toContainEqual(["is", "patients.clinic_id", null]);
    expect(calls("srpe_entries")).toContainEqual(["eq", "patients.professional_id", "p"]);
  });
  it("clinic reads are isolated by selected clinic even without a PRO profile", async () => {
    const result = await fetchGettingStartedFacts({ userId: "u", clinicId: "clinic-a" }, true, true);
    expect(result.patients).toBe(1);
    for (const table of ["patients", "assessments", "session_notes", "exercise_programs"]) {
      expect(calls(table)).toContainEqual(["eq", "clinic_id", "clinic-a"]);
      expect(calls(table).some((c) => c[1] === "professional_id")).toBe(false);
    }
    expect(calls("srpe_entries")).toContainEqual(["eq", "patients.clinic_id", "clinic-a"]);
  });
  it("Agent progress is owned by the viewer, scoped and based on replies, not empty threads", async () => {
    await fetchGettingStartedFacts({ userId: "u", clinicId: "clinic-a" }, true, true);
    expect(calls("agent_messages")).toContainEqual(["eq", "agent_threads.user_id", "u"]);
    expect(calls("agent_messages")).toContainEqual(["eq", "agent_threads.clinic_id", "clinic-a"]);
    expect(calls("agent_messages")).toContainEqual(["eq", "role", "assistant"]);
    expect(calls("agent_messages")).toContainEqual(["neq", "parts", "[]"]);
  });
  it("assessment progress excludes drafts and synthetic placeholders", async () => {
    await fetchGettingStartedFacts({ userId: "u", professionalId: "p" }, true, true);
    expect(calls("assessments")).toContainEqual(["in", "status", ["completed", "diagnosis_complete"]]);
    expect(calls("assessments").find((c) => c[0] === "or")?.[1]).toContain('anamnesis_data.not.cs.{"quickEvolutionOnly":true}');
  });
  it("HEP requires saved exercise items, not an empty program", async () => {
    await fetchGettingStartedFacts({ userId: "u", professionalId: "p" }, true, false);
    expect(calls("exercise_programs")).toContainEqual(["select", "id, exercise_program_items!inner(id)", { head: true, count: "exact" }]);
  });
  it("session notes exclude blank content and notes attached to personal commitments", async () => {
    await fetchGettingStartedFacts({ userId: "u", professionalId: "p" }, true, false);
    expect(calls("session_notes")).toContainEqual(["not", "content", "match", "^[[:space:]]*$"]);
    expect(calls("session_notes")).toContainEqual(["eq", "commitments.service_type", "compromisso"]);
    expect(calls("session_notes")).toContainEqual(["is", "commitments", null]);
  });
  it("reception does not query clinical notes, prescriptions, loads or Agent messages", async () => {
    await fetchGettingStartedFacts({ userId: "u", clinicId: "clinic-a" }, false, true);
    const queried = mock.requests.filter((r) => r.calls.some((c) => c[0] === "eq" && c[1] === "clinic_id"));
    expect(queried.map((r) => r.table)).toEqual(["patients", "assessments", "professional_appointments"]);
    expect(calls("professional_appointments")).toContainEqual(["or", "service_type.is.null,service_type.neq.compromisso"]);
  });
  it("a query error stays unknown without erasing successful milestones", async () => {
    mock.errorTable = "exercise_programs";
    const result = await fetchGettingStartedFacts({ userId: "u", professionalId: "p" }, true, true);
    expect(result.heps).toBeNull();
    expect(result.patients).toBe(1);
  });
  it("patient selection remains scoped and supports searching beyond its first 50 rows", async () => {
    await fetchGettingStartedPatients({ userId: "u", professionalId: "p" }, "Ana");
    expect(calls("patients")).toContainEqual(["eq", "professional_id", "p"]);
    expect(calls("patients")).toContainEqual(["is", "clinic_id", null]);
    expect(calls("patients")).toContainEqual(["or", "full_name.ilike.%Ana%,email.ilike.%Ana%"]);
    expect(calls("patients")).toContainEqual(["limit", 50]);
  });
  it("a missing care scope never queries the database", async () => {
    await expect(fetchGettingStartedFacts({ userId: "u" }, true, true)).rejects.toThrow("Care scope unavailable");
    await expect(fetchGettingStartedPatients({ userId: "u" }, "Ana")).rejects.toThrow("Care scope unavailable");
    expect(mock.from).not.toHaveBeenCalled();
  });
  it("patient search preserves a complete email address", async () => {
    await fetchGettingStartedPatients({ userId: "u", professionalId: "p" }, "ana@example.test");
    expect(calls("patients")).toContainEqual(["or", "full_name.ilike.%ana@example.test%,email.ilike.%ana@example.test%"]);
  });
});