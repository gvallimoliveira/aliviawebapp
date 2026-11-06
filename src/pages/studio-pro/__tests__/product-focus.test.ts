import { describe, expect, it } from "vitest";
import { productUnitPlan, productFactsFor, isSoftwareProduct } from "../productFocus";
import { buildBrandDna } from "../brandDnaKit";
import { buildSegmentContent } from "../brandContent";
import { planBatch } from "../director";
import { WORLDS } from "@/pages/studio/content";
import type { BrandAudience } from "../audiences";

const audience: BrandAudience = { id: "pro", label: "Profissional", proof: ["Comparação bilateral de termografia", "Graduação Doppler assistida"], desires: ["Comparar termografia bilateral"], pains: ["Dor no joelho"], cta: "Conheça a plataforma" };
const kit = { name: "Produto novo", description: "Software de análise de exames de imagem.", briefAnswers: { oferta: "Análise assistida de termografia; Relatórios assinados", diferencial: "Julgamento clínico preservado" } };
const dna = buildBrandDna(kit);

describe("foco de divulgação de produtos", () => {
  it("reserva 90% das unidades e arredonda lotes pequenos para cima", () => {
    expect(productUnitPlan(10).filter(Boolean)).toHaveLength(9);
    expect(productUnitPlan(20).filter(Boolean)).toHaveLength(18);
    expect(productUnitPlan(3).filter(Boolean)).toHaveLength(3);
  });
  it("não classifica atendimento clínico como software", () => {
    expect(isSoftwareProduct(buildBrandDna({ description: "Fisioterapia em consultório" }))).toBe(false);
    expect(isSoftwareProduct(undefined, "", "Aliv.iA")).toBe(true);
  });
  it("extrai capacidades declaradas, não sintomas nem objeções", () => {
    const facts = productFactsFor(WORLDS.pro, dna, audience, kit.name);
    expect(facts.some((fact) => fact.title === "Graduação Doppler assistida")).toBe(true);
    expect(facts.some((fact) => fact.title === "Dor no joelho")).toBe(false);
  });
  it("preserva a origem de tópicos do acervo oficial e ignora oferta global", () => {
    expect(productFactsFor(WORLDS.pro, dna, audience, "Aliv.iA").map((fact) => fact.topic)).toEqual(WORLDS.pro.features.map((fact) => fact.topic));
  });
  it("mantém 9 de 10 peças ligadas ao produto sem alterar o kit", () => {
    const content = buildSegmentContent({ kit, audiences: [audience], segment: "pro", angle: "dor", variationSeed: "produto" });
    const before = JSON.stringify(content);
    const input = { content, count: 10, dna, brandName: kit.name, seed: "produto" };
    const direction = planBatch(input);
    expect(direction.shots.filter((shot) => shot.productFocused)).toHaveLength(9);
    expect(direction.shots.map((shot) => shot.reserved)).toEqual(planBatch(input).shots.map((shot) => shot.reserved));
    expect(JSON.stringify(content)).toBe(before);
    expect(direction.contentFor(0).features[0].title).not.toBe("Dor no joelho");
  });
  it("conta os slides do carrossel como uma única unidade", () => {
    const blocks = Array.from({ length: 14 }, (_, index) => index < 5
      ? { kind: "carousel", slide: { group: 0, index, total: 5, script: 0 } }
      : { kind: "hero" }) as Parameters<typeof planBatch>[0]["blocks"];
    const direction = planBatch({ content: WORLDS.pro, blocks, count: 14, brandName: "Aliv.iA", seed: "carrossel-produto" });
    expect(direction.shots.slice(0, 5).every((shot) => shot.productFocused)).toBe(true);
    expect(direction.shots.slice(5).filter((shot) => shot.productFocused)).toHaveLength(8);
  });
  it("não inventa fatos para software com kit vazio", () => {
    expect(productFactsFor(WORLDS.pro, { forbidden: [] }, undefined, "Novo software")).toEqual([]);
  });
});