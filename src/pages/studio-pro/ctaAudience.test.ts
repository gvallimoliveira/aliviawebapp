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

import { alignTitlesToAudience } from "./ctaAudience";
describe("títulos alinhados ao público", () => {
  const c = { headlines: [{ strong: "Pronto para entender o quadro e seguir um plano", rest: "" }, { strong: "Avaliação estruturada em minutos", rest: "" }] };
  it("arte para fisio remove título de paciente", () => {
    expect(alignTitlesToAudience(c, false).headlines.map((h) => h.strong)).toEqual(["Avaliação estruturada em minutos"]);
  });
  it("arte para paciente mantém", () => {
    expect(alignTitlesToAudience(c, true).headlines).toHaveLength(2);
  });
});
