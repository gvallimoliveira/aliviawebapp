import { describe, expect, it } from "vitest";
import { buildHook, eligibleHooks, hookViolatesGuardrails, HOOK_TYPES } from "../hookTaxonomy";
import { hasDanglingEnding, isBareEnumeration } from "@/pages/studio/grammar";
import { buildArc, checkArc, textSimilarity } from "../narrativeArc";
import { rankTopics, salesValueScore } from "../topicScore";

describe("biblioteca de ganchos", () => {
  it("só oferece gancho quando o manual tem o insumo exigido", () => {
    const poor = eligibleHooks({ desejo: "qualidade de vida do animal" });
    expect(poor).toHaveLength(0);

    const rich = eligibleHooks({
      cena: "A coceira volta poucas semanas depois do banho",
      mecanismo: "citologia cutânea para identificar Malassezia",
      objecao: "É só alergia",
      inimigo: "antibiótico e corticoide sem exame",
      prova: "lâmina lida na própria consulta",
      desejo: "conduta com alvo definido",
      consequencia: "o quadro volta a cada estação",
    });
    expect(rich.length).toBeGreaterThan(4);
  });

  it("monta gancho de duas partes, sem promessa proibida", () => {
    const type = HOOK_TYPES.find((item) => item.id === "contraste-falso-senso-comum")!;
    const hook = buildHook(type, {
      inimigo: "antibiótico e corticoide sem exame",
      mecanismo: "citologia cutânea antes da conduta",
    });
    expect(hook?.strong).toContain("Não é");
    expect(hook?.rest.length).toBeGreaterThan(6);
    expect(hookViolatesGuardrails(`${hook?.strong} ${hook?.rest}`)).toBe(false);
  });

  it("bloqueia promessa de cura e infantilização", () => {
    expect(hookViolatesGuardrails("Cura garantida para o seu peludinho")).toBe(true);
  });

  it("transforma lista técnica em ação investigativa, sem deixá-la solta", () => {
    const type = HOOK_TYPES.find((item) => item.id === "sinal-precoce-ignorado");
    expect(type).toBeDefined();
    const hook = type && buildHook(type, {
      gatilho: "O pet sacode a cabeça durante a noite",
      mecanismo: "ácaros, leveduras, cocos e bastonetes",
    });
    expect(hook?.rest).toBe("É hora de investigar a presença de ácaros, leveduras, cocos e bastonetes");
    expect(isBareEnumeration("ácaros, leveduras, cocos e bastonetes")).toBe(true);
  });
});

describe("arco narrativo", () => {
  const arc = buildArc({
    hook: "A coceira volta sempre depois do banho",
    scene: "Tutor troca de shampoo e o quadro reaparece",
    mechanism: "Citologia cutânea identifica Malassezia na pele",
    proof: "Lâmina lida na consulta, com laudo claro",
    cta: "Agende a investigação dermatológica",
  });

  it("aceita arco completo", () => {
    expect(checkArc(arc).complete).toBe(true);
  });

  it("recusa etapas que dizem a mesma coisa", () => {
    const check = checkArc({ ...arc, proof: arc.mechanism });
    expect(check.complete).toBe(false);
    expect(check.problems.join(" ")).toMatch(/etapas repetidas/);
  });

  it("exige verbo de ação no próximo passo", () => {
    const check = checkArc({ ...arc, next: "Dermatologia veterinária" });
    expect(check.problems.join(" ")).toMatch(/verbo de ação/);
  });

  it("mede similaridade entre frases", () => {
    expect(textSimilarity("coceira que volta sempre", "coceira que volta sempre")).toBeGreaterThan(0.9);
    expect(textSimilarity("coceira crônica", "nódulo no tórax")).toBeLessThan(0.2);
  });

  it("recusa título pendurado e mecanismo em forma de lista", () => {
    expect(hasDanglingEnding("Outra noite sem dormir por causa")).toBe(true);
    expect(checkArc({ ...arc, hook: "Outra noite sem dormir por causa" }).problems.join(" ")).toMatch(/etapa incompleta/);
    expect(checkArc({ ...arc, mechanism: "ácaros, leveduras, cocos e bastonetes" }).problems.join(" ")).toMatch(/lista sem explicação/);
  });
});

describe("valor de venda do assunto", () => {
  const base = { painFrequency: 1, objectionProximity: 0, hasProof: false, specificity: 0, coverageUsed: 0 };

  it("prefere assunto com objeção e prova", () => {
    const ranked = rankTopics([
      { id: "generico", ...base },
      { id: "otite", ...base, painFrequency: 3, objectionProximity: 1, hasProof: true, specificity: 1 },
    ]);
    expect(ranked[0].id).toBe("otite");
  });

  it("desconta assunto já muito usado", () => {
    const fresh = salesValueScore({ id: "a", ...base, painFrequency: 2, coverageUsed: 0 });
    const tired = salesValueScore({ id: "a", ...base, painFrequency: 2, coverageUsed: 1 });
    expect(tired).toBeLessThan(fresh);
  });

  it("ordena de forma determinística em empate", () => {
    const ranked = rankTopics([{ id: "b", ...base }, { id: "a", ...base }]);
    expect(ranked.map((item) => item.id)).toEqual(["a", "b"]);
  });
});
