import { describe, expect, it } from "vitest";
import { VESTIBULAR_SYMPTOMS, VESTIBULAR_TERMS, matchesVestibular, vestibularLines } from "@/pages/studio-pro/vestibularLexicon";
import { applyCharm, findSubNicheCharm } from "@/pages/studio-pro/charmCopy";
import { WORLDS } from "@/pages/studio/content";
import type { Relation } from "@/pages/studio-pro/relational";

const relation = {
  who: "Paciente com tontura",
  keyword: "tontura",
  pain: "O quarto gira quando viro na cama",
  desire: "Voltar a levantar sem medo",
  proof: "Avaliação de posição",
  cta: "Investigar a minha tontura",
  hook: "Nem toda tontura é labirintite",
  audience: { id: "tontura", label: "Paciente com tontura", pains: [], desires: [] },
} as unknown as Relation;

const base = WORLDS.paciente;

describe("léxico vestibular", () => {
  it("reconhece o público de tontura", () => {
    expect(matchesVestibular("Paciente com tontura")).toBe(true);
    expect(matchesVestibular("Clínica de feridas")).toBe(false);
    expect(findSubNicheCharm(relation)?.id).toBe("vestibular");
  });

  it("é determinístico e usa o vocabulário pedido", () => {
    const a = vestibularLines("marca:tontura:vender");
    const b = vestibularLines("marca:tontura:vender");
    expect(a).toEqual(b);
    const pool = [
      ...VESTIBULAR_TERMS.map((row) => `${row.term} ${row.plain}`),
      ...a.subs,
      ...a.headlines.map((h) => `${h.strong}${h.rest}`),
    ]
      .join(" ")
      .toLowerCase();
    ["labirintite", "vppb", "otocôni", "canais semicirculares", "manobras posicionais corretivas"].forEach((term) => {
      expect(pool).toContain(term);
    });
  });

  it("entra nas artes de tontura inclusive no ângulo informar", () => {
    ["informar", "vender"].forEach((angle) => {
      const out = applyCharm(base, angle as never, relation, "Guilherme Vallim Fisioterapia");
      const text = [...out.subs, ...out.headlines.map((h) => `${h.strong}${h.rest}`), ...out.lists.flatMap((l) => l.items)]
        .join(" ")
        .toLowerCase();
      expect(text).toContain("vppb");
      expect(out.lists[0].items.length).toBeGreaterThan(0);
    });
  });

  it("não apresenta dor como sintoma vestibular", () => {
    expect(VESTIBULAR_SYMPTOMS.join(" ").toLowerCase()).toMatch(/vertigem|instabilidade|desequilíbrio|mundo rodar/);
    ["informar", "dor", "vender"].forEach((angle) => {
      const out = applyCharm(base, angle as never, relation, "Guilherme Vallim Fisioterapia");
      const priorityCopy = [
        ...out.headlines.slice(0, 3).map((h) => `${h.strong}${h.rest}`),
        ...out.subs.slice(0, 3),
        ...out.closings.slice(0, 2).flatMap((closing) => [closing.title, closing.sub]),
      ].join(" ");
      expect(priorityCopy).not.toMatch(/\bdores?\b/i);
    });
  });
});
