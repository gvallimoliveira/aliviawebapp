import { describe, it, expect } from "vitest";
import { computePayouts } from "@/lib/payouts";
import type { MgmtAppt } from "@/lib/managementMetrics";

const appt = (id: string, pid: string, extra: Partial<MgmtAppt> = {}): MgmtAppt => ({ id, appointment_date: "2026-10-10", status: "completed", professional_id: pid, service_id: "s1", patient_name: "Ana", ...extra });
const services = [{ id: "s1", name: "Fisio", deduction_pct: 10, payout_mode: null, payout_value: null }];
const base = { month: "2026-10", priceOf: () => 200, services, names: {} };

describe("computePayouts", () => {
  it("percent applies on price after the service deduction", () => {
    const r = computePayouts({ ...base, appts: [appt("a", "p1")], compensation: [{ professional_id: "p1", session_mode: "percent", session_value: 50, monthly_fixed: 0 }], adjustments: [] });
    expect(r.rows[0].sessionPayout).toBe(90); // (200 - 10%) * 50%
    expect(r.totals.clinicNet).toBe(90); // 200 - 20 - 90
  });
  it("fixed per session ignores price", () => {
    const r = computePayouts({ ...base, appts: [appt("a", "p1"), appt("b", "p1")], compensation: [{ professional_id: "p1", session_mode: "fixed", session_value: 80, monthly_fixed: 0 }], adjustments: [] });
    expect(r.rows[0].sessionPayout).toBe(160);
  });
  it("monthly stipend counts with zero sessions and adjustments add or subtract", () => {
    const r = computePayouts({ ...base, appts: [], compensation: [{ professional_id: "int", session_mode: "none", session_value: 0, monthly_fixed: 800 }], adjustments: [{ id: "x", professional_id: "int", label: "Vale", amount: -50 }] });
    expect(r.rows[0].total).toBe(750);
  });
  it("service override wins over the professional rule; other months and commitments ignored", () => {
    const r = computePayouts({ ...base, services: [{ ...services[0], payout_mode: "fixed", payout_value: 30 }],
      appts: [appt("a", "p1"), appt("b", "p1", { appointment_date: "2026-09-30" }), appt("c", "p1", { service_type: "compromisso" })],
      compensation: [{ professional_id: "p1", session_mode: "percent", session_value: 50, monthly_fixed: 0 }], adjustments: [] });
    expect(r.rows[0].sessions).toBe(1);
    expect(r.rows[0].sessionPayout).toBe(30);
  });
});
