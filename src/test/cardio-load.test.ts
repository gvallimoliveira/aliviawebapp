import { describe, it, expect } from "vitest";
import { edwardsZone, monitorFlags, sanitizeZones, srpeLoad, trimp } from "@/lib/cardioLoad";

describe("cardioLoad", () => {
  it("sRPE = duração × PSE", () => {
    expect(srpeLoad(40, 6)).toBe(240);
    expect(srpeLoad(0, 6)).toBe(0);
  });
  it("zonas de Edwards", () => {
    expect(edwardsZone(90, 200)).toBe(0);
    expect(edwardsZone(110, 200)).toBe(1);
    expect(edwardsZone(150, 200)).toBe(3);
    expect(edwardsZone(185, 200)).toBe(5);
  });
  it("TRIMP por zonas tem prioridade", () => {
    const z = sanitizeZones([10, 10, 10, 5, 0]);
    expect(trimp({ zones: z, durationMin: 35, hrAvg: 150, hrMax: 190 })).toEqual({ value: 80, method: "zones" });
  });
  it("sem zonas não há TRIMP", () => {
    expect(trimp({ durationMin: 30, hrAvg: 150, hrMax: 200 })).toEqual({ value: null, method: null });
    expect(trimp({ durationMin: 30 }).value).toBeNull();
  });
  it("zonas vazias viram null", () => {
    expect(sanitizeZones([0, 0, null, undefined, 0])).toBeNull();
  });
  it("alertas de teto e SpO2", () => {
    expect(monitorFlags({ hrMax: 170, spo2Min: 90 }, 160)).toEqual(["hr_above_ceiling", "spo2_low"]);
    expect(monitorFlags({ hrMax: 150, spo2Min: 96 }, 160)).toEqual([]);
  });
});
