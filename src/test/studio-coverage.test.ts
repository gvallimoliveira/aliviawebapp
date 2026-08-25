import { describe, expect, it } from "vitest";
import { WORLDS, WORLD_IDS } from "@/pages/studio/content";
import { TOPICS, isTopicId, imageForTopic, topicsOfWorld } from "@/pages/studio/topics";
import { buildCoverage, countMentions } from "@/pages/studio/coverage";

/**
 * Guardas do sistema mestre do Studio. Estes testes existem para que a regra de
 * coerência (imagem = assunto) e o estudo de cobertura nunca dependam de
 * disciplina manual de quem escreve copy.
 */
describe("Studio · registro de tópicos", () => {
  it("todo tópico tem label e, quando declara imagem, ela é um asset resolvido", () => {
    Object.entries(TOPICS).forEach(([id, topic]) => {
      expect(topic.label, `label ausente em ${id}`).toBeTruthy();
      if ("image" in topic && topic.image !== undefined) {
        expect(typeof topic.image, `imagem inválida em ${id}`).toBe("string");
        expect(topic.image.length).toBeGreaterThan(0);
      }
    });
  });

  it("imageForTopic é a ÚNICA fonte de imagem e nunca inventa fallback", () => {
    // "difi" não tem screenshot da tela exata: não pode devolver imagem de outro assunto.
    expect(imageForTopic("difi")).toBeUndefined();

    expect(imageForTopic("pain-map")).toBeTruthy();
    expect(imageForTopic(undefined)).toBeUndefined();
  });
});

describe("Studio · coerência do conteúdo", () => {
  WORLD_IDS.forEach((world) => {
    const content = WORLDS[world];

    it(`${world}: todo item de copy declara um tópico válido`, () => {
      content.features.forEach((f) => {
        expect(isTopicId(f.topic), `feature sem tópico válido: ${f.title}`).toBe(true);
      });
      content.journeys.forEach((j) =>
        j.steps.forEach((s) => {
          expect(isTopicId(s.topic), `passo sem tópico válido: ${s.title}`).toBe(true);
        }),
      );
      content.compare.forEach((c) =>
        (c.topics ?? []).forEach((t) => {
          expect(isTopicId(t), `comparativo com tópico inválido: ${c.title}`).toBe(true);
        }),
      );
      content.kinetic.forEach((k) => {
        if (k.topic) expect(isTopicId(k.topic)).toBe(true);
      });
      content.quotes.forEach((q) => {
        if (q.topic) expect(isTopicId(q.topic)).toBe(true);
      });
    });

    it(`${world}: nenhum item de copy carrega imagem escrita à mão`, () => {
      const carriers: unknown[] = [
        ...content.features,
        ...content.journeys.flatMap((j) => j.steps),
        ...content.compare,
        ...content.kinetic,
        ...content.quotes,
      ];
      carriers.forEach((item) => {
        expect("image" in (item as object), `imagem manual encontrada: ${JSON.stringify(item)}`).toBe(false);
      });
    });

    it(`${world}: todo tópico monitorado é mencionado pelo menos uma vez no acervo`, () => {
      const mentions = countMentions(content);
      // `pricing` e `safety` vivem nas headlines/ofertas; o restante precisa de copy própria.
      const exempt = new Set(["pricing", "safety"]);
      const missing = topicsOfWorld(world).filter((t) => !exempt.has(t) && !mentions[t]);
      expect(missing, `sem nenhuma copy declarada: ${missing.join(", ")}`).toEqual([]);
    });

    it(`${world}: cobertura prioriza assunto subexposto sobre assunto saturado`, () => {
      const coverage = buildCoverage(world, content, { [world]: {} });
      const ranked = [...coverage.topics].sort((a, b) => b.debt - a.debt);
      expect(ranked[0].debtScore).toBe(100);
      expect(coverage.priorityTopics(5)).toHaveLength(5);

      const saturated = buildCoverage(world, content, {
        [world]: { [ranked[0].id]: 20 },
      });
      expect(saturated.debtOf(ranked[0].id)).toBeLessThan(coverage.debtOf(ranked[0].id));
    });
  });
});
