// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { acuteLoad, chronicLoad, acwr, optionalPatientLoads, brazilRefDate, type LoadEntry } from "../../supabase/functions/physiotech-sso/loads";
import { acuteLoad as appAcute, chronicLoad as appChronic, acwr as appAcwr } from "../lib/periodization";

const ref = "2026-11-09";
const now = new Date("2026-11-10T01:00:00Z");
const day = (ago: number) => new Date(new Date(`${ref}T12:00:00Z`).getTime() - ago * 86400000).toISOString().slice(0, 10);
const entry = (ago: number, id = String(ago)): LoadEntry => ({ id, session_date: day(ago), duration_min: 60, rpe: 5, notes: null });
function clientFor(data: unknown, error: unknown = null) {
  const query: any = {};
  for (const method of ["select", "eq", "gte", "lte", "order", "limit"]) query[method] = vi.fn(() => query);
  query.abortSignal = vi.fn(async () => ({ data, error }));
  return { client: { from: vi.fn(() => query) }, query };
}

describe("PhysioTech optional loads", () => {
  it("uses today's São Paulo date even after midnight UTC", () => {
    expect(brazilRefDate(now)).toBe("2026-11-09");
  });
  it("requests 35 inclusive days, no future sessions, at most 200, by patient ID", async () => {
    const { client, query } = clientFor([]);
    await optionalPatientLoads(client, "token-pid", now);
    expect(client.from).toHaveBeenCalledWith("srpe_entries");
    expect(query.eq).toHaveBeenCalledWith("patient_id", "token-pid");
    expect(query.gte).toHaveBeenCalledWith("session_date", "2026-10-06");
    expect(query.lte).toHaveBeenCalledWith("session_date", "2026-11-09");
    expect(query.limit).toHaveBeenCalledWith(200);
    expect(query.abortSignal.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });
  it("sends one already-merged row, its original ID and professional RPE, retaining distinct same-day sessions", async () => {
    const merged = { ...entry(0, "merged-row"), notes: "Profissional\nPaciente: respondeu", patient_rpe: 8 };
    const { client } = clientFor([merged, { ...entry(0, "sport-row"), duration_min: 30 }]);
    const result = await optionalPatientLoads(client, "pid", now);
    expect(result.loads).toEqual([
      { sessionId: "merged-row", date: ref, durationMin: 60, rpe: 5, note: merged.notes },
      { sessionId: "sport-row", date: ref, durationMin: 30, rpe: 5, note: null },
    ]);
    expect(result.loadSummary?.acute).toBe(450);
  });
  it("matches the app's 7/28-day math and rounds the ratio identically", () => {
    const entries = [0, 6, 7, 14, 27, 28, 34, -1].map((d) => entry(d));
    const appRef = new Date(2026, 10, 9, 12);
    expect(acuteLoad(entries, ref)).toBe(600);
    expect(chronicLoad(entries, ref)).toBe(375);
    expect(acwr(entries, ref)).toBe(1.6);
    expect(acuteLoad(entries, ref)).toBe(appAcute(entries, appRef));
    expect(chronicLoad(entries, ref)).toBe(appChronic(entries, appRef));
    expect(acwr(entries, ref)).toBe(appAcwr(entries, appRef));
  });
  it("returns null unless at least four positive sessions span at least 14 days within 28 days", () => {
    expect(acwr([], ref)).toBeNull();
    expect(acwr([0, 7, 14].map((d) => entry(d)), ref)).toBeNull();
    expect(acwr([0, 4, 8, 13].map((d) => entry(d)), ref)).toBeNull();
    expect(acwr([0, 7, 14, 28].map((d) => entry(d)), ref)).toBeNull();
    expect(acwr([0, 4, 8, 14].map((d) => entry(d)), ref)).toBe(2);
  });
  it("keeps empty history optional with zero loads and null ACWR", async () => {
    const { client } = clientFor([]);
    expect(await optionalPatientLoads(client, "pid", now)).toEqual({
      loads: [], loadSummary: { refDate: ref, acute: 0, chronic: 0, acwr: null },
    });
  });
  it("omits both fields on query errors", async () => {
    const { client } = clientFor([entry(0)], { message: "denied" });
    expect(await optionalPatientLoads(client, "pid", now)).toEqual({});
  });
  it("omits both fields on thrown failures or timeouts", async () => {
    const { client, query } = clientFor([]);
    query.abortSignal.mockRejectedValue(new Error("timeout"));
    expect(await optionalPatientLoads(client, "pid", now)).toEqual({});
  });
});