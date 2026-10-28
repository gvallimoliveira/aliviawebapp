import { describe, expect, it } from "vitest";
import { readFormatInsights, scopedFormatInsights, writeFormatInsights } from "../formatInsights";
import type { BrandAudience } from "../audiences";

const audiences = [
  { id: "paciente", label: "Paciente" },
  { id: "pro", label: "Profissional" },
  { id: "paciente-dor-cronica", label: "Paciente com dor crônica", parentId: "paciente", description: "já passou por vários profissionais" },
] as BrandAudience[];

const raw = `# PROFISSIONAL
A parte mais cansativa do seu dia não é atender | É escrever tudo depois | Teste
# PACIENTE COM DOR
Sua dor tem explicação | Nem toda dor é lesão | A autoavaliação começa por aí | Responda a sua autoavaliação`;

describe("seções dos insights de formato", () => {
  const insights = readFormatInsights(raw);
  it("roteiro de paciente nunca entra em arte de profissional", () => {
    const pro = scopedFormatInsights(insights, audiences[1], audiences).map((i) => i.title);
    expect(pro).not.toContain("Sua dor tem explicação");
  });
  it("sub-nicho de paciente herda a seção de paciente", () => {
    const sub = scopedFormatInsights(insights, audiences[2], audiences).map((i) => i.title);
    expect(sub).toEqual(["Sua dor tem explicação"]);
  });
  it("salvar pelo editor preserva as seções", () => {
    expect(readFormatInsights(writeFormatInsights(insights)).map((i) => i.section)).toEqual(["pro", "paciente"]);
  });
});
