import { describe, expect, it } from "vitest";
import {
  keywordMatrixFromText,
  keywordMatrixToText,
  pickMatrixContext,
  readKeywordMatrix,
  reasoningMatrixFromText,
  reasoningMatrixToText,
} from "@/pages/studio-pro/contentMatrices";
import { buildNarrativeRoute } from "@/pages/studio-pro/synapses";

const keywordMatrix = [
  { id: "otite", term: "Otite externa", perception: "chacoalhar a cabeça e coçar a orelha", audienceIds: ["tutor-cronico"], theme: "otite" },
  { id: "paaf", term: "PAAF", perception: "investigar o carocinho antes de supor", audienceIds: ["tutor-preventivo"], theme: "nodulo" },
];
const reasoningMatrix = [
  { id: "otite-route", audienceIds: ["tutor-cronico"], scene: "O pet chacoalha a cabeça", mechanism: "Agentes diferentes pedem condutas diferentes", bridge: "Swab auricular e lâmina mostram o agente", outcome: "tratar a causa da otite", cta: "Agendar investigação", theme: "otite" },
  { id: "nodulo-route", audienceIds: ["tutor-preventivo"], scene: "Apareceu um nódulo", mechanism: "O toque não diferencia todos os nódulos", bridge: "A PAAF examina as células", outcome: "decidir com mais precisão", cta: "Agendar citologia", theme: "nodulo" },
];

describe("matrizes de conteúdo do Studio", () => {
  it("lê, serializa e recupera as duas matrizes", () => {
    expect(readKeywordMatrix(keywordMatrix)).toHaveLength(2);
    expect(keywordMatrixFromText(keywordMatrixToText(keywordMatrix)).map(({ id: _id, ...entry }) => entry))
      .toEqual(keywordMatrix.map(({ id: _id, ...entry }) => entry));
    expect(reasoningMatrixFromText(reasoningMatrixToText(reasoningMatrix)).map(({ id: _id, ...entry }) => entry))
      .toEqual(reasoningMatrix.map(({ id: _id, ...entry }) => entry));
  });

  it("mantém público, tema e escolha determinística", () => {
    const input = { keywordMatrix, reasoningMatrix, audienceId: "tutor-cronico", seed: "mesma-seed" };
    const first = pickMatrixContext(input);
    expect(pickMatrixContext(input)).toEqual(first);
    expect(first.lexical?.id).toBe("otite");
    expect(first.reasoning?.id).toBe("otite-route");
  });

  it("entrega o binômio técnico-perceptivo e o raciocínio completo à rota", () => {
    const route = buildNarrativeRoute({
      audience: { id: "tutor-cronico", label: "Tutor de pet crônico", cta: "Agendar" },
      audiences: [],
      dna: { forbidden: [] },
      brand: "Dra. Aline Furtado",
      seed: "rota-aline",
      keywordMatrix,
      reasoningMatrix,
    });
    expect(route.lexicalTerm).toBe("Otite externa");
    expect(route.lexicalPerception).toContain("chacoalhar");
    expect(route.feature).toContain("Agentes diferentes");
    expect(route.proof).toContain("Swab auricular");
    expect(route.cta).toBe("Agendar investigação");
  });
});