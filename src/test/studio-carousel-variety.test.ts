import { describe, expect, it } from "vitest";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { carouselClosingCopy, carouselTweetCopy } from "@/pages/studio/typographyGuards";

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
  it("mantém o fechamento curto e descarta a cauda de objeções", () => {
    const closing = carouselClosingCopy(
      "Profissional quer receber o paciente com avaliação pronta e mostrar evolução. Objeções mais comuns: é mais um sistema",
      "Aplicar no caso de amanhã",
    );
    expect(closing.title).toBe("Quer receber o paciente com avaliação pronta?");
    expect(closing.support).toBe("Aplicar no caso de amanhã");
  });

  it("mantém cada tweet curto, completo e sem conectivo pendurado", () => {
    const post = carouselTweetCopy(
      "Uma provocação objetiva que abre o assunto sem transformar a capa em um parágrafo longo demais",
      "A continuação desenvolve uma única ideia com informação suficiente para conduzir ao próximo post e",
    );
    expect(post.title.length).toBeLessThanOrEqual(64);
    expect(post.support.length).toBeLessThanOrEqual(116);
    expect(post.title).not.toMatch(/\b(?:e|de|da|do|que|para)$/i);
    expect(post.support).not.toMatch(/\b(?:e|de|da|do|que|para)$/i);
  });

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
