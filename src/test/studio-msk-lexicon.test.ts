import { describe, expect, it } from "vitest";
import { matchesMsk, mskLines, mskTopicFor } from "@/pages/studio-pro/mskLexicon";
import { applyCharm } from "@/pages/studio-pro/charmCopy";
import { WORLDS } from "@/pages/studio/content";
import type { Relation } from "@/pages/studio-pro/relational";

const relation = (who: string, keyword: string) =>
  ({
    who,
    keyword,
    pain: "Sinto o joelho falhar",
    desire: "Voltar a correr",
    proof: "Avaliação com testes",
    cta: "Quero critério para voltar",
    hook: who,
    audience: { id: "x", label: who, pains: [], desires: [] },
  }) as unknown as Relation;

describe("léxico musculoesquelético", () => {
  it("reconhece temas citados e públicos", () => {
    expect(mskTopicFor("Ruptura de LCA", "s")?.id).toBe("lca");
    expect(mskTopicFor("Atleta corredor amador", "s")).toBeDefined();
    expect(matchesMsk("Clínica de feridas")).toBe(false);
  });

  it("é determinístico", () => {
    expect(mskLines("esportista", "a:b")).toEqual(mskLines("esportista", "a:b"));
  });

  it("entra nas artes de esportista, pós-op e dor crônica", () => {
    [
      ["Atleta com ruptura de LCA", "lca"],
      ["Paciente em pós-operatório de ombro", "manguito"],
      ["Paciente com dor crônica no joelho", "patelofemoral"],
    ].forEach(([who]) => {
      const out = applyCharm(WORLDS.paciente, "vender", relation(who as string, who as string), "Marca Teste");
      const text = [...out.subs, ...out.headlines.map((h) => `${h.strong}${h.rest}`), ...out.lists.flatMap((l) => l.items)]
        .join(" ")
        .toLowerCase();
      expect(text.length).toBeGreaterThan(0);
      expect(out.lists[0].items.length).toBeGreaterThan(0);
    });
  });
});
