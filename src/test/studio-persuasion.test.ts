import { describe, expect, it } from "vitest";
import { createRng } from "@/pages/studio/rng";
import { composeHeadlines, type CopyIngredients } from "@/pages/studio/phrasing";
import { BANNED_JARGON, PERSUASION_FRAMES, hasBannedJargon, isStudioSelfBrand } from "@/pages/studio/persuasion";
import { DEFAULT_REGISTER, voiceRegister } from "@/pages/studio/lexicon";
import { buildBrandContent } from "@/pages/studio-pro/brandContent";

const ing: CopyIngredients = {
  brand: "PerformaPro",
  niche: "treinamento esportivo",
  pains: ["prontuário até tarde", "agenda cheia sem retorno"],
  desires: ["atender melhor pagando menos imposto de tempo"],
  solutions: ["um plano semanal pronto"],
  keywords: ["performance", "consistência"],
};

describe("camada de persuasão do Studio", () => {
  it("frames de ponto zero entram no acervo de headlines", () => {
    const heads = composeHeadlines(ing, { register: "direto", seed: "s1" }, createRng("s1"));
    const text = heads.map((h) => `${h.strong}${h.rest}`).join(" | ").toLowerCase();
    expect(heads.length).toBeGreaterThan(20);
    // pelo menos um gatilho de curiosidade / custo / objeção
    expect(/ponto zero|custo|não tenho tempo|já tentei|volta sempre|detalhe que muda/.test(text)).toBe(true);
  });

  it("nenhuma headline gerada usa jargão de consultoria ou promessa irreal", () => {
    for (let i = 0; i < 40; i += 1) {
      const seed = `jargon:${i}`;
      const heads = composeHeadlines(ing, { register: "inspirador", seed }, createRng(seed));
      heads.forEach((h) => expect(hasBannedJargon(`${h.strong}${h.rest}`)).toBe(false));
    }
    expect(BANNED_JARGON).toContain("menos que um café");
    expect(PERSUASION_FRAMES.length).toBeGreaterThan(10);
  });

  it("postura padrão é a de sócio experiente, mas o tom do kit sobrepõe", () => {
    expect(voiceRegister(null, "qualquer")).toBe(DEFAULT_REGISTER);
    expect(voiceRegister("acolhedor, humano", "qualquer")).toBe("proximo");
  });

  it("vocabulário da ferramenta só aparece na marca Aliv.iA Studio", () => {
    expect(isStudioSelfBrand("Aliv.iA Studio")).toBe(true);
    expect(isStudioSelfBrand("PerformaPro")).toBe(false);

    const client = JSON.stringify(
      buildBrandContent({ name: "PerformaPro", niche: "treinamento" }, { seed: "k1" }),
    ).toLowerCase();
    expect(client).not.toContain("kit de marca");
    expect(client).not.toContain("sem designer");
  });
});
