import { describe, expect, it } from "vitest";
import { composeAuthorial, fragmentsOf, type AuthorialText } from "@/pages/studio-pro/authorial";

/**
 * GUARDA DO MODO AUTORAL
 *
 * Regras que não podem regredir: a arte nunca mistura textos diferentes, nunca
 * usa fragmentos fora de ordem/não contíguos e nunca inventa palavra alguma.
 */
const TEXT_A = `Amei como quem entra no mar sem medir a profundidade.

Depois vieram os dias em que o silêncio era mais alto que qualquer briga.

Aprendi que saudade não é falta: é presença insistindo em ficar.`;

const TEXT_B = `Você me perguntou se doeu.

Doeu como dói acordar com a mão procurando alguém que já não mora aqui.`;

const texts: AuthorialText[] = [
  { id: "a", title: "Mar aberto", body: TEXT_A, sortOrder: 0 },
  { id: "b", title: "Se doeu", body: TEXT_B, sortOrder: 1 },
];

const SLOGAN = "Crônicas de amor e de dor.";

describe("modo autoral", () => {
  it("fragmenta por parágrafo preservando o texto do autor", () => {
    const frags = fragmentsOf(TEXT_A);
    expect(frags).toHaveLength(3);
    frags.forEach((f) => expect(TEXT_A).toContain(f));
  });

  it("nunca mistura textos nem quebra a ordem/contiguidade", () => {
    for (let s = 0; s < 60; s += 1) {
      const arts = composeAuthorial({
        texts,
        slogans: [SLOGAN],
        seed: `seed-${s}`,
        photoIds: ["p1"],
        count: 8,
      });
      arts.forEach((art) => {
        const lines = art.slides.flatMap((slide) => slide.lines);
        if (art.kind === "slogan") {
          expect(lines).toEqual([SLOGAN]);
          return;
        }
        const source = texts.find((t) => t.id === art.textId);
        expect(source).toBeTruthy();
        const frags = fragmentsOf(source!.body);
        // Todo trecho vem do MESMO texto…
        lines.forEach((line) => expect(frags).toContain(line));
        // …e na ordem original, sem saltos.
        const positions = lines.map((line) => frags.indexOf(line));
        positions.forEach((pos, i) => {
          if (i > 0) expect(pos).toBe(positions[i - 1] + 1);
        });
      });
    }
  });

  it("é determinístico: mesma seed, mesmo lote", () => {
    const args = { texts, slogans: [SLOGAN], seed: "fixa", photoIds: [], count: 6 };
    expect(composeAuthorial(args)).toEqual(composeAuthorial(args));
  });

  it("respeita o filtro por texto escolhido", () => {
    const arts = composeAuthorial({
      texts,
      slogans: [],
      seed: "filtro",
      photoIds: [],
      count: 8,
      onlyTextId: "b",
    });
    expect(arts.length).toBeGreaterThan(0);
    arts.forEach((art) => expect(art.textId).toBe("b"));
  });
});
