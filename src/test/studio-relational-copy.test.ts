import { describe, expect, it } from "vitest";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { buildBrandDna, isDnaEmpty } from "@/pages/studio-pro/brandDnaKit";
import { pickRelation } from "@/pages/studio-pro/relational";
import { GLOBAL_SEGMENT, type BrandAudience } from "@/pages/studio-pro/audiences";
import { isStale, STALE_PHRASES } from "@/pages/studio/persuasion";

const brief = {
  apresentacao: "Fisioterapeuta que trata a causa da dor, não só o sintoma",
  oferta: "Atendimento individual em consultório, com reavaliação a cada quatro semanas",
  diferencial: "Cada sessão começa com um teste que mostra o que mudou desde a última",
  dor: "Já fez fisioterapia antes e a dor voltou depois de duas semanas",
  desejo: "Voltar a correr sem medo de travar no meio do treino",
  cta: "Chamar no WhatsApp",
  proibidas: "cura, milagre, garantia de resultado",
};

const kit = {
  name: "Guilherme Vallim Fisioterapia",
  niche: "fisioterapia esportiva",
  tone: "Direto com provocação leve",
  description: "Consultório de fisioterapia focado em corrida",
  briefAnswers: brief,
};

const audiences: BrandAudience[] = [
  {
    id: "corredor",
    label: "Corredor amador",
    keyword: "Corrida",
    hook: "Você que treina para a próxima prova",
    pains: ["A dor volta sempre no mesmo quilômetro", "Medo de parar de treinar por semanas"],
    desires: ["Terminar a prova inteira sem dor", "Treinar sem depender de analgésico"],
    proof: ["Teste de força no início e no fim do ciclo", "Plano de carga ajustado a cada quatro semanas"],
    cta: "Chamar no WhatsApp",
  } as BrandAudience,
];

const allText = (content: ReturnType<typeof buildSegmentContent>) =>
  JSON.stringify(content).toLowerCase();

