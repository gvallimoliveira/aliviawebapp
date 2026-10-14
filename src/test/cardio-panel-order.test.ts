import { describe, expect, it } from "vitest";
import { profilePanelOrder } from "@/lib/cardioAnalysis";

describe("profilePanelOrder", () => {
  it("atletas e ativos veem carga e distribuição antes da OMS", () => {
    expect(profilePanelOrder("athletic")).toEqual(["trimp", "distribution", "efficiency", "recovery", "who", "prescribed"]);
    expect(profilePanelOrder("healthy")).toEqual(["trimp", "distribution", "efficiency", "recovery", "who", "prescribed"]);
  });
  it("sedentário prioriza a referência da OMS e a base leve", () => {
    expect(profilePanelOrder("sedentary")).toEqual(["who", "distribution", "prescribed", "recovery", "trimp", "efficiency"]);
  });
  it.each(["hypertensive", "cardiac", "pulmonary"] as const)("perfis clínicos (%s) priorizam zona prescrita e recuperação", (p) => {
    expect(profilePanelOrder(p)).toEqual(["prescribed", "recovery", "trimp", "who", "distribution", "efficiency"]);
  });
  it("perfil desconhecido cai no padrão saudável", () => {
    expect(profilePanelOrder(null)).toEqual(profilePanelOrder("healthy"));
    expect(profilePanelOrder("xyz")).toEqual(profilePanelOrder("healthy"));
  });
});
