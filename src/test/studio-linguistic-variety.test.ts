import { describe, expect, it } from "vitest";
import { buildBrandContent, buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { applyLexicon, voiceRegister, VOICE_REGISTERS } from "@/pages/studio/lexicon";
import { varyContent } from "@/pages/studio/vary";
import { phraseSignature } from "@/pages/studio/picker";
import { GLOBAL_SEGMENT } from "@/pages/studio-pro/audiences";

const KIT = {
  name: "PerformaPro",
  niche: "treinamento de alta performance",
  tone: "técnico, direto, sem rodeio",
  description: "Treino individualizado com avaliação de força e acompanhamento semanal.",
  keywords: ["força", "performance", "avaliação"],
};

const AUDIENCES = [
  {
    id: "atleta",
    label: "Atleta amador",
    pains: ["Treino genérico", "Estagnou nos resultados"],
    desires: ["Evolução mensurável", "Treino feito para o seu corpo"],
    proof: ["Avaliação de força a cada ciclo"],
    cta: "Quero minha avaliação",
  },
];

const contentFor = (seed: string) =>
  varyContent(
    buildSegmentContent({
      kit: KIT,
      audiences: AUDIENCES,
      segment: GLOBAL_SEGMENT,
      angle: "informar",
      variationSeed: seed,
    }),
    { register: voiceRegister(KIT.tone, KIT.name), seed, forbidden: ["aliv.ia", "alivia", "fisioterap"] },
  );

describe("variedade linguística do motor criativo", () => {
  it("gera muitas headlines distintas ao longo das seeds", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i += 1) {
      contentFor(`brand:${i}`).headlines.forEach((h) => seen.add(`${h.strong}|${h.rest}`));
    }
    // Antes eram 5 headlines fixas por marca.
    expect(seen.size).toBeGreaterThan(120);
  }, 30_000);

  it("mantém a mesma arte para a mesma seed (determinismo)", () => {
    expect(JSON.stringify(contentFor("estavel"))).toBe(JSON.stringify(contentFor("estavel")));
  });

  it("nunca renderiza o texto do tom de voz como frase", () => {
    const json = JSON.stringify(contentFor("tom")).toLowerCase();
    expect(json).not.toContain("sem rodeio");
  });

  it("não introduz literais de outra marca nem jargão clínico", () => {
    for (let i = 0; i < 60; i += 1) {
      const json = JSON.stringify(contentFor(`iso:${i}`)).toLowerCase();
      expect(json).not.toContain("aliv.ia");
      expect(json).not.toContain("fisioterap");
    }
  });

  it("respeita limites de tamanho das frases", () => {
    for (let i = 0; i < 40; i += 1) {
      contentFor(`len:${i}`).headlines.forEach((h) => {
        expect(`${h.strong}${h.rest}`.length).toBeLessThanOrEqual(160);
      });
    }
  });

  it("classifica o registro de voz a partir do tom declarado", () => {
    expect(voiceRegister("linguagem técnica e científica")).toBe("tecnico");
    expect(voiceRegister("acolhedor, humano e leve")).toBe("proximo");
    expect(VOICE_REGISTERS).toContain(voiceRegister(null, "MarcaX"));
  });

  it("troca palavras por sinônimos preservando capitalização", () => {
    const outs = new Set<string>();
    for (let i = 0; i < 40; i += 1) {
      outs.add(applyLexicon("Clareza gera resultado.", { register: "tecnico", seed: `s${i}` }));
    }
    expect(outs.size).toBeGreaterThan(2);
    outs.forEach((text) => expect(text[0]).toBe(text[0].toUpperCase()));
  });

  it("mantém o acervo fixo quando não há semente de variação (compatibilidade)", () => {
    expect(buildBrandContent(KIT).headlines).toHaveLength(5);
  });

  it("assinatura de frase é estável e sensível ao texto", () => {
    const a = { strong: "Clareza", rest: " gera resultado." };
    expect(phraseSignature(a)).toBe(phraseSignature({ ...a }));
    expect(phraseSignature(a)).not.toBe(phraseSignature({ strong: "Método", rest: " gera resultado." }));
  });
});
