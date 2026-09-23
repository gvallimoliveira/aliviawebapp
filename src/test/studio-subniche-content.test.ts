import { describe, expect, it } from "vitest";
import {
  ALIVIA_AUDIENCES,
  audienceHook,
  audienceKeyword,
  resolveAudience,
  audienceAncestors,
  officialAudienceCount,
} from "@/pages/studio-pro/audiences";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { ALIVIA_DIFFERENTIALS, ALIVIA_DIFFERENTIAL_GROUP } from "@/pages/studio-pro/aliviaDifferentials";
import { buildNarrativeRoute } from "@/pages/studio-pro/synapses";
import { buildBrandDna } from "@/pages/studio-pro/brandDnaKit";

const kit = { name: "Aliv.iA", niche: "fisioterapia", tone: "próximo e técnico", description: "", keywords: [] };
const SUBS = ["paciente-dor-cronica", "paciente-pos-operatorio", "paciente-atleta-amador", "paciente-60-mais"];

describe("sub-nichos no motor criativo", () => {
  it("mantém quatro públicos oficiais e agrupa os doze diferenciais à parte", () => {
    expect(officialAudienceCount(ALIVIA_AUDIENCES)).toBe(4);
    expect(ALIVIA_DIFFERENTIALS).toHaveLength(12);
    expect(ALIVIA_DIFFERENTIALS.every((item) => item.editorialGroup === ALIVIA_DIFFERENTIAL_GROUP)).toBe(true);
    expect(ALIVIA_DIFFERENTIALS.every((item) => item.parentId === "pro" || item.parentId === "clinica")).toBe(true);
  });

  it("gera cada diferencial a partir do próprio problema, prova e chamada", () => {
    for (const item of ALIVIA_DIFFERENTIALS) {
      const content = buildSegmentContent({
        kit,
        audiences: ALIVIA_AUDIENCES,
        segment: item.id,
        angle: "venda",
        variationSeed: `differential:${item.id}`,
      });
      const blob = JSON.stringify(content).toLowerCase();
      expect(blob).toContain(item.keyword!.toLowerCase());
      expect(item.proof!.some((proof) => blob.includes(proof.toLowerCase()))).toBe(true);
      expect(content.sales.ctas.map((cta) => cta.toLowerCase())).toContain(item.cta!.toLowerCase());
      expect(content.closings.some((closing) => closing.cta.toLowerCase() === item.cta!.toLowerCase())).toBe(true);
      expect(blob).not.toContain("slogan em destaque");
      expect(blob).not.toContain("vou perder tempo aprendendo a usar mais um sistema");
      expect(blob).not.toContain("dor mapeada por mecanismo, não só por intensidade");
    }
  });

  it("estrutura cada diferencial em definição, funcionamento, benefício e prejuízo de não ter", () => {
    for (const item of ALIVIA_DIFFERENTIALS) {
      const content = buildSegmentContent({
        kit,
        audiences: ALIVIA_AUDIENCES,
        segment: item.id,
        angle: "informar",
        variationSeed: `four-pillars:${item.id}`,
      });
      const slides = content.carousels[0]?.slides ?? [];
      expect(slides.map((slide) => slide.heading)).toEqual([
        "O que é",
        "Como funciona",
        "O benefício no dia a dia",
        "Sem essa funcionalidade",
      ]);
      expect(content.compare[0]?.before.length).toBeGreaterThan(0);
      expect(content.compare[0]?.after.length).toBeGreaterThan(0);
      expect(JSON.stringify(content).toLowerCase()).toContain(item.description!.toLowerCase());
      expect(item.stakes!.some((stake) => JSON.stringify(content).toLowerCase().includes(stake.toLowerCase()))).toBe(true);
    }
  });

  it("permanece determinístico para o mesmo diferencial e seed", () => {
    const input = {
      kit,
      audiences: ALIVIA_AUDIENCES,
      segment: "diferencial-hep-video",
      angle: "informar" as const,
      variationSeed: "hep-fixed",
    };
    expect(buildSegmentContent(input)).toEqual(buildSegmentContent(input));
  });

  it("mantém segurança e revisão profissional nos dois novos diferenciais", () => {
    const redFlags = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-red-flags");
    const external = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-avaliacao-externa-ia");

    expect(redFlags?.description).toContain("sob ressalva");
    expect(redFlags?.description).toContain("interrompe o fluxo autônomo");
    expect(JSON.stringify(redFlags)).not.toMatch(/blindagem jurídica|risco zero|garantia/i);

    expect(external?.description).toContain("revisão, edição e confirmação profissional");
    expect(external?.proof).toContain("Leitura combinada de até cinco PDFs ou imagens");
    expect(JSON.stringify(external)).not.toMatch(/diagnóstico definitivo|salva automaticamente|sem revisão/i);
  });

  it("isola diferenciais do repertório genérico da marca", () => {
    const audience = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-avaliacao-externa-ia");
    const dna = buildBrandDna({
      niche: "fisioterapia",
      tone: "próximo e técnico",
      description: "Dor mapeada por mecanismo, não só por intensidade",
      briefAnswers: { objection: "Vou perder tempo aprendendo a usar mais um sistema" },
    });
    const route = buildNarrativeRoute({
      audience,
      audiences: ALIVIA_AUDIENCES,
      dna,
      brand: "Aliv.iA",
      seed: "external-isolated",
    });

    expect(route.methodPlain).toBeUndefined();
    expect(route.feature).not.toMatch(/dor mapeada por mecanismo/i);
    expect(route.objection).not.toMatch(/vou perder tempo aprendendo/i);
  });

  it("resolve herança do público matriz", () => {
    const sub = resolveAudience(ALIVIA_AUDIENCES, "paciente-pos-operatorio")!;
    expect(sub.pains).toContain("Insegurança sobre o que pode ou não fazer");
    // herda do pai "paciente"
    expect(sub.pains).toContain("Dor que volta sempre");
    expect(audienceAncestors(ALIVIA_AUDIENCES, "paciente-pos-operatorio")[0].id).toBe("paciente");
  });

  it("gera conteúdo dirigido para cada sub-nicho", () => {
    for (const id of SUBS) {
      const audience = ALIVIA_AUDIENCES.find((a) => a.id === id)!;
      const content = buildSegmentContent({ kit, audiences: ALIVIA_AUDIENCES, segment: id, angle: "informar" });
      const blob = JSON.stringify(content).toLowerCase();
      expect(content.label).toContain(audience.label);
      expect(blob).toContain(audience.pains![0].toLowerCase());
      expect(blob).toContain(audience.cta!.toLowerCase());
    }
  });

  it("chama o sub-nicho pela palavra-chave nos textos principais", () => {
    for (const id of SUBS) {
      const audience = ALIVIA_AUDIENCES.find((a) => a.id === id)!;
      const key = audienceKeyword(audience).toLowerCase();
      const hook = audienceHook(audience).toLowerCase();
      const content = buildSegmentContent({ kit, audiences: ALIVIA_AUDIENCES, segment: id, angle: "informar" });

      // kicker, headline, tipografia-herói, lista, carrossel e fecho citam o público
      expect(content.kickers.slice(0, 3).some((k) => k.toLowerCase().includes(key))).toBe(true);
      expect(content.headlines.slice(0, 3).some((h) => `${h.strong} ${h.rest}`.toLowerCase().includes(key))).toBe(true);
      expect(content.typos.slice(0, 2).some((t) => t.big.toLowerCase().includes(key))).toBe(true);
      expect(content.lists.slice(0, 3).some((l) => l.heading.toLowerCase().includes(key))).toBe(true);
      expect(content.carousels[0].title.toLowerCase()).toContain(key);
      expect(content.closings.slice(0, 2).some((c) => `${c.title} ${c.sub}`.toLowerCase().includes(key))).toBe(true);
      expect(JSON.stringify(content).toLowerCase()).toContain(hook);
    }
  });

  it("mantém comunicação dirigida (acervo genérico só como cauda)", () => {
    const content = buildSegmentContent({
      kit,
      audiences: ALIVIA_AUDIENCES,
      segment: "paciente-60-mais",
      angle: "dor",
    });
    const key = "geração 60+";
    const dirigidas = content.headlines.filter((h) => `${h.strong} ${h.rest}`.toLowerCase().includes(key)).length;
    expect(dirigidas).toBeGreaterThanOrEqual(3);
    // cauda genérica limitada para não diluir a mensagem
    expect(content.headlines.length).toBeLessThanOrEqual(12);
  });
});
