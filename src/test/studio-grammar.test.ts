import { describe, expect, it } from "vitest";
import { isClause, isNominal, nominal, nominalList, readsWell, sentence, toNominal } from "@/pages/studio/grammar";

describe("guarda de gramática do motor criativo", () => {
  it("separa oração de grupo nominal", () => {
    expect(isClause("precisam postar todo dia para atrair clientes")).toBe(true);
    expect(isClause("não conseguem manter a frequência necessária")).toBe(true);
    expect(isNominal("o improviso do dia a dia")).toBe(true);
  });

  it("nominaliza dores escritas como oração", () => {
    expect(toNominal("precisam postar todo dia para atrair clientes")).toBe(
      "a pressão de postar todo dia para atrair clientes",
    );
    expect(toNominal("não conseguem manter a frequência necessária")).toBe(
      "a dificuldade de manter a frequência necessária",
    );
    expect(toNominal("falta tempo para criar posts")).toBe("a falta de tempo para criar posts");
    expect(toNominal("a dor volta sempre")).toBe("a dor que volta sempre");
  });

  it("usa o fallback da moldura quando não há conversão segura", () => {
    expect(nominal("blá blá blá então", "o improviso")).toBeTruthy();
    expect(nominalList(["precisam postar todo dia", "o improviso"])).toEqual([
      "a pressão de postar todo dia",
      "o improviso",
    ]);
  });

  it("reprova frases quebradas e aprova frases inteiras", () => {
    expect(readsWell("Conviver com precisam postar todo dia não é economia")).toBe(false);
    expect(readsWell("Sabe por que não conseguem manter a frequência volta sempre?")).toBe(false);
    expect(readsWell("Falta horas de modo a criar posts diariamente. Hoje. Ter")).toBe(false);
    expect(readsWell("Conviver com a pressão de postar todo dia não é economia.")).toBe(true);
    expect(readsWell("O próximo movimento é seu.")).toBe(true);
  });

  it("monta frase autônoma sem pontuação duplicada", () => {
    expect(sentence("precisam postar todo dia.")).toBe("Precisam postar todo dia.");
  });
});
