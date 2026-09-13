import { describe, it, expect } from "vitest";
import { appendDictated } from "@/hooks/useDictation";

describe("appendDictated", () => {
  it("mantém a ordem dos trechos ditados", () => {
    let text = "";
    ["Paciente relata melhora da dor lombar", "Seguiu os exercícios em casa", "Mantida a conduta"].forEach((seg) => {
      text = appendDictated(text, seg);
    });
    expect(text).toBe("Paciente relata melhora da dor lombar. Seguiu os exercícios em casa. Mantida a conduta");
  });

  it("não apaga o que já estava escrito e ignora trechos vazios", () => {
    expect(appendDictated("Conduta inicial.", "   ")).toBe("Conduta inicial.");
    expect(appendDictated("Conduta inicial.", "ajuste de carga")).toBe("Conduta inicial. ajuste de carga");
  });
});
