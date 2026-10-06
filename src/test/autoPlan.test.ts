import { describe, it, expect } from "vitest";
import { suggestNextWeek, spreadDays } from "@/lib/autoPlan";
describe("autoPlan", () => {
  it("sem dois duros seguidos", () => {
    for (let n = 1; n <= 6; n++) {
      const h = spreadDays(n).filter((s) => s.kind === "hard").map((s) => s.day);
      for (let i = 1; i < h.length; i++) expect(h[i] - h[i - 1]).toBeGreaterThan(1);
    }
  });
  it("salto ≤10%", () => {
    const ref = new Date("2026-10-07T12:00:00Z");
    const entries = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(ref); d.setUTCDate(d.getUTCDate() - (i * 2 + 1));
      return { session_date: d.toISOString().slice(0, 10), training_load: 300, track: "cardio" };
    });
    const last = entries.filter((e) => (ref.getTime() - new Date(e.session_date + "T12:00:00Z").getTime()) / 864e5 < 7).reduce((a, e) => a + e.training_load, 0);
    const total = suggestNextWeek(entries, "healthy", ref).reduce((a, s) => a + s.duration * s.rpe, 0);
    expect(total).toBeLessThanOrEqual(last * 1.1 + 60);
  });
});
