import { describe, expect, it } from "vitest";
import { buildSegmentContent, enforceEditorialFocus } from "@/pages/studio-pro/brandContent";
import {
  editorialAudienceIds,
  highlightTermsFor,
  isEditorialAudience,
  officialAudienceCount,
  type BrandAudience,
} from "@/pages/studio-pro/audiences";

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
});
