import { beforeEach, expect, it, vi } from "vitest";
const invoke = vi.hoisted(() => vi.fn());
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
import { activateClinicTrial, normalizeAndValidateCnpj, normalizeTrialEntry, PENDING_TRIAL_KEY, readPendingClinicTrial, savePendingClinicTrial } from "@/lib/clinicTrialEntry";
const entry = { email: " TEAM@example.com ", phone: " 11999999999 ", cnpj: "25.689.963/2500-15", tier: "medium" as const, plan: "annual" as const };
beforeEach(() => { sessionStorage.clear(); localStorage.clear(); invoke.mockReset(); });
it("rejects invalid CNPJ check digits, including the reported simulated CNPJ", () => {
  expect(normalizeAndValidateCnpj("25689963250001")).toBeNull();
  expect(normalizeAndValidateCnpj("11111111111111")).toBeNull();
  expect(normalizeAndValidateCnpj(entry.cnpj)).toBe("25689963250015");
});
it("preserves email, WhatsApp, CNPJ, tier and billing plan across the login step without a password", () => {
  savePendingClinicTrial(entry);
  expect(readPendingClinicTrial()).toEqual({ email: "team@example.com", phone: "11999999999", cnpj: "25689963250015", tier: "medium", plan: "annual" });
  expect(Object.keys(JSON.parse(sessionStorage.getItem(PENDING_TRIAL_KEY) || "{}")).sort()).toEqual(["cnpj", "email", "phone", "plan", "savedAt", "tier"]);
  expect(localStorage.getItem(PENDING_TRIAL_KEY)).toBeNull();
});
it("does not initiate an abandoned paid checkout when the user chooses a trial", () => {
  sessionStorage.setItem("pendingClinicPlan", "paid"); localStorage.setItem("pendingClinicPlan", "paid");
  savePendingClinicTrial(entry);
  expect(sessionStorage.getItem("pendingClinicPlan")).toBeNull(); expect(localStorage.getItem("pendingClinicPlan")).toBeNull();
});
it("expires temporary trial data after 24 hours", () => {
  savePendingClinicTrial(entry);
  const raw = JSON.parse(sessionStorage.getItem(PENDING_TRIAL_KEY) || "{}");
  sessionStorage.setItem(PENDING_TRIAL_KEY, JSON.stringify({ ...raw, savedAt: Date.now() - 86400001 }));
  expect(readPendingClinicTrial()).toBeNull();
});
it("rejects incomplete input instead of silently replacing a tier", () => {
  expect(() => normalizeTrialEntry({ ...entry, phone: "" })).toThrow();
  expect(() => normalizeTrialEntry({ ...entry, email: "invalid" })).toThrow();
  expect(() => normalizeTrialEntry({ ...entry, tier: "unknown" as typeof entry.tier })).toThrow();
});
it("keeps pending data when the server refuses activation with a friendly reason", async () => {
  savePendingClinicTrial(entry);
  invoke.mockResolvedValue({ error: { context: { json: async () => ({ message: "CNPJ já utilizado." }) } } });
  await expect(activateClinicTrial(entry)).rejects.toThrow("CNPJ já utilizado.");
  expect(readPendingClinicTrial()?.tier).toBe("medium");
});
it("distinguishes existing-account login from new-account signup without inventing an activated clinic", async () => {
  invoke.mockResolvedValueOnce({ data: { success: true, requires_login: true } }).mockResolvedValueOnce({ data: { success: true, requires_signup: true } });
  expect(await activateClinicTrial(entry)).toEqual({ success: true, requires_login: true });
  expect(await activateClinicTrial(entry)).toEqual({ success: true, requires_signup: true });
  expect(invoke).toHaveBeenCalledWith("start-clinic-trial", { body: normalizeTrialEntry(entry) });
});