import { describe, expect, it } from "vitest";
import { analyzePeriod, analyzeSession, patientReadings, periodReadings, perceivedZone } from "@/lib/cardioAnalysis";
import { hrCeiling } from "@/lib/cardioSafety";

const ctx = (profile: any = "healthy", betaBlocker = false) => ({ profile, betaBlocker, ceiling: hrCeiling({ profile, age: 50 }) });
// idade 50 → FCmáx 172; teto saudável 80% = 138; hipertenso 70% = 120

const base = { id: "a", session_date: "2026-10-05", track: "cardio", duration_min: 40, rpe: 5 };

describe("analyzeSession", () => {
  it("usa zonas para intensidade e calcula minutos acima do teto", () => {
    const s = analyzeSession({ ...base, hr_avg: 130, hr_max: 150, zone_minutes: [5, 10, 15, 10, 0] }, ctx());
    expect(s.intensity).toMatchObject({ light: 5, moderate: 25, vigorous: 10, source: "zones" });
    expect(s.trimp).toBe(5 + 20 + 45 + 40);
    expect(s.aboveCeiling).toBe(true);
    expect(s.minutesAboveCeiling).toBeGreaterThan(9);
    expect(s.flags).toContain("hr_above_ceiling");
  });
  it("sem FC usa a PSE (OMS: 5–6 moderado, ≥7 vigoroso)", () => {
    expect(analyzeSession({ ...base, rpe: 7 }, ctx()).intensity.vigorous).toBe(40);
    expect(analyzeSession({ ...base, rpe: 5 }, ctx()).intensity.moderate).toBe(40);
  });
  it("betabloqueador força a PSE mesmo com zonas", () => {
    const s = analyzeSession({ ...base, rpe: 4, zone_minutes: [0, 0, 0, 40, 0] }, ctx("cardiac", true));
    expect(s.intensity.source).toBe("rpe");
    expect(s.flags).not.toContain("heart_higher");
  });
  it("recuperação no 1º minuto ≤12 é atenção", () => {
    expect(analyzeSession({ ...base, hr_max: 150, hr_recovery_1min: 140 }, ctx()).recovery).toEqual({ drop: 10, status: "low" });
    expect(analyzeSession({ ...base, hr_max: 150, hr_recovery_1min: 125 }, ctx()).recovery?.status).toBe("good");
  });
  it("coerência coração × percepção", () => {
    const s = analyzeSession({ ...base, rpe: 2, zone_minutes: [0, 0, 0, 40, 0] }, ctx());
    expect(perceivedZone(2)).toBe(1);
    expect(s.coherence?.status).toBe("heart_higher");
  });
  it("ritmo e eficiência", () => {
    const s = analyzeSession({ ...base, duration_min: 30, distance_km: 5, hr_avg: 150 }, ctx());
    expect(s.paceMinKm).toBe(6);
    expect(s.speedKmh).toBe(10);
    expect(s.efficiency).toEqual({ kind: "speed", value: 1.11 });
  });
  it("zona prescrita nos perfis clínicos", () => {
    expect(analyzeSession({ ...base, rpe: 4, hr_max: 115 }, ctx("hypertensive")).inPrescribedZone).toBe(true);
    expect(analyzeSession({ ...base, rpe: 4, hr_max: 130 }, ctx("hypertensive")).inPrescribedZone).toBe(false);
  });
});

describe("analyzePeriod", () => {
  const entries = [
    { ...base, id: "1", session_date: "2026-09-16", rpe: 5, duration_min: 160 },
    { ...base, id: "2", session_date: "2026-09-24", rpe: 7, duration_min: 40 },
    { ...base, id: "3", session_date: "2026-10-01", rpe: 5, duration_min: 60, track: "gym" },
    { ...base, id: "4", session_date: "2026-10-06", rpe: 5, duration_min: 100 },
  ];
  it("semanas móveis e meta da OMS", () => {
    const p = analyzePeriod({ entries, checkins: [], ctx: ctx(), weeks: 4, today: "2026-10-07" });
    expect(p.weeks).toHaveLength(4);
    expect(p.weeks.map((w) => w.equivalent)).toEqual([160, 0, 80, 100]);
    expect(p.whoWeeksMet).toBe(1);
    // academia sem monitor não conta como aeróbia
    expect(p.aerobicSessions).toBe(3);
  });
  it("leituras determinísticas", () => {
    const p = analyzePeriod({ entries, checkins: [], ctx: ctx(), weeks: 4, today: "2026-10-07" });
    expect(periodReadings(p, ctx())).toEqual(periodReadings(p, ctx()));
    expect(periodReadings(p, ctx())[0]).toContain("1 de 4 semanas");
    expect(patientReadings(p, ctx())[0]).toContain("1 de 4 semanas");
  });
  it("tendência de recuperação", () => {
    const rec = [10, 12, 18, 22].map((d, i) => ({ ...base, id: `r${i}`, session_date: `2026-10-0${i + 1}`, hr_max: 150, hr_recovery_1min: 150 - d }));
    const p = analyzePeriod({ entries: rec, checkins: [], ctx: ctx(), weeks: 4, today: "2026-10-07" });
    expect(p.recoveryTrend).toMatchObject({ first: 11, last: 20 });
    expect(patientReadings(p, ctx()).join(" ")).toContain("recuperando mais rápido");
  });
});
