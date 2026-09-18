import { describe, it, expect } from "vitest";
import { buildAudienceScope, enforceAudienceScope } from "@/pages/studio-pro/audienceScope";
import type { BrandAudience } from "@/pages/studio-pro/audiences";

const vestibular: BrandAudience = {
  id: "vestibular",
  label: "Tonturas/vertigens",
  keyword: "Tontura e vertigem",
  description: "Pessoas com tontura, vertigem e desequilíbrio.",
  hook: "Você que sente o mundo girar",
} as BrandAudience;

const outros: BrandAudience[] = [
  vestibular,
  { id: "dor-cronica", label: "Dor Crônica", keyword: "Dor crônica" } as BrandAudience,
  { id: "pos-operatorio", label: "Pós-operatório", keyword: "Pós-operatório" } as BrandAudience,
  { id: "esportista-performance", label: "Performance esportiva", keyword: "Esportista" } as BrandAudience,
];

describe("Studio: escopo do público ativo", () => {
  const scope = buildAudienceScope(vestibular, outros);

  it("tema de tendão não pertence a uma arte de tontura", () => {
    expect(scope.foreign("Tendinite: o tendão precisa de carga")).toBe(true);
    expect(scope.foreign("Nem toda tontura é labirintite")).toBe(false);
  });

  it("rótulo de outro público é estranho à arte", () => {
    expect(scope.foreign("Performance esportiva")).toBe(true);
    expect(scope.foreign("Pós-operatório")).toBe(true);
  });

  it("palavra comum da área não marca público (fisioterapia, avaliação)", () => {
    expect(scope.foreign("Avaliação de fisioterapia com critério")).toBe(false);
  });

  it("remove listas e selos de outro assunto, mantendo o da arte", () => {
    const content = {
      kickers: ["TENDINITE FISIOTERAPIA", "TONTURA E VERTIGEM"],
      lists: [
        { heading: "Para quem é", items: ["Dor Crônica", "Pós-operatório", "Performance esportiva"], closing: "Fale comigo" },
        { heading: "Tontura: o que é o quê", items: ["VPPB é cristal fora de lugar"], closing: "Investigar a minha tontura" },
      ],
    };
    const out = enforceAudienceScope(content, vestibular, outros);
    expect(out.kickers).toEqual(["TONTURA E VERTIGEM"]);
    expect(out.lists).toHaveLength(1);
    expect(out.lists[0].heading).toContain("Tontura");
  });

  it("selo sem opção válida cai para a palavra-chave do público", () => {
    const out = enforceAudienceScope({ kickers: ["DOR CRÔNICA"] }, vestibular, outros);
    expect(out.kickers).toEqual(["TONTURA E VERTIGEM"]);
  });
});
