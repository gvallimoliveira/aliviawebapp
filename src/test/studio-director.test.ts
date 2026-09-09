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
    // Os demais acervos do mundo continuam intactos.
    expect(first.features).toEqual(WORLDS.pro.features);
  });
});
