import { describe, it, expect } from "vitest";
import { funnelStepPct, concentrationTone } from "@/lib/insightFormat";

describe("funnelStepPct", () => {
  it("retorna 0 quando a base é 0 (sem divisão por zero)", () => {
    expect(funnelStepPct(5, 0)).toBe(0);
  });

  it("calcula a proporção da etapa sobre a base", () => {
    expect(funnelStepPct(10, 40)).toBe(25);
  });

  it("limita a 100 mesmo se a etapa superar a base", () => {
    expect(funnelStepPct(50, 40)).toBe(100);
  });
});

describe("concentrationTone", () => {
  it("marca dependência alta a partir de 60%", () => {
    expect(concentrationTone(60)).toBe("high");
    expect(concentrationTone(59)).toBe("medium");
  });

  it("marca carteira equilibrada abaixo de 40%", () => {
    expect(concentrationTone(39)).toBe("low");
  });
});
