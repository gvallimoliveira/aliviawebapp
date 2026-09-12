import { describe, expect, it } from "vitest";
import { composeRouteCopy } from "@/pages/studio-pro/storytelling";
import { phraseSignature } from "@/pages/studio/picker";
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
    expect(copy.subs?.[0]).toMatch(/pré-avaliação|consulta|histórico/i);
    expect(`${copy.headlines?.[0].strong} ${copy.headlines?.[0].rest}`).toMatch(/pré-avaliação|caso|sessão/i);
    expect(copy.closings?.[0].cta).toBe("Chamar no direct");
    expect(copy.typos?.[0].big).toBe(copy.typos?.[0].big.toUpperCase());
  });

  it("é determinística e não inventa nada quando o kit está vazio", () => {
    expect(composeRouteCopy(route)).toEqual(composeRouteCopy(route));
    expect(
      composeRouteCopy({ ...route, tension: undefined, desire: undefined, feature: undefined, proof: undefined }),
    ).toEqual({});
  });

  it("troca a construção textual entre sementes sem trocar a matéria-prima", () => {
    const copies = Array.from({ length: 12 }, (_, index) => composeRouteCopy(route, { seed: `lote:${index}` }));
    const headlines = copies.map((copy) => `${copy.headlines?.[0].strong} ${copy.headlines?.[0].rest}`);
    const supports = copies.map((copy) => copy.subs?.[0]);
    expect(new Set(headlines).size).toBeGreaterThanOrEqual(4);
    expect(new Set(supports).size).toBeGreaterThanOrEqual(4);
    copies.forEach((copy) => {
      expect(JSON.stringify(copy).toLowerCase()).not.toMatch(/milagre|garantia|cura/);
    });
  });

  it("faz um molde já usado ceder espaço mesmo com a mesma semente", () => {
    const first = composeRouteCopy(route, { seed: "memoria" });
    const used = new Set<string>();
    const collect = (value: unknown) => {
      if (typeof value === "string") used.add(phraseSignature(value));
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(collect);
    };
    collect(first);
    const second = composeRouteCopy(route, {
      seed: "memoria",
      weightOf: (signature) => used.has(signature) ? 0.02 : 1,
    });
    expect(second.headlines?.[0]).not.toEqual(first.headlines?.[0]);
    expect(second.subs?.[0]).not.toEqual(first.subs?.[0]);
  });
});
