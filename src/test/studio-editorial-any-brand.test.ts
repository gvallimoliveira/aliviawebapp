import { describe, expect, it } from "vitest";
import { buildSegmentContent, enforceEditorialFocus } from "@/pages/studio-pro/brandContent";
import {
  editorialAudienceIds,
  highlightTermsFor,
  isEditorialAudience,
  officialAudienceCount,
  type BrandAudience,
} from "@/pages/studio-pro/audiences";
import { frameEditorialLoss, textSimilarity } from "@/pages/studio-pro/narrativeArc";
import { varyContent } from "@/pages/studio/vary";

const kit = { name: "Clínica Vértice", niche: "fisioterapia", tone: "próximo", description: "", keywords: [] };

/** Marca comum (não Aliv.iA) com linha editorial própria de serviços. */
const audiences: BrandAudience[] = [
  { id: "publico-dor-cronica", label: "Dor crônica", keyword: "Dor crônica", pains: ["dor que volta sempre"], desires: ["voltar a treinar"] },
  {
    id: "servico-pilates-clinico",
    label: "Pilates clínico",
    keyword: "Pilates clínico",
    editorialGroup: "Serviços da clínica",
    description: "Aulas individuais orientadas pela avaliação do fisioterapeuta.",
    proof: ["cada série é definida a partir dos testes de força e mobilidade"],
    desires: ["a pessoa entende o que treina e por quê"],
    stakes: ["o treino vira rotina solta, sem leitura do quadro"],
    scenes: ["a paciente chega depois do trabalho, tensa e sem tempo"],
    cta: "Agendar avaliação",
  },
  {
    id: "servico-drenagem",
    label: "Drenagem pós-operatória",
    keyword: "Drenagem pós-operatória",
    editorialGroup: "Serviços da clínica",
    description: "Sessões de drenagem no pós-cirúrgico com acompanhamento de edema.",
    proof: ["o edema é medido sessão a sessão"],
    desires: ["a recuperação acontece sem sustos"],
    stakes: ["o inchaço passa a ser adivinhado em casa"],
    cta: "Falar com a clínica",
  },
];

describe("linha editorial em qualquer marca", () => {
  it("temas editoriais não entram na contagem oficial de públicos", () => {
    expect(officialAudienceCount(audiences)).toBe(1);
    expect(editorialAudienceIds(audiences)).toEqual(["servico-pilates-clinico", "servico-drenagem"]);
    expect(isEditorialAudience(audiences[1])).toBe(true);
    expect(isEditorialAudience(audiences[0])).toBe(false);
  });

  it("sugere termos de destaque a partir do nome do tema", () => {
    expect(highlightTermsFor(audiences[1]).length).toBeGreaterThan(0);
  });

  it("fecha a arte no tema escolhido, com arco completo e destaque do próprio serviço", () => {
    const target = audiences[1];
    const content = enforceEditorialFocus(
      buildSegmentContent({ kit, audiences, segment: target.id, angle: "informar", variationSeed: "servico-pilates" }),
      target,
    );
    const allowed = highlightTermsFor(target);

    expect(content.carousels[0]?.slides ?? []).toHaveLength(4);
    expect(content.typos.every((entry) => allowed.includes(entry.big))).toBe(true);
    expect(content.kinetic.every((entry) => allowed.includes(entry.word))).toBe(true);
    const blob = JSON.stringify(content).toLowerCase();
    expect(blob).toContain("pilates");
    expect(blob).not.toContain("drenagem");
  });

  it("faz cada etapa somar informação e converte o prejuízo em problema concreto", () => {
    const target = audiences[1];
    const content = enforceEditorialFocus(
      buildSegmentContent({ kit, audiences, segment: target.id, angle: "informar", variationSeed: "progressao-pilates" }),
      target,
    );
    const slides = content.carousels[0]?.slides ?? [];
    const bodies = slides.map((slide) => slide.body);

    expect(slides).toHaveLength(4);
    expect(JSON.stringify(content.marquee)).not.toMatch(/como funciona|benefício prático|sem essa (?:funcionalidade|serviço|produto|recurso)/i);
    expect(bodies[3]).toBe(frameEditorialLoss(target.stakes?.[0] ?? ""));
    for (let i = 0; i < bodies.length; i += 1) {
      for (let j = i + 1; j < bodies.length; j += 1) {
        expect(textSimilarity(bodies[i], bodies[j])).toBeLessThan(0.52);
      }
    }
  });

  it("reaplica o foco completo depois da variação em qualquer marca", () => {
    const target = audiences[1];
    const built = buildSegmentContent({ kit, audiences, segment: target.id, angle: "venda", variationSeed: "antes-da-variacao" });
    const varied = varyContent(built, {
      register: "direto",
      seed: "depois-da-variacao",
      profile: { headlines: "high", support: "high", actions: "high" },
    });
    const content = enforceEditorialFocus(varied, target);
    const allowed = highlightTermsFor(target);
    const blob = JSON.stringify(content).toLowerCase();

    expect(content.headlines.every((headline) => allowed.includes(headline.strong))).toBe(true);
    expect(content.headlines.every((headline) => !/drenagem/i.test(`${headline.strong} ${headline.rest}`))).toBe(true);
    expect(content.typos.every((entry) => allowed.includes(entry.big))).toBe(true);
    expect(content.kinetic.every((entry) => allowed.includes(entry.word))).toBe(true);
    expect(content.carousels[0]?.slides).toHaveLength(4);
    expect(content.carousels[0]?.slides[3]?.body).toBe(frameEditorialLoss(target.stakes?.[0] ?? ""));
    expect(blob).not.toMatch(/benefício prático|sem essa (?:funcionalidade|serviço|produto|recurso)/i);
    expect(blob).not.toContain("drenagem");
  });

  it("mantém objeções subordinadas e nunca as promove a palavra protagonista", () => {
    const target: BrandAudience = {
      ...audiences[1],
      highlightTerms: ["Pilates clínico", "Movimento", "Força"],
      objections: ["Pilates é só alongamento"],
    };
    const content = enforceEditorialFocus(
      buildSegmentContent({ kit, audiences: [audiences[0], target, audiences[2]], segment: target.id, angle: "venda", variationSeed: "objecao-subordinada" }),
      target,
    );

    expect(content.headlines.every((headline) => !/só alongamento/i.test(headline.strong))).toBe(true);
    expect(content.headlines.every((headline) => target.highlightTerms?.includes(headline.strong))).toBe(true);
    expect(content.sales.objections).toEqual(target.objections);
  });
});
