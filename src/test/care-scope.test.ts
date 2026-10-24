import { describe, expect, it } from "vitest";
import { careScope, threadScope } from "@/lib/careScope";
import { patientMatchesCareScope, canUseAgentScope } from "../../supabase/functions/_shared/agent-care-scope";

class Query {
  constructor(public rows: Array<Record<string, unknown>>) {}
  eq(key: string, value: string) { this.rows = this.rows.filter(r => r[key] === value); return this; }
  is(key: string, value: null) { this.rows = this.rows.filter(r => r[key] === value); return this; }
}
const records = [
  { id: "gv-test", clinic_id: "gv-fisio", professional_id: "pro" },
  { id: "solo", clinic_id: null, professional_id: "pro" },
  { id: "other-clinic", clinic_id: "other", professional_id: "pro" },
];
describe("clinic and autonomous practice isolation", () => {
  it("GV Fisio test patients never enter the solo PRO list despite matching professional", () => {
    expect(careScope(new Query(records), null, "pro").rows.map(r => r.id)).toEqual(["solo"]);
  });
  it("clinic lists exclude both solo records and another clinic", () => {
    expect(careScope(new Query(records), "gv-fisio", "pro").rows.map(r => r.id)).toEqual(["gv-test"]);
  });
  it("agent history separates clinic from solo threads", () => {
    expect(threadScope(new Query(records), null).rows.map(r => r.id)).toEqual(["solo"]);
    expect(threadScope(new Query(records), "gv-fisio").rows.map(r => r.id)).toEqual(["gv-test"]);
  });
  it("server refuses attaching a clinic patient to a solo thread", () => {
    expect(patientMatchesCareScope(records[0], null, "pro")).toBe(false);
  });
  it("server refuses attaching solo or other-clinic patients to GV Fisio threads", () => {
    expect(patientMatchesCareScope(records[1], "gv-fisio", "pro")).toBe(false);
    expect(patientMatchesCareScope(records[2], "gv-fisio", "pro")).toBe(false);
    expect(patientMatchesCareScope(records[0], "gv-fisio", "pro")).toBe(true);
  });
  it("server refuses a clinic where the verified caller has no active membership", async () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: null, error: null }) };
    expect(await canUseAgentScope({ from: () => query }, "verified-user", "gv-fisio")).toBe(false);
  });
});