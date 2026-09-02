import { describe, it, expect } from "vitest";
import {
  trainingLoad,
  acuteLoad,
  chronicLoad,
  acwr,
  loadZone,
  weeklyLoadSeries,
  weeklySpikeAlert,
  readinessScore,
  readinessDrop,
  loadStatus,
  backToBackHighDays,
  dailyPlannedWeight,
} from "@/lib/periodization";

const day = (offset: number, ref = new Date("2026-09-02T12:00:00Z")) => {
  const d = new Date(ref.getTime());
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const REF = new Date("2026-09-02T12:00:00Z");

describe("training load", () => {
  it("multiplica duração por RPE", () => {
    expect(trainingLoad(60, 7)).toBe(420);
    expect(trainingLoad(0, 7)).toBe(0);
    expect(trainingLoad(NaN, 7)).toBe(0);
  });

  it("soma apenas os últimos 7 dias na carga aguda", () => {
    const entries = [
      { session_date: day(0), duration_min: 60, rpe: 5 },
      { session_date: day(-6), duration_min: 60, rpe: 5 },
      { session_date: day(-10), duration_min: 60, rpe: 5 },
    ];
    expect(acuteLoad(entries, REF)).toBe(600);
  });

  it("carga crônica é a média semanal de 28 dias", () => {
    const entries = Array.from({ length: 4 }, (_, i) => ({
      session_date: day(-i * 7),
      duration_min: 60,
      rpe: 5,
    }));
    expect(chronicLoad(entries, REF)).toBe(300);
  });
});

describe("acwr", () => {
  it("retorna null sem histórico crônico", () => {
    expect(acwr([], REF)).toBeNull();
  });

  it("calcula a razão e a zona", () => {
    const entries = [
      { session_date: day(0), duration_min: 100, rpe: 6 },
      { session_date: day(-8), duration_min: 60, rpe: 5 },
      { session_date: day(-15), duration_min: 60, rpe: 5 },
      { session_date: day(-22), duration_min: 60, rpe: 5 },
    ];
    const ratio = acwr(entries, REF)!;
    expect(ratio).toBeGreaterThan(1.5);
    expect(loadZone(ratio)).toBe("danger");
  });

  it("mapeia todas as zonas", () => {
    expect(loadZone(0.5)).toBe("undertraining");
    expect(loadZone(1.0)).toBe("optimal");
    expect(loadZone(1.4)).toBe("caution");
    expect(loadZone(2)).toBe("danger");
    expect(loadZone(null)).toBeNull();
  });
});

describe("weekly series", () => {
  it("agrupa por semana e detecta salto > 10%", () => {
    const entries = [
      { session_date: "2026-08-17", duration_min: 60, rpe: 5 },
      { session_date: "2026-08-24", duration_min: 100, rpe: 5 },
    ];
    const series = weeklyLoadSeries(entries);
    expect(series).toHaveLength(2);
    expect(series[0].load).toBe(300);
    expect(series[1].spikePct).toBeCloseTo(66.7, 1);
    expect(weeklySpikeAlert(series)?.spikePct).toBeCloseTo(66.7, 1);
  });

  it("não alerta quando o salto é pequeno", () => {
    const series = weeklyLoadSeries([
      { session_date: "2026-08-17", duration_min: 100, rpe: 5 },
      { session_date: "2026-08-24", duration_min: 105, rpe: 5 },
    ]);
    expect(weeklySpikeAlert(series)).toBeNull();
  });
});

describe("readiness", () => {
  it("inverte itens negativos e ignora vazios", () => {
    expect(readinessScore({ checkin_date: day(0), readiness: 10, sleep: 10 })).toBe(100);
    expect(readinessScore({ checkin_date: day(0), fatigue: 10, soreness: 10 })).toBe(0);
    expect(readinessScore({ checkin_date: day(0) })).toBeNull();
  });

  it("detecta queda abrupta", () => {
    const checkins = [
      { checkin_date: day(-3), readiness: 9 },
      { checkin_date: day(-2), readiness: 9 },
      { checkin_date: day(-1), readiness: 9 },
      { checkin_date: day(0), readiness: 3 },
    ];
    expect(readinessDrop(checkins)?.drop).toBeGreaterThanOrEqual(20);
  });

  it("não acusa queda com poucos dados", () => {
    expect(readinessDrop([{ checkin_date: day(0), readiness: 2 }])).toBeNull();
  });
});

describe("loadStatus", () => {
  it("consolida alerta vermelho por ACWR alto", () => {
    const entries = [
      { session_date: day(0), duration_min: 120, rpe: 8 },
      { session_date: day(-9), duration_min: 40, rpe: 4 },
      { session_date: day(-18), duration_min: 40, rpe: 4 },
    ];
    const status = loadStatus(entries, [], REF);
    expect(status.level).toBe("danger");
    expect(status.messages.length).toBeGreaterThan(0);
  });

  it("fica ok sem dados", () => {
    const status = loadStatus([], [], REF);
    expect(status.level).toBe("ok");
    expect(status.acwr).toBeNull();
  });
});

describe("microcycle heuristics", () => {
  it("marca dias de alta carga consecutivos", () => {
    const flagged = backToBackHighDays([
      { session_date: "2026-09-01", planned_load: "high" },
      { session_date: "2026-09-02", planned_load: "high" },
      { session_date: "2026-09-04", planned_load: "high" },
    ]);
    expect(flagged).toEqual(["2026-09-02"]);
  });

  it("soma o peso planejado por dia", () => {
    const weights = dailyPlannedWeight([
      { session_date: "2026-09-01", planned_load: "high" },
      { session_date: "2026-09-01", planned_load: "low" },
    ]);
    expect(weights["2026-09-01"]).toBe(4);
  });
});
