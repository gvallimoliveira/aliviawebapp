import { describe, expect, it } from "vitest";
import { charmCta, charmRhythm, charmify, isCharming, isPleading, youFocus } from "@/pages/studio/charm";
import { SUBNICHE_CHARM, findSubNicheCharm } from "@/pages/studio-pro/charmCopy";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { ALIVIA_AUDIENCES } from "@/pages/studio-pro/audiences";
import { readsWell } from "@/pages/studio/grammar";

const kit = { name: "Guilherme Vallim Fisioterapia", niche: "fisioterapia", tone: "próximo e técnico" };

describe("escrita charmosa (venda, dor, desejo)", () => {
  it("pilar da confiança despretensiosa: súplica vira convite", () => {
    expect(isPleading("Compre agora, última chance")).toBe(true);
    expect(charmCta("Compre agora")).toBe("Descubra o que estava faltando");
    expect(charmCta("Fazer minha avaliação")).toBe("Fazer minha avaliação");
  });

  it("pilar do foco no você: ego da marca sai da abertura", () => {
    expect(youFocus("Nós criamos o melhor app de reabilitação").toLowerCase()).toContain("você");
    expect(isCharming("Nós criamos o melhor app")).toBe(false);
  });

  it("pilar do ritmo: frase longa ganha remate seco", () => {
    const out = charmRhythm(
      "O seu retorno ao esporte acontece com um plano desenhado para o seu caso, sem pressa nenhuma",
    );
    expect(out.split(". ").length).toBeGreaterThan(1);
    expect(readsWell(out)).toBe(true);
  });

  it("tabela de sub-nichos é encontrada pela palavra-chave do público", () => {
    const relation = { keyword: "Dor crônica", who: "Paciente com dor crônica", hook: "", hooks: [], cta: "", axis: "pain" as const };
    expect(findSubNicheCharm(relation)?.id).toBe("dor-cronica");
    SUBNICHE_CHARM.forEach((row) => {
      expect(readsWell(`${row.headline.strong}${row.headline.rest}`)).toBe(true);
      expect(readsWell(row.sub)).toBe(true);
      expect(isCharming(row.sub)).toBe(true);
    });
  });

  it("ângulo de venda/dor/desejo recebe copy charmosa; informar não muda", () => {
    const build = (angle: "informar" | "dor" | "desejo" | "venda") =>
      buildSegmentContent({
        kit,
        audiences: ALIVIA_AUDIENCES,
        segment: "paciente-dor-cronica",
        angle,
        variationSeed: "charm-1",
      });

    const dor = build("dor");
    const texto = [...dor.headlines.map((h) => `${h.strong}${h.rest}`), ...dor.subs].join(" | ").toLowerCase();
    expect(texto).toContain("abordagem");

    const venda = build("venda");
    venda.sales.ctas.forEach((c) => expect(isPleading(c)).toBe(false));

    const informar = build("informar");
    expect(informar.kickers[0]).toBe("BOM SABER");
  });

  it("charmify nunca devolve frase quebrada", () => {
    ["Compre agora!", "Nós temos os melhores curativos", "A cirurgia foi apenas o primeiro passo"].forEach((t) => {
      const out = charmify(t, { role: "support" });
      expect(readsWell(out)).toBe(true);
    });
  });
});
