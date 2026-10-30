import { describe, expect, it } from "vitest";
import { rephrase } from "@/pages/studio/rewrite";
import { relatedCaptionProofs } from "@/pages/studio/captionCoherence";

describe("Studio factual integrity", () => {
  it("preserves the planned 5 to 9 interval, separately from actual effort", () => {
    const fact = "Esforço alvo estimado entre 5 e 9; o esforço percebido real vem do paciente.";
    for (let i = 0; i < 20; i++) {
      expect(rephrase(fact, { seed: String(i), register: "tecnico", intensity: 1 })).toBe(fact);
    }
  });
  it("preserves mandatory red flag screening", () => {
    const fact = "Red flags obrigatórias antes da conduta.";
    expect(rephrase(fact, { seed: "screening", register: "proximo", intensity: 1 })).toBe(fact);
  });
  it("preserves dose weights rather than rearranging enumerations", () => {
    const fact = "Força ×1; estabilização e propriocepção ×0,5; mobilidade e flexibilidade fora da conta.";
    expect(rephrase(fact, { seed: "dose", register: "direto", intensity: 1 })).toBe(fact);
  });
  it("does not pad documentation with unrelated academic arguments", () => {
    expect(relatedCaptionProofs("Relatório da evolução", ["Trilhas com quizzes", "Relatório comparativo da evolução"])).toEqual(["Relatório comparativo da evolução"]);
  });
});