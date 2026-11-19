import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: mocks }));
import { fetchLoadMonitoring, setLoadMonitoring } from "@/lib/loadMonitoringData";

beforeEach(() => { vi.clearAllMocks(); });
describe("load monitoring scope persistence", () => {
  it("clinic without personal professional ID sends null, not an invalid UUID", async () => {
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    expect(await setLoadMonitoring({ patientId: "patient", clinicId: "clinic", professionalId: "" }, true)).toBe("patient");
    expect(mocks.rpc).toHaveBeenCalledWith("set_patient_load_monitoring", {
      _patient_id: "patient", _enabled: true, _clinic_id: "clinic", _professional_id: null,
    });
  });
  it("failed writes do not report activation", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("denied") });
    await expect(setLoadMonitoring({ patientId: "patient", clinicId: "clinic" }, true)).rejects.toThrow("denied");
  });
  it("ambiguous patient names cannot create a replacement record", async () => {
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: new Error("multiple rows") }) };
    mocks.from.mockReturnValue(q);
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    await expect(setLoadMonitoring({ patientName: "Same name", clinicId: "clinic" }, true)).rejects.toThrow("multiple rows");
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });
  it("solo lookup explicitly excludes clinic patients", async () => {
    const q = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockResolvedValue({ data: { id: "patient", load_monitoring_enabled: false }, error: null }) };
    mocks.from.mockReturnValue(q);
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    expect(await fetchLoadMonitoring({ patientId: "patient", professionalId: "pro" })).toEqual({ patientId: "patient", enabled: false, canManage: true });
    expect(q.is).toHaveBeenCalledWith("clinic_id", null);
    expect(q.eq).toHaveBeenCalledWith("professional_id", "pro");
  });
});