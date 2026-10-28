import { describe, it, expect } from "vitest";
import { alignCtasToAudience } from "./ctaAudience";

describe("CTA alinhada ao público", () => {
  it("arte para fisio autônomo não termina em autoavaliação", () => {
    const out = alignCtasToAudience({ sales: { ctas: ["Fazer minha autoavaliação"] }, x: [{ cta: "Fazer minha autoavaliação" }] }, false, "Testar o painel profissional");
    expect(out.sales.ctas).toEqual(["Testar o painel profissional"]);
    expect(out.x[0].cta).toBe("Testar o painel profissional");
  });
  it("arte para paciente não termina em painel profissional", () => {
    const out = alignCtasToAudience({ cta: "Testar o painel profissional" }, true, "Fazer minha autoavaliação");
    expect(out.cta).toBe("Fazer minha autoavaliação");
  });
  it("chamada coerente fica intacta", () => {
    expect(alignCtasToAudience({ cta: "Conhecer o controle de carga" }, false).cta).toBe("Conhecer o controle de carga");
  });
});
