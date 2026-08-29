import { describe, expect, it } from "vitest";
import { agreesWell, fixAgreement, proofread } from "@/pages/studio/agreement";
import { readsWell } from "@/pages/studio/grammar";

describe("revisão de concordância (professor de português)", () => {
  it("corrige determinante + ordinal contra o núcleo nominal", () => {
    expect(fixAgreement("A cirurgia foi apenas o primeiro etapa.")).toBe(
      "A cirurgia foi apenas a primeira etapa.",
    );
    expect(fixAgreement("na primeiro fase")).toBe("na primeira fase");
    expect(fixAgreement("o próxima sessão")).toBe("a próxima sessão");
  });

  it("corrige possessivo com substantivo masculino terminado em -a", () => {
    expect(fixAgreement("não precisa ser a sua dia a dia")).toBe("não precisa ser o seu dia a dia");
    expect(fixAgreement("a seu problema")).toBe("o seu problema");
  });

  it("não mexe no que já está certo nem em núcleo desconhecido", () => {
    [
      "A sua reabilitação é construída fase a fase.",
      "O próximo movimento é seu.",
      "o medo de comprometer o resultado da cirurgia",
      "Sem pressa — primeiro a gente entende. Depois a gente conduz.",
    ].forEach((t) => {
      expect(fixAgreement(t)).toBe(t);
      expect(agreesWell(t)).toBe(true);
      expect(readsWell(t)).toBe(true);
    });
  });

  it("proofread limpa pontuação órfã sem quebrar a frase", () => {
    expect(proofread("Critério para avançar , sem achismo..")).toBe("Critério para avançar, sem achismo.");
  });
});
