import { describe, it, expect } from "vitest";
import { proofread } from "@/pages/studio/agreement";

describe("concordância em caixa alta", () => {
  it("corrige DO → DA antes de substantivo feminino em caixa alta", () => {
    expect(proofread("RELATÓRIO DO AVALIAÇÃO")).toBe("RELATÓRIO DA AVALIAÇÃO");
  });
  it("não mexe em siglas reais", () => {
    expect(proofread("o DNA da marca")).toBe("O DNA da marca");
  });
});
