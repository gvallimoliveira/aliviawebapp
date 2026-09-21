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
import { composeRouteCopy } from "@/pages/studio-pro/storytelling";
import { pickRelation } from "@/pages/studio-pro/relational";
import { buildBrandDna, operationWords } from "@/pages/studio-pro/brandDnaKit";
import { buildBrandContent } from "@/pages/studio-pro/brandContent";

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

  it("faz a matriz escrever as artes informativas e não apenas pesar escolhas", () => {
    const route = buildNarrativeRoute({
      audience: { id: "tutor-cronico", label: "Tutor de pet crônico", cta: "Agendar" },
      audiences: [],
      dna: { forbidden: [] },
      brand: "Dra. Aline Furtado",
      seed: "rota-publicavel",
      keywordMatrix,
      reasoningMatrix,
    });
    const copy = composeRouteCopy(route, { seed: "arte-publicavel" });
    const visible = JSON.stringify(copy);
    expect(visible).toContain("Agentes diferentes pedem condutas diferentes");
    expect(visible).toContain("Swab auricular e lâmina mostram o agente");
    expect(copy.features?.length).toBeGreaterThanOrEqual(3);
    expect(copy.lists?.[0]?.items.length).toBeGreaterThanOrEqual(2);
    const headline = `${copy.headlines?.[0]?.strong} ${copy.headlines?.[0]?.rest}`;
    expect(headline).toMatch(/Agentes diferentes pedem|O pet chacoalha a cabeça/);
    expect(headline).toMatch(/tratar a causa da otite|Agentes diferentes pedem/);
    // O apoio continua na mesma rota de raciocínio do destaque (otite/lâmina).
    expect(copy.subs?.[0]?.toLowerCase()).toMatch(/otite|lâmina|swab/);
  });

  it("prioriza a rota matricial no par relacional da arte", () => {
    const relation = pickRelation({
      audience: { id: "tutor-cronico", label: "Tutor de pet crônico", pains: ["incômodo recorrente"], desires: ["mais conforto"] },
      audiences: [],
      dna: buildBrandDna({ niche: "dermatologia veterinária" }),
      brand: "Dra. Aline Furtado",
      angle: "informar",
      seed: "relação-matricial",
      keywordMatrix,
      reasoningMatrix,
    });
    expect(relation.pain).toBe("O pet chacoalha a cabeça");
    expect(relation.desire).toBe("tratar a causa da otite");
    expect(relation.proof).toBe("Swab auricular e lâmina mostram o agente");
  });

  it("usa vocabulário veterinário sem herdar sessão ou paciente humano", () => {
    const words = operationWords(buildBrandDna({ niche: "dermatologia e citologia veterinária" }), "Dra. Aline Furtado");
    expect(words.who).toBe("tutor");
    expect(words.firstStep).toBe("primeira consulta");
    expect(`${words.who} ${words.firstStep} ${words.encounterWord}`).not.toMatch(/paciente|sessão|reavaliação/i);
  });

  it("não completa um briefing real com frases genéricas de outro assunto", () => {
    const content = buildBrandContent({
      name: "Marca especialista",
      niche: "citologia veterinária",
      description: "Descrição institucional ampla que não deve virar apoio temático.",
      briefAnswers: {
        apresentacao: "Médica veterinária especializada em investigação citológica.",
        oferta: "Citologia para orientar a decisão clínica.",
      },
    });
    expect(content.subs).toEqual([
      "Médica veterinária especializada em investigação citológica",
      "Citologia para orientar a decisão clínica",
    ]);
    expect(content.subs).not.toContain("Uma decisão bem tomada economiza meses.");
  });
});