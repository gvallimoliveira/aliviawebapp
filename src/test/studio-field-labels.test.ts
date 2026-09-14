import { describe, expect, it } from "vitest";
import { buildBrandDna, stripFieldLabels } from "@/pages/studio-pro/brandDnaKit";
import { readAudiences } from "@/pages/studio-pro/audiences";

describe("rótulos do formulário nunca viram texto de arte", () => {
  it("remove rótulo depois de ponto, no meio da resposta", () => {
    expect(stripFieldLabels("Voltar a treinar sem medo. Objeções mais comuns: acha que vai demorar")).toBe(
      "Voltar a treinar sem medo. acha que vai demorar",
    );
    expect(stripFieldLabels("Maior desejo: entender a origem da dor")).toBe("entender a origem da dor");
  });

  it("separa desejo e objeção mesmo quando o rótulo vem após ponto", () => {
    const dna = buildBrandDna({
      briefAnswers: {
        desejo:
          "Entender a origem da dor e voltar a se mover sem medo. Objeções mais comuns: acha que vai demorar muito, que vai custar caro.",
      },
    });
    expect(dna.desire).toBe("Entender a origem da dor e voltar a se mover sem medo.");
    expect(dna.objection).toMatch(/^acha que vai demorar muito/);
    expect(`${dna.desire} ${dna.objection}`).not.toMatch(/obje(ç|c)/i);
  });

  it("limpa rótulos escritos nas listas de público", () => {
    const [audience] = readAudiences([
      { label: "Dor crônica", objections: ["Objeções mais comuns: acha que exercício piora a dor"] },
    ]);
    expect(audience.objections?.[0]).toBe("acha que exercício piora a dor");
  });
});
