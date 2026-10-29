import { describe, it, expect } from "vitest";
import { rankProofsByAxis, stripColdSpecs, detectAxes } from "@/pages/studio/captionCoherence";

describe("caption coherence", () => {
  it("documentation hook ranks documentation proofs first", () => {
    const r = rankProofsByAxis("Nota de evolução às 22h é retrabalho", ["Agenda da equipe organizada", "Relatório de evolução pronto em PDF"]);
    expect(r[0]).toBe("Relatório de evolução pronto em PDF");
  });
  it("never drops proofs", () => {
    expect(rankProofsByAxis("dor lombar", ["a", "b", "c"])).toHaveLength(3);
  });
  it("strips MB specs and LGPD jargon", () => {
    expect(stripColdSpecs("Documentos anexados, até 20 MB por paciente.")).toBe("Documentos anexados.");
    expect(stripColdSpecs("Tratados conforme a LGPD")).toBe("Tratados com segurança");
  });
  it("detects academic axis", () => {
    expect(detectAxes("No estágio, o preceptor pergunta")[0]).toBe("academic");
  });
});
