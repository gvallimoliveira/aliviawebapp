import { describe, it, expect } from "vitest";
import {
  groupAssessmentsByCondition,
  hypothesisSimilarity,
  resolveCluster,
} from "@/lib/painConditions";

const mk = (id: string, days: number, regions: string[], hypothesis?: string, pain?: number) => ({
  id,
  created_at: new Date(Date.now() - days * 86400000).toISOString(),
  pain_regions: regions,
  pain_score: pain ?? 5,
  diagnosis: hypothesis ? { hypothesis } : null,
});

describe("painConditions", () => {
  it("mapeia regiões para clusters com lateralidade", () => {
    expect(resolveCluster(["lower_back"])).toEqual({ clusterId: "lumbar", side: undefined });
    expect(resolveCluster(["right_shoulder"])).toEqual({ clusterId: "shoulder", side: "right" });
    expect(resolveCluster([])).toBeNull();
  });

  it("separa lombar, cotovelo e ombro em condições distintas", () => {
    const conditions = groupAssessmentsByCondition([
      mk("a", 300, ["lower_back"], "Dor lombar com componente facetário", 7),
      mk("b", 200, ["left_elbow"], "Epicondilalgia lateral", 6),
      mk("c", 30, ["right_shoulder"], "Síndrome do manguito rotador", 8),
    ]);
    expect(conditions).toHaveLength(3);
    expect(conditions[0].clusterId).toBe("shoulder");
    expect(conditions.map((c) => c.clusterId).sort()).toEqual(["elbow", "lumbar", "shoulder"]);
  });

  it("mantém reavaliações da mesma queixa na mesma condição", () => {
    const conditions = groupAssessmentsByCondition([
      mk("a", 120, ["lower_back"], "Dor lombar com componente facetário", 8),
      mk("b", 60, ["lower_back"], "Dor lombar com componente facetário", 5),
      mk("c", 10, ["lower_back"], "Dor lombar nociceptiva", 3),
    ]);
    expect(conditions).toHaveLength(1);
    expect(conditions[0].assessments).toHaveLength(3);
    expect(conditions[0].firstPainScore).toBe(8);
    expect(conditions[0].latestPainScore).toBe(3);
  });

  it("abre novo episódio quando há intervalo longo e hipótese diferente", () => {
    const conditions = groupAssessmentsByCondition([
      mk("a", 900, ["left_knee"], "Tendinopatia patelar", 7),
      mk("b", 20, ["left_knee"], "Condropatia femoropatelar", 6),
    ]);
    expect(conditions).toHaveLength(2);
    expect(conditions.some((c) => c.label.includes("episódio"))).toBe(true);
  });

  it("condições em paralelo ficam ambas ativas", () => {
    const conditions = groupAssessmentsByCondition([
      mk("a", 5, ["lower_back"], "Lombalgia mecânica", 6),
      mk("b", 3, ["right_shoulder"], "Bursite subacromial", 7),
    ]);
    expect(conditions.every((c) => c.isActive)).toBe(true);
  });

  it("avaliações sem região vão para Geral", () => {
    const conditions = groupAssessmentsByCondition([mk("a", 5, [], undefined, 4)]);
    expect(conditions).toHaveLength(1);
    expect(conditions[0].key).toBe("general");
  });

  it("similaridade de hipótese ignora ruído", () => {
    expect(
      hypothesisSimilarity("Dor lombar com componente facetário", "Lombar - componente facetario"),
    ).toBeGreaterThan(0.5);
    expect(hypothesisSimilarity("Epicondilalgia lateral", "Bursite subacromial")).toBe(0);
  });
});
