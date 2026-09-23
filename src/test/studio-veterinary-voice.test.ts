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

  it("varia os conectores do corpo sem usar a mesma muleta textual", () => {
    const examples = [
      removeTitleDescriptionEcho("Investigar antes de tratar", "Investigar antes de tratar reduz tentativas sem direção."),
      removeTitleDescriptionEcho("Reconhecer o agente muda a escolha", "Reconhecer o agente muda a escolha direciona uma conduta mais precisa."),
      removeTitleDescriptionEcho("Cada sinal acrescenta uma pista", "Cada sinal acrescenta uma pista organiza a investigação do quadro."),
      removeTitleDescriptionEcho("A citologia orienta a decisão", "A citologia orienta a decisão evita escolhas feitas no escuro."),
    ];
    expect(new Set(examples.map((text) => text.split(",")[0])).size).toBeGreaterThan(1);
    expect(examples.every((text) => !/^A partir disso/i.test(text))).toBe(true);
  });

  it("recompõe locuções cortadas entre o título e o corpo", () => {
    expect(removeTitleDescriptionEcho(
      "Encontrar a causa com precisão, controlar a qualidade",
      "Encontrar a causa com precisão, controlar a qualidade de vida do animal e decidir com clareza.",
    )).toBe("Qualidade de vida do animal e decidir com clareza.");
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

  it("não deixa o nome interno do recorte de slogan aparecer na arte", () => {
    const content = finalizeBrandVoice({
      kickers: ["SLOGAN EM DESTAQUE", "PARA SLOGAN EM DESTAQUE", "SLOGAN EM DESTAQUE · TESTE"],
    }, { brand: "Dra. Aline Furtado" });
    expect(content.kickers).toEqual([
      "Dra. Aline Furtado",
      "Dra. Aline Furtado",
      "Dra. Aline Furtado",
    ]);
  });

  it("troca animal por um termo natural na palavra-cartaz veterinária", () => {
    const generic = finalizeBrandVoice({ kinetic: [{ kicker: "Cuidado", word: "ANIMAL", caption: "Saúde do pet" }] }, { domain: "veterinária" });
    const feline = finalizeBrandVoice({ kinetic: [{ kicker: "Cuidado", word: "ANIMAL", caption: "Dermatologia felina" }] }, { domain: "veterinária" });
    expect(generic.kinetic[0].word).toBe("Pet");
    expect(feline.kinetic[0].word).toBe("Gatos");
  });

  it("oferece pares de placas específicos e coerentes para a Aline", () => {
    const content = finalizeBrandVoice({ compare: [] as Array<{ title: string; before: string[]; after: string[] }> }, {
      brand: "Dra. Aline Furtado",
      domain: "veterinária",
    });
    expect(content.compare).toHaveLength(5);
    expect(content.compare[0].before[0]).toContain("Pet com alergia");
    expect(content.compare[0].after[0]).toContain("qualidade de vida");
    expect(content.compare[1].before[0]).toContain("qual infecção");
    expect(content.compare[1].after[0]).toContain("Citologia especializada");
  });

  it("não altera nenhum texto fora do domínio veterinário", () => {
    const phrase = "Você sente dor no ombro?";
    expect(applyVeterinaryVoice(phrase, false)).toBe(phrase);
  });

  it("aplica os guardas gerais também em marca não veterinária", () => {
    const content = finalizeBrandVoice({
      hooks: [{
        hook: "Provocação",
        strong: "Pare de",
        rest: ".",
        sub: "SUA escada da sua casa virou escolha difícil.",
        cta: "Agendar avaliação",
      }],
      quotes: [{ text: '"" "Ninguém me explicou de onde vem essa dor."' }],
    }, { brand: "Guilherme Vallim Fisioterapia", domain: "fisioterapia" });

    expect(content.hooks[0].strong).not.toMatch(/^pare de[.!?]?$/i);
    expect(`${content.hooks[0].strong} ${content.hooks[0].sub}`).not.toContain("SUA");
    expect(`${content.hooks[0].strong} ${content.hooks[0].sub}`).not.toMatch(/sua\s+escada\s+da\s+sua\s+casa/i);
    expect(content.hooks[0].strong).toContain("A escada da sua casa");
    expect(content.hooks[0].sub).toBe("");
    expect(content.quotes[0].text).not.toMatch(/^["“”]{2}/);
  });

  it("remove possessivo duplicado em qualquer texto visível", () => {
    const content = finalizeBrandVoice({
      carousels: [{
        kicker: "Dor persistente",
        title: "Entenda o sinal",
        coverSub: "O que ninguém te explicou sobre sua sua dor",
        slides: [],
        cta: { title: "Próximo passo", sub: "Agende uma avaliação" },
      }],
    }, { brand: "Guilherme Vallim Fisioterapia", domain: "fisioterapia" });

    expect(content.carousels[0].coverSub).toBe("O que ninguém te explicou sobre sua dor");
  });
});