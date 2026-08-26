import { describe, expect, it } from "vitest";
import { composePage, createRng, personaForSeed } from "@/studio-core";

/**
 * GUARDA DO STUDIO INTERNO
 *
 * O Studio interno é a ferramenta pessoal do fundador: mesma seed precisa
 * reproduzir exatamente a mesma sequência de blocos/tratamentos, para sempre.
 * Se o motor for refatorado (ou compartilhado com o Studio público) e a
 * composição mudar, este teste quebra antes de qualquer arte favorita virar
 * irreproduzível.
 */
const SEEDS = ["a1b2", "zz99", "seed-interno", "4f2a"];

const signature = (seed: string) => {
  const persona = personaForSeed(seed);
  const blocks = composePage(createRng(`compose:${seed}`), persona);
  return {
    persona: persona.id,
    blocks: blocks.map((b) => `${b.kind}:${b.treatment}`),
  };
};

describe("studio-core: composição determinística", () => {
  it("mesma seed produz sempre a mesma persona e a mesma sequência", () => {
    for (const seed of SEEDS) {
      const first = signature(seed);
      const second = signature(seed);
      expect(second).toEqual(first);
    }
  });

  it("mantém o contrato estrutural: hero na abertura e closing no fim", () => {
    for (const seed of SEEDS) {
      const { blocks } = signature(seed);
      expect(blocks[0].startsWith("hero:")).toBe(true);
      expect(blocks[blocks.length - 1].startsWith("closing:")).toBe(true);
      expect(blocks.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("seeds diferentes geram composições diferentes", () => {
    const unique = new Set(SEEDS.map((seed) => signature(seed).blocks.join("|")));
    expect(unique.size).toBe(SEEDS.length);
  });
});
