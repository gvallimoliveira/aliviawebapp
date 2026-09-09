/**
 * DIRETOR CRIATIVO DO STUDIO — garantias do roteiro do lote.
 *
 * O motivo do diretor existir: artes diferentes da MESMA leva repetiam frase.
 * Estes testes travam isso e travam também o determinismo (mesma seed ⇒ mesmo
 * roteiro), que é o que faz a arte baixada ser igual à vista na tela.
 */

import { describe, expect, it } from "vitest";
import { WORLDS } from "@/pages/studio/content";
import { planBatch } from "@/pages/studio-pro/director";
import { composePage } from "@/pages/studio/composePage";
import { createRng } from "@/pages/studio/rng";

const plan = (seed: string, count = 8) =>
  planBatch({ content: WORLDS.pro, count, seed, relation: { pain: "dor que trava", axis: "pain" } });

describe("Diretor criativo", () => {
  it("mesma seed devolve o mesmo roteiro", () => {
    expect(plan("lote-1").shots.map((s) => s.copy.join("|"))).toEqual(
      plan("lote-1").shots.map((s) => s.copy.join("|")),
    );
  });

  it("seeds diferentes mudam o roteiro", () => {
    expect(plan("lote-1").shots[0].copy.join("|")).not.toBe(plan("lote-2").shots[0].copy.join("|"));
  });

  it("nenhuma frase de destaque se repete dentro do lote", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      const heads = plan(seed).shots.map((s) => `${s.headlines[0].strong} ${s.headlines[0].rest}`);
      expect(new Set(heads).size).toBe(heads.length);
    }
  });

  it("cada arte recebe um eixo de comunicação e sai com texto previsto", () => {
    const shots = plan("eixos", 7).shots;
    expect(new Set(shots.map((s) => s.axis)).size).toBe(7);
    shots.forEach((shot) => {
      expect(shot.copy.length).toBeGreaterThan(0);
      expect(shot.affinity.length).toBeGreaterThan(0);
    });
  });

  it("o conteúdo dirigido só oferece os slots reservados da arte", () => {
    const direction = plan("slots", 4);
    const first = direction.contentFor(0);
    const second = direction.contentFor(1);
    expect(first.headlines.length).toBeLessThanOrEqual(2);
    expect(first.headlines[0]).not.toEqual(second.headlines[0]);
    // Cartazes também são dirigidos: artes diferentes não repetem o mesmo.
    expect(first.features.length).toBeLessThan(WORLDS.pro.features.length);
    expect(first.features[0]).not.toEqual(second.features[0]);
    // Acervos de dado real (números com fonte) seguem intactos.
    expect(first.stats).toEqual(WORLDS.pro.stats);
    expect(first.metrics).toEqual(WORLDS.pro.metrics);
  });

  it("as linhas de venda também giram entre as artes do lote", () => {
    const direction = plan("vendas", 5);
    const ctas = direction.shots.map((_, i) => direction.contentFor(i).sales.ctas[0]);
    expect(new Set(ctas).size).toBeGreaterThan(1);
  });

  it("a memória da marca desloca a escolha sem quebrar o determinismo", () => {
    const heavy = new Set<string>();
    const first = planBatch({ content: WORLDS.pro, count: 6, seed: "memoria" });
    first.shots.forEach((shot) => shot.copy.forEach((line) => heavy.add(line)));
    const after = planBatch({
      content: WORLDS.pro,
      count: 6,
      seed: "memoria",
      weightOf: () => 1,
    });
    expect(after.shots[0].copy.join("|")).toBe(first.shots[0].copy.join("|"));
  });

  it("reserva um roteiro diferente para cada grupo de carrossel", () => {
    const blocks = composePage(
      createRng("carrosseis"),
      undefined,
      undefined,
      WORLDS.pro.carousels,
      0,
      ["carousel"],
    );
    const direction = planBatch({ content: WORLDS.pro, count: blocks.length, blocks, seed: "carrosseis" });
    const titles = new Map<number, string>();
    blocks.forEach((block, index) => {
      if (block.kind !== "carousel" || !block.slide) return;
      const title = direction.contentFor(index).carousels[0]?.title;
      expect(title).toBeTruthy();
      const previous = titles.get(block.slide.group);
      if (previous) expect(title).toBe(previous);
      else titles.set(block.slide.group, title);
    });
    expect(new Set(titles.values()).size).toBe(titles.size);
    expect(titles.size).toBeLessThanOrEqual(WORLDS.pro.carousels.length);
  });

  it("inclui o texto visível dos carrosséis na memória do lote", () => {
    const blocks = composePage(createRng("memoria-carrossel"), undefined, undefined, WORLDS.pro.carousels, 0, ["carousel"]);
    const direction = planBatch({ content: WORLDS.pro, count: blocks.length, blocks, seed: "memoria-carrossel" });
    blocks.forEach((block, index) => {
      if (block.kind !== "carousel") return;
      expect(direction.copyOf(index).length).toBeGreaterThan(0);
      expect(direction.shotFor(index)?.headlines).toHaveLength(0);
    });
  });
});

