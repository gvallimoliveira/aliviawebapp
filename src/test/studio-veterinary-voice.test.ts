import { describe, expect, it } from "vitest";
import { applyVeterinaryVoice, isVeterinaryContext, veterinaryVoiceText } from "@/pages/studio-pro/veterinaryVoice";

describe("Studio: tutor leitor e animal paciente", () => {
  it("reconhece marcas veterinárias sem ativar a regra em outras áreas", () => {
    expect(isVeterinaryContext("dermatologia e citologia veterinária")).toBe(true);
    expect(isVeterinaryContext("fisioterapia esportiva")).toBe(false);
  });

  it("atribui sintomas e achados ao pet, não ao tutor", () => {
    expect(veterinaryVoiceText("Você sente coceira e tem otite recorrente?")).toBe("Seu pet sente coceira e tem otite recorrente?");
    expect(veterinaryVoiceText("Seus sintomas merecem investigação")).toBe("Os sintomas do seu pet merecem investigação");
    expect(veterinaryVoiceText("A sua dermatite voltou")).toBe("A dermatite do seu pet voltou");
  });

  it("mantém o tutor como observador e decisor", () => {
    const content = applyVeterinaryVoice({
      headline: "Você percebeu coceira no seu cão?",
      clinical: "O que você sente hoje orienta o exame",
      cta: "Agende a citologia do seu pet",
    }, true);
    expect(content.headline).toBe("Você percebeu coceira no seu cão?");
    expect(content.clinical).toBe("O que seu pet apresenta hoje orienta o exame");
    expect(content.cta).toBe("Agende a citologia do seu pet");
  });

  it("não altera nenhum texto fora do domínio veterinário", () => {
    const phrase = "Você sente dor no ombro?";
    expect(applyVeterinaryVoice(phrase, false)).toBe(phrase);
  });
});