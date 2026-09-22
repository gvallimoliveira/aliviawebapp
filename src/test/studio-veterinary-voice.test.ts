import { describe, expect, it } from "vitest";
import { alineProfessionalVoiceText, applyVeterinaryVoice, finalizeBrandVoice, isVeterinaryContext, removeTitleDescriptionEcho, veterinaryVoiceText } from "@/pages/studio-pro/veterinaryVoice";

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

  it("mantém o tutor como interlocutor e coloca meta, caso e evolução no pet", () => {
    expect(veterinaryVoiceText("Entendemos o cenário — o que você quer alcançar.")).toBe(
      "Entendemos o cenário — o que você observa e busca para seu pet.",
    );
    expect(veterinaryVoiceText("O trajeto que faz sentido para o seu caso, por escrito.")).toBe(
      "O trajeto que faz sentido para o caso do seu pet, por escrito.",
    );
    expect(veterinaryVoiceText("O que avançou fica, o que não avançou muda.")).toBe(
      "O que melhorou no seu pet fica; o que não melhorou orienta a mudança.",
    );
  });

  it("usa feminino nas qualidades da profissional Aline", () => {
    expect(alineProfessionalVoiceText("Direto.")).toBe("Direta.");
    expect(alineProfessionalVoiceText("Honesto")).toBe("Honesta");
    expect(alineProfessionalVoiceText("Laudo direto")).toBe("Laudo direto");
  });

  it("remove palavras repetidas de um mesmo tríptico depois da variação", () => {
    const content = finalizeBrandVoice({
      triptychs: [{
        heading: "O que você pode cobrar",
        panels: [
          { word: "Direto", line: "Explicado na sua língua." },
          { word: "Direto", line: "Uma orientação por vez." },
          { word: "Honesto", line: "O que não cabe, a gente avisa." },
        ],
      }],
    }, { brand: "Aline Furtado Vet", domain: "dermatologia veterinária" });
    expect(content.triptychs[0].panels.map((panel) => panel.word)).toEqual(["Direta", "Essencial", "Honesta"]);
  });

  it("não reinicia o corpo repetindo o título da mesma arte", () => {
    const title = "Investiga a causa raiz com exames microscópicos, laudos";
    const description = "Investiga a causa raiz com exames microscópicos, laudos claros e explicações didáticas, evitando tentativa e erro sem diagnóstico prévio.";
    const revised = removeTitleDescriptionEcho(title, description);
    expect(revised).not.toContain("Investiga a causa raiz");
    expect(revised).toBe("Laudos claros e explicações didáticas, evitando tentativa e erro sem diagnóstico prévio.");
  });

  it("aplica a antirrepetição em todos os itens estruturados da arte", () => {
    const content = finalizeBrandVoice({
      features: [{
        title: "Investiga a causa raiz com exames microscópicos, laudos",
        description: "Investiga a causa raiz com exames microscópicos, laudos claros e explicações didáticas.",
      }],
    });
    expect(content.features[0].description).not.toContain("Investiga a causa raiz");
  });

  it("não altera nenhum texto fora do domínio veterinário", () => {
    const phrase = "Você sente dor no ombro?";
    expect(applyVeterinaryVoice(phrase, false)).toBe(phrase);
  });
});