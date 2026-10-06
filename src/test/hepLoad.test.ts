import { describe, it, expect } from "vitest";
import { parseItem, summarizeHep, parseReps, parseFrequency } from "@/lib/hepLoad";

const base = { name: "x", region: "knee", frequency: "3x/semana" };

describe("hepLoad", () => {
  it("3x10 e 10x3 têm o mesmo volume e intensidades diferentes", () => {
    const a = parseItem({ ...base, sets: "3", reps: "10" });
    const b = parseItem({ ...base, sets: "10", reps: "3" });
    expect(a.totalReps).toBe(30);
    expect(b.totalReps).toBe(30);
    expect(a.volume).toBe("moderate");
    expect(b.volume).toBe("moderate");
    expect(a.intensity).toBe("moderate");
    expect(b.intensity).toBe("high");
  });

  it("isometria por tempo", () => {
    expect(parseReps("30s")).toEqual({ reps: null, hold: 30 });
    expect(parseItem({ ...base, sets: "3", reps: "5s" }).intensity).toBe("high");
    expect(parseItem({ ...base, sets: "3", reps: "10 seg" }).intensity).toBe("moderate");
    expect(parseItem({ ...base, sets: "3", reps: "30s" }).intensity).toBe("light");
  });

  it("volume de carga e séries semanais por região", () => {
    const s = summarizeHep([
      { ...base, sets: "3", reps: "10", loadType: "kg", loadKg: 20 },
      { ...base, region: "hip", sets: "2", reps: "15", frequency: "diário" },
    ]);
    expect(s.volumeLoad).toBe(600);
    expect(s.byRegion.find((r) => r.region === "hip")!.weeklySets).toBe(14);
    expect(s.byRegion.find((r) => r.region === "knee")!.volume).toBe("moderate");
    expect(s.sessionsPerWeek).toBe(7);
    expect(parseFrequency("2x/semana")).toBe(2);
  });
});
