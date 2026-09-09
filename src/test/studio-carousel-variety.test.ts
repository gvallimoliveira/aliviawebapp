import { describe, expect, it } from "vitest";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";

const kit = {
  name: "Guilherme Vallim Fisioterapia",
  niche: "fisioterapia esportiva",
  tone: "próximo e técnico",
  description: "Atendimento individual para dor crônica e retorno ao esporte.",
  keywords: ["dor lombar", "ombro", "corrida"],
  positioning: "Reabilitação com plano por escrito.",
};

const audiences = [
  {
    id: "dor-cronica",
    label: "Dor crônica",
    keyword: "Dor crônica",
    description: "Convive com dor há meses",
    pains: ["a dor volta sempre que aumenta o treino", "já tentou de tudo sem resultado", "tem medo de piorar"],
    desires: ["voltar a treinar sem medo", "dormir a noite inteira"],
    proof: ["avaliação completa na primeira sessão", "plano por escrito", "reavaliação a cada 4 semanas"],
    cta: "Chama no direct",
    hooks: ["Se a dor voltou", "Quando o treino dói"],
  },
];

const contentFor = (seed: string) =>
  buildSegmentContent({
    kit,
    audiences,
    segment: "dor-cronica",
    angle: "informar",
    variationSeed: seed,
  });

describe("variedade temática dos carrosséis", () => {
  it("oferece repertório com mais de um roteiro por público", () => {
    expect(contentFor("lote-1").carousels.length).toBeGreaterThanOrEqual(4);
  });

  it("troca o roteiro em destaque quando a seed do lote muda", () => {
    const titles = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((s) => contentFor(`lote-${s}`).carousels[0].title),
    );
    expect(titles.size).toBeGreaterThan(1);
  });

  it("mantém determinismo: mesma seed devolve o mesmo roteiro", () => {
    expect(contentFor("lote-x").carousels[0].title).toBe(contentFor("lote-x").carousels[0].title);
  });

  it("mantém uma identidade editorial estável para a memória entre lotes", () => {
    const ids = contentFor("lote-identidade").carousels.map((carousel) => carousel.id);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cria várias histórias completas a partir do mesmo público", () => {
    const stories = contentFor("lote-historias").stories;
    expect(stories.length).toBeGreaterThanOrEqual(5);
    expect(new Set(stories.map((story) => story.title)).size).toBe(stories.length);
    stories.forEach((story) => {
      expect(story.beats.length).toBeGreaterThanOrEqual(3);
      expect(story.turn.length).toBeGreaterThan(15);
      expect(story.moral.length).toBeGreaterThan(15);
    });
  });
});
