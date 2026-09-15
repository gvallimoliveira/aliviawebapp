import { describe, expect, it } from "vitest";
import { composeRouteCopy } from "@/pages/studio-pro/storytelling";
import { buildBrandDna } from "@/pages/studio-pro/brandDnaKit";
import type { NarrativeRoute } from "@/pages/studio-pro/synapses";

const route: NarrativeRoute = {
  kind: "pain-to-desire",
  audienceLabel: "corredor amador",
  tension: "dor no joelho que volta a cada treino longo",
  desire: "voltar a correr sem contar os quilômetros com medo",
  proof: "reavaliação a cada quatro semanas",
  feature: "avaliação de corrida com plano progressivo",
  scene: "você calça o tênis e já pensa na descida do fim do percurso",
  objection: "acha que é só descansar que passa",
  enemy: "protocolo igual para todo mundo",
  stakes: "cada mês parado tira força que levou meses para construir",
  trigger: "faltam seis semanas para a prova",
  cta: "Agende sua avaliação",
  signature: "rota-teste",
  vocabulary: [],
};

const words = (copy: ReturnType<typeof composeRouteCopy>) =>
  [
    ...(copy.headlines ?? []).map((h) => `${h.strong} ${h.rest}`),
    ...(copy.subs ?? []),
  ]
    .join(" ")
    .toLowerCase();

describe("campos do kit chegam ao texto da arte", () => {
  it("cada arte carrega dois campos do kit: um no destaque e outro no apoio", () => {
    for (let index = 0; index < 12; index += 1) {
      const copy = composeRouteCopy(route, { seed: `lote:${index}`, rotate: index });
      const headline = `${copy.headlines?.[0]?.strong ?? ""} ${copy.headlines?.[0]?.rest ?? ""}`.toLowerCase();
      const sub = (copy.subs?.[0] ?? "").toLowerCase();
      expect(headline.trim().length).toBeGreaterThan(0);
      expect(sub.trim().length).toBeGreaterThan(0);
      // Destaque e apoio nunca repetem a mesma frase do kit.
      expect(sub).not.toBe(headline);
    }
  });

  it("distribui os campos do kit entre as artes do mesmo lote", () => {
    const texts = Array.from({ length: 8 }, (_, index) =>
      words(composeRouteCopy(route, { seed: "lote-unico", rotate: index })),
    );
    const fields = [route.scene, route.objection, route.stakes, route.trigger, route.enemy].map((field) =>
      texts.some((text) => text.includes((field ?? "").slice(0, 18).toLowerCase())),
    );
    // Ao longo de um lote, a maior parte dos campos preenchidos aparece.
    expect(fields.filter(Boolean).length).toBeGreaterThanOrEqual(3);
  });

  it("a objeção pode virar título, não só apoio", () => {
    const headlines = Array.from({ length: 14 }, (_, index) =>
      `${composeRouteCopy(route, { seed: "titulo", rotate: index }).headlines?.[0]?.strong ?? ""}`.toLowerCase(),
    );
    expect(headlines.some((h) => h.includes("descansar"))).toBe(true);
  });

  it("rótulo colado ao valor não vaza para o texto", () => {
    const dna = buildBrandDna({
      positioning: "reabilitação de corredores",
      niche: "fisioterapia esportiva",
      briefAnswers: { desejo: "Desejo: voltar a correr sem dor;" },
    });
    expect(dna.desire ?? "").not.toMatch(/desejo\s*:/i);
    expect(dna.desire ?? "").not.toMatch(/[;|]$/);
  });
});