describe("motor textual relacional", () => {
  it("lê o DNA da marca a partir do briefing", () => {
    const dna = buildBrandDna({ briefAnswers: brief, niche: kit.niche, tone: kit.tone });
    expect(isDnaEmpty(dna)).toBe(false);
    expect(dna.presentation).toContain("causa da dor");
    expect(dna.forbidden).toContain("cura");
  });

  it("separa desejo de objeção quando ambos vieram no mesmo campo", () => {
    const dna = buildBrandDna({
      briefAnswers: {
        desejo: "Desejo: voltar a correr sem medo; Objeções mais comuns: acha que vai demorar",
      },
    });
    expect(dna.desire).toBe("voltar a correr sem medo");
    expect(dna.objection).toBe("acha que vai demorar");
  });

  it("escreve a partir do manual, não do acervo genérico", () => {
    const content = buildSegmentContent({
      kit,
      audiences,
      segment: GLOBAL_SEGMENT,
      angle: "informar",
      variationSeed: "lote-1",
    });
    const text = allText(content);
    expect(text).toMatch(/causa da dor|reavalia|teste/);
  });

  it("encurta público e objeções antes de renderizar", () => {
    const content = buildSegmentContent({
      kit: {
        ...kit,
        briefAnswers: {
          ...brief,
          publico_primario: "Adulto do Rio de Janeiro (Zona Sul, Barra e Recreio) com dor persistente",
          dor: "Uma descrição muito extensa da tentativa anterior que acumula detalhes demais para caber com boa leitura dentro de uma única arte",
        },
      },
      audiences: [],
      segment: GLOBAL_SEGMENT,
      angle: "dor",
      variationSeed: "texto-enxuto",
    });
    expect(content.sales.audience.length).toBeLessThanOrEqual(40);
    content.sales.objections.forEach((item) => expect(item.length).toBeLessThanOrEqual(96));
  });

  it("não deixa vício de linguagem herdado sair do motor", () => {
    for (const seed of ["a", "b", "c", "d", "e"]) {
      for (const segment of [GLOBAL_SEGMENT, "corredor"]) {
        const content = buildSegmentContent({
          kit,
          audiences,
          segment,
          angle: "venda",
          variationSeed: seed,
        });
        const text = allText(content);
        const found = STALE_PHRASES.filter((p) => text.includes(p));
        expect(found, `seed ${seed}/${segment}`).toEqual([]);
        expect(isStale(text)).toBe(false);
      }
    }
  });

  it("respeita as palavras proibidas declaradas pela marca", () => {
    const content = buildSegmentContent({
      kit,
      audiences,
      segment: "corredor",
      angle: "desejo",
      variationSeed: "proibidas",
    });
    expect(allText(content)).not.toContain("milagre");
  });

  it("elege um par relacional determinístico e coerente com o ângulo", () => {
    const dna = buildBrandDna({ briefAnswers: brief });
    const a = pickRelation({ audience: audiences[0], dna, brand: kit.name, angle: "dor", seed: "x" });
    const b = pickRelation({ audience: audiences[0], dna, brand: kit.name, angle: "dor", seed: "x" });
    expect(a.pain).toBe(b.pain);
    expect(a.axis).toBe("pain");
    expect(a.cta).toBe("Chamar no WhatsApp");
    const wish = pickRelation({ audience: audiences[0], dna, brand: kit.name, angle: "desejo", seed: "x" });
    expect(wish.axis).toBe("desire");
    expect(wish.desire).toBeTruthy();
  });

  it("cria uma rota narrativa determinística sem misturar a voz dos públicos", () => {
    const other: BrandAudience = {
      id: "clinica",
      label: "Gestor de clínica",
      keyword: "Clínica",
      pains: ["Equipe registra cada caso de um jeito"],
      desires: ["Padronizar a jornada sem perder contexto"],
      proof: ["Relatórios e evolução compartilhados pela equipe"],
      cta: "Conhecer a gestão clínica",
    };
    const dna = buildBrandDna({ briefAnswers: brief });
    const a = pickRelation({ audience: audiences[0], audiences: [...audiences, other], dna, brand: kit.name, angle: "dor", seed: "rede" });
    const b = pickRelation({ audience: audiences[0], audiences: [...audiences, other], dna, brand: kit.name, angle: "dor", seed: "rede" });
    expect(a.route).toEqual(b.route);
    expect(a.route.audienceId).toBe("corredor");
    expect(a.route.signature).toBeTruthy();
    expect(a.route.audienceLabel).not.toBe(other.label);
  });

  it("varia conexões entre seeds sem inventar matéria-prima", () => {
    const dna = buildBrandDna({ briefAnswers: brief });
    const source = JSON.stringify([brief, audiences]).toLowerCase();
    const routes = ["rede-a", "rede-b", "rede-c", "rede-d"].map((seed) =>
      pickRelation({ audience: audiences[0], audiences, dna, brand: kit.name, angle: "informar", seed }).route,
    );
    expect(new Set(routes.map((route) => route?.signature)).size).toBeGreaterThan(1);
    routes.forEach((route) => {
      [route?.tension, route?.feature, route?.proof, route?.desire]
        .filter((value): value is string => Boolean(value))
        .forEach((value) => expect(source).toContain(value.toLowerCase()));
    });
  });

  it("não usa público manual como ponte automática", () => {
    const manual: BrandAudience = {
      id: "feridas",
      label: "Cicatrização de feridas",
      keyword: "Feridas",
      pains: ["Ferida complexa"],
      desires: ["Cicatrização acompanhada"],
      proof: ["Conduta específica para feridas"],
      manualOnly: true,
    };
    const relation = pickRelation({
      audience: audiences[0],
      audiences: [...audiences, manual],
      dna: buildBrandDna({ briefAnswers: brief }),
      brand: kit.name,
      angle: "informar",
      seed: "sem-feridas",
    });
    expect(relation.route?.vocabulary.join(" ")).not.toMatch(/ferida|cicatriz/);
  });

  it("o medo eleito lidera os slots do público", () => {
    const relation = pickRelation({
      audience: audiences[0],
      dna: buildBrandDna({ briefAnswers: brief }),
      brand: kit.name,
      angle: "dor",
      seed: "lider",
    });
    const content = buildSegmentContent({
      kit,
      audiences,
      segment: "corredor",
      angle: "dor",
      variationSeed: "lider",
    });
    expect(allText(content)).toContain((relation.pain ?? "").toLowerCase().slice(0, 20));
  });
});
