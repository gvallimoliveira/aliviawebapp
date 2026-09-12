import { describe, expect, it } from "vitest";
import { composeRouteCopy } from "@/pages/studio-pro/storytelling";
import type { NarrativeRoute } from "@/pages/studio-pro/synapses";

const route: NarrativeRoute = {
  kind: "pain-to-desire",
  audienceLabel: "Fisioterapeuta autônomo",
  tension: "Chegar na consulta sem saber o histórico do paciente",
  feature: "Pré-avaliação enviada por link antes do atendimento",
  proof: "Raciocínio clínico com competências do fisioterapeuta",
  desire: "Começar a sessão com o caso já organizado",
  cta: "Chamar no direct",
  signature: "pain-to-desire|pro",
  vocabulary: ["avaliacao", "historico"],
};

describe("redação a partir da rota narrativa", () => {
  it("escreve frases com a tensão e o desejo reais da rota", () => {
    const copy = composeRouteCopy(route);
    expect(copy.subs?.[0]).toMatch(/consulta|histórico/i);
    expect(copy.headlines?.[0].rest).toMatch(/caso|sessão/i);
    expect(copy.closings?.[0].cta).toBe("Chamar no direct");
    expect(copy.typos?.[0].big).toBe(copy.typos?.[0].big.toUpperCase());
  });

  it("é determinística e não inventa nada quando o kit está vazio", () => {
    expect(composeRouteCopy(route)).toEqual(composeRouteCopy(route));
    expect(
      composeRouteCopy({ ...route, tension: undefined, desire: undefined, feature: undefined, proof: undefined }),
    ).toEqual({});
  });
});
