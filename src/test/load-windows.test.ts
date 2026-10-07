import { describe, it, expect } from "vitest";
import { addDaysISO, groupByDay, recentDaysWindow, rollingDailySeries } from "@/lib/loadWindows";

const today = "2026-10-07";

describe("loadWindows", () => {
  it("janela de 3 dias termina hoje quando há dado recente", () => {
    expect(recentDaysWindow(["2026-10-06", "2026-09-01"], 3, today)).toEqual({ from: "2026-10-05", to: today, fallback: false });
  });

  it("sem dado recente, mostra os dias mais recentes com registro", () => {
    expect(recentDaysWindow(["2026-09-20", "2026-09-10"], 3, today)).toEqual({ from: "2026-09-18", to: "2026-09-20", fallback: true });
  });

  it("ignora datas futuras no fallback", () => {
    expect(recentDaysWindow(["2026-10-10"], 7, today).fallback).toBe(false);
  });

  it("atleta com 15 sessões/semana vira 7 barras e grupos por dia", () => {
    const tracks = ["physio", "gym", "cardio"];
    const entries = Array.from({ length: 7 }, (_, i) => addDaysISO(today, -i)).flatMap((d) =>
      tracks.slice(0, 2 + (d.endsWith("7") ? 1 : 0)).map((track) => ({ session_date: d, track, duration_min: 60, rpe: 5 })),
    );
    const series = rollingDailySeries(entries, addDaysISO(today, -6), today);
    expect(series).toHaveLength(7);
    expect(series[6].total).toBe(900);
    expect(groupByDay(entries, (e) => e.session_date)[0].date).toBe(today);
    expect(groupByDay(entries, (e) => e.session_date)).toHaveLength(7);
  });
});
