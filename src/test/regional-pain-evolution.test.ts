import { describe, expect, it } from "vitest";
import { buildRegionalPainEvolution } from "@/lib/regionalPainEvolution";

const assessment = (id: string, date: string, rest = {}) => ({ id, created_at: date, status: "completed", ...rest });
describe("regional pain evolution", () => {
  it("sorts chronologically, preserves zero and left/right and does not mutate input", () => {
    const data = [assessment("b", "2026-10-02", { anamnesis_data: { painScoresPerRegion: { right_shoulder: 0, left_shoulder: 5 } } }), assessment("a", "2026-10-01", { anamnesis_data: { pain_scores_per_region: { right_shoulder: 8 } } })];
    const result = buildRegionalPainEvolution(data);
    expect(result.series[0].measurements.map(m => m.score)).toEqual([8, 0]);
    expect(result.series[1].regionId).toBe("left_shoulder");
    expect(result.points[0][result.series[1].key]).toBeNull();
    expect(data[0].id).toBe("b");
  });
  it("keeps a multi-region global score global rather than inventing regional scores", () => {
    const { series } = buildRegionalPainEvolution([assessment("a", "2026-10-01", { pain_score: 4, pain_regions: ["cervical", "lower_back"] })]);
    expect(series.map(s => s.regionId)).toEqual(["general"]);
  });
  it("supports real complaint-keyed scores and rejects invalid measurements and unfinished assessments", () => {
    const { series } = buildRegionalPainEvolution([assessment("a", "2026-10-01", { anamnesis_data: { painScoresPerRegion: { "anamnesis.complaint.neck_pain": 6, right_shoulder: 12, left_shoulder: -1 } } }), assessment("b", "2026-10-02", { status: "in_progress", pain_score: 5 })]);
    expect(series).toHaveLength(1);
    expect(series[0].regionId).toBe("anamnesis.complaint.neck_pain");
  });
  it("uses the recorded global pain for a single selected region and leaves missing scores absent", () => {
    const { series } = buildRegionalPainEvolution([assessment("a", "2026-10-01", { pain_score: 4, pain_regions: ["cervical"] }), assessment("b", "2026-10-02", { pain_score: null, pain_regions: ["cervical"] })]);
    expect(series[0].measurements).toEqual([{ date: "2026-10-01", score: 4 }]);
  });
});