import { describe, expect, it } from "vitest";
import {
  ALIVIA_AUDIENCES,
  audienceHook,
  audienceKeyword,
  resolveAudience,
  audienceAncestors,
  officialAudienceCount,
} from "@/pages/studio-pro/audiences";
import { buildSegmentContent, enforceDifferentialFocus } from "@/pages/studio-pro/brandContent";
import { ALIVIA_DIFFERENTIALS, ALIVIA_DIFFERENTIAL_GROUP } from "@/pages/studio-pro/aliviaDifferentials";
import { buildNarrativeRoute } from "@/pages/studio-pro/synapses";
import { buildBrandDna } from "@/pages/studio-pro/brandDnaKit";
import { blockKindSupported, composePage } from "@/pages/studio/composePage";
import { createRng } from "@/pages/studio/rng";
import { WORLDS } from "@/pages/studio/content";

const kit = { name: "Aliv.iA", niche: "fisioterapia", tone: "próximo e técnico", description: "", keywords: [] };
const SUBS = ["paciente-dor-cronica", "paciente-pos-operatorio", "paciente-atleta-amador", "paciente-60-mais"];

describe("sub-nichos no motor criativo", () => {
  it("não escala modelos que exigem coleções vazias nos diferenciais", () => {
    const content = buildSegmentContent({
      kit,
      audiences: ALIVIA_AUDIENCES,
      segment: ALIVIA_DIFFERENTIALS[0].id,
      angle: "informar",
      variationSeed: "partial-content-layout",
    });
    const blocks = composePage(
      createRng("partial-content-layout"),
      undefined,
      undefined,
      content.carousels,
      0,
      undefined,
      true,
      false,
      content,
    );

    expect(blockKindSupported("metrics", content)).toBe(false);
    expect(blockKindSupported("stats", content)).toBe(false);
    expect(blockKindSupported("journey", content)).toBe(false);
    expect(blockKindSupported("triptych", content)).toBe(false);
    expect(blocks.every((block) => blockKindSupported(block.kind, content))).toBe(true);
  });

  it("mantém quatro públicos oficiais e agrupa os diferenciais à parte", () => {
    expect(officialAudienceCount(ALIVIA_AUDIENCES)).toBe(4);
    expect(ALIVIA_DIFFERENTIALS).toHaveLength(25);
    expect(ALIVIA_DIFFERENTIALS.every((item) => item.editorialGroup === ALIVIA_DIFFERENTIAL_GROUP)).toBe(true);
    expect(ALIVIA_DIFFERENTIALS.every((item) => ["pro", "clinica", "paciente"].includes(String(item.parentId)))).toBe(true);
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
      const headings = slides.map((slide) => slide.heading);
      // Quatro etapas: o que é → como funciona → ganho → custo de não ter. Os
      // títulos nomeiam o tema, nunca rótulos soltos como "Benefício".
      expect(headings).toHaveLength(4);
      expect(headings).not.toContain("O que é");
      expect(headings).not.toContain("Benefício");
      // Todo título nomeia o próprio tema (nome ou um termo canônico dele).
      const anchors = [item.keyword ?? item.label, item.label, ...(item.highlightTerms ?? [])]
        .filter(Boolean)
        .map((text) => String(text).toLowerCase().slice(0, 8));
      expect(
        headings.every((heading) => anchors.some((anchor) => heading.toLowerCase().includes(anchor))),
      ).toBe(true);
      expect(headings[3]?.toLowerCase()).toContain((item.keyword ?? item.label).toLowerCase());
      expect(slides[3]?.body.toLowerCase()).not.toContain("o custo aparece na rotina");
      expect(content.compare[0]?.before.length).toBeGreaterThan(0);
      expect(content.compare[0]?.after.length).toBeGreaterThan(0);
      expect(slides[0]?.body.length).toBeGreaterThan(40);
      expect(item.stakes!.some((stake) => JSON.stringify(content).toLowerCase().includes(stake.toLowerCase()))).toBe(true);
    }
  });

  it("usa somente termos canônicos da funcionalidade como palavra protagonista", () => {
    for (const item of ALIVIA_DIFFERENTIALS) {
      const content = enforceDifferentialFocus(buildSegmentContent({
        kit,
        audiences: ALIVIA_AUDIENCES,
        segment: item.id,
        angle: "informar",
        variationSeed: `highlight:${item.id}`,
      }), item);
      const allowed = item.highlightTerms ?? [item.keyword!];

      expect(content.typos.every((entry) => allowed.includes(entry.big))).toBe(true);
      expect(content.kinetic.every((entry) => allowed.includes(entry.word))).toBe(true);
      expect(content.typos.map((entry) => entry.big)).not.toContain("Benefício");
      expect(content.typos.map((entry) => entry.big)).not.toContain("Prejuízo");
      expect(content.kinetic.map((entry) => entry.word)).not.toContain("Funcionalidade");
    }
  });

  it("fecha a explicação curta no mecanismo e benefício do mesmo diferencial", () => {
    const external = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-avaliacao-externa-ia")!;
    const content = enforceDifferentialFocus(buildSegmentContent({
      kit,
      audiences: ALIVIA_AUDIENCES,
      segment: external.id,
      angle: "venda",
      variationSeed: "external-closed-package",
    }), external);
    const blob = JSON.stringify({ typos: content.typos, kinetic: content.kinetic }).toLowerCase();

    expect(blob).toContain("avaliação externa");
    expect(blob).toContain("pdf");
    expect(blob).toContain("revis");
    expect(blob).not.toMatch(/srpe|carga planejada|prontidão|periodização|hep em vídeo/);
  });

  it("apresenta o agente como IA especializada com alma de fisioterapeuta", () => {
    const agent = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-agente-clinico")!;
    const content = enforceDifferentialFocus(buildSegmentContent({
      kit,
      audiences: ALIVIA_AUDIENCES,
      segment: agent.id,
      angle: "venda",
      variationSeed: "agent-specialized-positioning",
    }), agent);
    const blob = JSON.stringify(content);

    expect(agent.highlightTerms).toContain("IA especializada");
    expect(blob).toMatch(/IA especializada em fisioterapia/i);
    expect(blob).toMatch(/alma de fisioterapeuta/i);
    expect(content.headlines.every((headline) => !/IA genérica/i.test(headline.strong))).toBe(true);
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

  it("HEP em vídeo progride sem rótulos internos nem prejuízo colado à explicação", () => {
    const hep = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-hep-video")!;
    const content = enforceDifferentialFocus(buildSegmentContent({
      kit,
      audiences: ALIVIA_AUDIENCES,
      segment: hep.id,
      angle: "informar",
      variationSeed: "hep-progressao-editorial",
    }), hep);
    const slides = content.carousels[0]?.slides ?? [];
    const blob = JSON.stringify(content).toLowerCase();

    expect(slides).toHaveLength(4);
    expect(slides[0]?.body).toContain(hep.description);
    expect(hep.proof?.some((item) => slides[1]?.body.includes(item.toLowerCase()))).toBe(true);
    expect(hep.desires?.some((item) => slides[2]?.body.includes(item.toLowerCase()))).toBe(true);
    expect(hep.stakes?.some((item) => slides[3]?.body.toLowerCase().includes(item.toLowerCase()))).toBe(true);
    expect(slides[3]?.body).not.toMatch(/O custo aparece na rotina:/i);
    expect(blob).not.toMatch(/benefício prático|sem essa funcionalidade/);
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

  it("reaproveita a jornada das landings sem confundir orientação com diagnóstico", () => {
    const basic = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-paciente-autoavaliacao");
    const premium = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-paciente-premium");
    const report = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-paciente-relatorio");
    const plan = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-paciente-plano");
    const professional = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-paciente-fisioterapeuta");
    const journey = JSON.stringify([basic, premium, report, plan, professional]);

    expect(basic?.proof).toContain("Anamnese preenchida pela própria pessoa");
    expect(premium?.proof).toContain("Dados da autoavaliação básica transferidos automaticamente");
    expect(JSON.stringify(premium)).toMatch(/KOOS.*SPADI.*ODI.*VISA-A/);
    expect(JSON.stringify(report)).toMatch(/mapa corporal.*sinais de alerta.*mecanismo provável/i);
    expect(JSON.stringify(plan)).toMatch(/vídeo.*séries.*repetições.*frequência/i);
    expect(JSON.stringify(professional)).toMatch(/consulta presencial/i);
    expect(journey).not.toMatch(/diagnóstico online|diagnóstico médico|substitui a consulta/i);
  });

  it("explica múltiplas queixas pela relação entre cadeias cinéticas, sem universalizar um exemplo", () => {
    const source = JSON.stringify(WORLDS.paciente);

    expect(source).toMatch(/cadeia cinética/i);
    expect(source).toMatch(/condições (?:distintas|sem relação).*separad/i);
    expect(source).not.toContain("Ombro e lombar acompanhados separadamente");
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
