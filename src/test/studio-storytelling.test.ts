import { describe, expect, it } from "vitest";
import { composeRouteCopy } from "@/pages/studio-pro/storytelling";
import { phraseSignature } from "@/pages/studio/picker";
import type { NarrativeRoute } from "@/pages/studio-pro/synapses";
import { joinCopyParts, quoteCopy } from "@/pages/studio/typographyGuards";
import { buildHook, HOOK_TYPES } from "@/pages/studio-pro/hookTaxonomy";

const route: NarrativeRoute = {
  kind: "pain-to-desire",
  audienceLabel: "Fisioterapeuta autônomo",
  tension: "Chegar na consulta sem saber o histórico do paciente",
  feature: "Pré-avaliação enviada por link antes do atendimento",
  proof: "Raciocínio clínico com competências do fisioterapeuta",
  desire: "Começar a sessão com o caso já organizado",
  cta: "Chamar no direct",
  signature: "pain-to-desire|pro",
  vocabulary: ["avaliacao", "historico"],
};

describe("redação a partir da rota narrativa", () => {
  it("une partes editoriais com espaço entre palavras e sem espaço antes da pontuação", () => {
    expect(joinCopyParts("Carga não é", "achismo")).toBe("Carga não é achismo");
    expect(joinCopyParts("Não é sorte", ". É critério.")).toBe("Não é sorte. É critério.");
  });

  it("mantém uma única ideia completa nas artes de citação", () => {
    const quote = quoteCopy("Coceira merece investigação. Otite recorrente pede citologia. Nódulos também precisam de resposta.", 54);
    expect(quote).toBe("“Coceira merece investigação.”");
    expect(quote).not.toMatch(/Otite|Nódulos/);
  });

  it("escreve frases com a tensão e o desejo reais da rota", () => {
    const copy = composeRouteCopy(route);
    expect(copy.subs?.[0]).toMatch(/pré-avaliação|consulta|histórico/i);
    expect(`${copy.headlines?.[0].strong} ${copy.headlines?.[0].rest}`).toMatch(/pré-avaliação|caso|sessão/i);
    expect(copy.closings?.[0].cta).toBe("Chamar no direct");
    expect(copy.typos?.[0].big).toBe(copy.typos?.[0].big.toUpperCase());
  });

  it("é determinística e não inventa nada quando o kit está vazio", () => {
    expect(composeRouteCopy(route)).toEqual(composeRouteCopy(route));
    expect(
      composeRouteCopy({ ...route, tension: undefined, desire: undefined, feature: undefined, proof: undefined }),
    ).toEqual({});
  });

  it("troca a construção textual entre sementes sem trocar a matéria-prima", () => {
    const copies = Array.from({ length: 12 }, (_, index) => composeRouteCopy(route, { seed: `lote:${index}` }));
    const headlines = copies.map((copy) => `${copy.headlines?.[0].strong} ${copy.headlines?.[0].rest}`);
    const supports = copies.map((copy) => copy.subs?.[0]);
    expect(new Set(headlines).size).toBeGreaterThanOrEqual(4);
    expect(new Set(supports).size).toBeGreaterThanOrEqual(4);
    copies.forEach((copy) => {
      expect(JSON.stringify(copy).toLowerCase()).not.toMatch(/milagre|garantia|cura/);
    });
  });

  it("faz um molde já usado ceder espaço mesmo com a mesma semente", () => {
    const first = composeRouteCopy(route, { seed: "memoria" });
    const used = new Set<string>();
    const collect = (value: unknown) => {
      if (typeof value === "string") used.add(phraseSignature(value));
      else if (Array.isArray(value)) value.forEach(collect);
      else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach(collect);
    };
    collect(first);
    const second = composeRouteCopy(route, {
      seed: "memoria",
      weightOf: (signature) => used.has(signature) ? 0.02 : 1,
    });
    expect(second.headlines?.[0]).not.toEqual(first.headlines?.[0]);
    expect(second.subs?.[0]).not.toEqual(first.subs?.[0]);
  });

  it("explica o método sem conectá-lo a uma funcionalidade aleatória", () => {
    const withMethod: NarrativeRoute = {
      ...route,
      methodPlain: "Onde dói, quando dói e o que faz doer",
      feature: "Vitrine de fisioterapeutas para continuar o cuidado",
    };
    const copies = Array.from({ length: 24 }, (_, index) =>
      composeRouteCopy(withMethod, { seed: `metodo:${index}`, rotate: index }),
    );
    const supports = copies.map((copy) => copy.subs?.[0] ?? "");
    const methodSupports = supports.filter((support) => /onde dói/i.test(support));

    expect(methodSupports.length).toBeGreaterThan(0);
    methodSupports.forEach((support) => {
      expect(support).toMatch(/decisão clínica/i);
      expect(support).not.toMatch(/é assim que vitrine|vitrine.+funciona na prática/i);
    });
  });

  it("fecha começo, meio e fim na rota veterinária sem título ou lista pendurados", () => {
    const veterinary: NarrativeRoute = {
      ...route,
      audienceLabel: "Tutor de pet",
      tension: "Outra noite sem dormir por causa",
      scene: "O cão sacode a cabeça e não deixa o tutor dormir",
      trigger: "A otite voltou durante a noite",
      feature: "ácaros, leveduras, cocos e bastonetes",
      proof: "Swab auricular e leitura da lâmina identificam o agente presente",
      desire: "conduzir a otite conforme a causa",
      cta: "Agende a investigação da otite do seu pet",
    };
    const copies = Array.from({ length: 20 }, (_, index) =>
      composeRouteCopy(veterinary, { seed: `otite:${index}`, rotate: index }),
    );
    copies.forEach((copy) => {
      const headline = `${copy.headlines?.[0]?.strong ?? ""} ${copy.headlines?.[0]?.rest ?? ""}`.trim();
      expect(headline).not.toMatch(/por causa\s*$/i);
      expect(headline).not.toMatch(/é (?:a )?hora de ácaros/i);
      expect(copy.subs?.[0]).toMatch(/cão|otite|agentes|swab|lâmina|investig/i);
      expect(copy.closings?.[0]?.sub).toMatch(/base|esclarece|decisão/i);
      expect(copy.closings?.[0]?.sub).not.toMatch(/é isso que dá\s*$/i);
    });
  });

  it("preserva completo um fechamento causal acima do limite antigo", () => {
    const longClosing: NarrativeRoute = {
      ...route,
      proof: "Laudo descritivo e discussão técnica apoiam a decisão e preservam o vínculo com o clínico de origem",
      desire: "conduzir o caso complexo com suporte",
    };
    const copies = Array.from({ length: 12 }, (_, index) =>
      composeRouteCopy(longClosing, { seed: `fecho:${index}`, rotate: index }),
    );
    copies.forEach((copy) => {
      expect(copy.closings?.[0]?.sub).toMatch(/dá base para conduzir o caso complexo com suporte/i);
    });
  });

  it("traduz o léxico clínico em informação útil, sem vender o termo técnico", () => {
    const clinical: NarrativeRoute = {
      ...route,
      lexicalTerm: "Hipofunção vestibular",
      lexicalPerception: "Tontura ao virar na cama",
      proof: "Avaliação funcional identifica os movimentos que provocam o sintoma",
    };
    const copies = Array.from({ length: 12 }, (_, index) =>
      composeRouteCopy(clinical, { seed: `lexico:${index}`, rotate: index }),
    );

    copies.forEach((copy) => {
      expect(copy.quotes?.[0]?.text).toMatch(/tontura|avaliação|próximo passo/i);
      expect(copy.quotes?.[0]?.text).not.toMatch(/é o (?:nome|termo) técnico/i);
    });
  });

  it("faz a comparação destacar o valor entregue, não a fisioterapia genérica", () => {
    const type = HOOK_TYPES.find((item) => item.id === "comparacao-dois-casos");
    expect(type).toBeDefined();
    if (!type) return;
    const hook = buildHook(type, {
      inimigo: "fisioterapia genérica",
      prova: "Reavaliação de mobilidade, força, carga e função",
    });
    expect(hook?.strong).toMatch(/reavaliação/i);
    expect(hook?.strong).not.toMatch(/genérica/i);
    expect(hook?.rest).toMatch(/em vez de fisioterapia genérica/i);
  });
});
