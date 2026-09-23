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

const kit = { name: "Aliv.iA", niche: "fisioterapia", tone: "próximo e técnico", description: "", keywords: [] };
const SUBS = ["paciente-dor-cronica", "paciente-pos-operatorio", "paciente-atleta-amador", "paciente-60-mais"];

describe("sub-nichos no motor criativo", () => {
  it("mantém quatro públicos oficiais e agrupa os dez diferenciais à parte", () => {
    expect(officialAudienceCount(ALIVIA_AUDIENCES)).toBe(4);
    expect(ALIVIA_DIFFERENTIALS).toHaveLength(10);
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
      expect(blob).toContain(item.proof![0].toLowerCase());
      expect(content.sales.ctas.map((cta) => cta.toLowerCase())).toContain(item.cta!.toLowerCase());
      expect(content.closings.some((closing) => closing.cta.toLowerCase() === item.cta!.toLowerCase())).toBe(true);
      expect(blob).not.toContain("slogan em destaque");
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
