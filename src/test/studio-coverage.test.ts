import fs from "node:fs";
import path from "node:path";
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

    it(`${world}: nenhuma headline termina em verbo infinitivo sem objeto (leitura adversa)`, () => {
      /**
       * Regra anti-ambiguidade: uma headline como "Assimetria calculada para você
       * não precisar" se lê como "você não precisa DA FERRAMENTA", desvalorizando
       * o recurso. Infinitivo pendurado no fim da frase ("precisar", "se preocupar",
       * "calcular", "decidir"…) sem completar o objeto é proibido em títulos.
       */
      const dangling = /\b(para|pra)\s+(você\s+)?(não\s+)?(precisar|se\s+preocupar|calcular|pensar|decidir|fazer|medir|anotar)[\s.!?…"“”]*$/i;
      const headlines: string[] = [
        ...content.features.map((f) => f.title),
        ...content.journeys.flatMap((j) => [j.heading, ...j.steps.map((s) => s.title)]),
        ...content.compare.map((c) => c.title),
        ...content.kinetic.map((k) => k.word),
        ...content.quotes.map((q) => q.text),
        ...content.closings.map((c) => c.title),
      ];
      headlines.forEach((h) => {
        expect(dangling.test(h), `headline com infinitivo pendurado: "${h}"`).toBe(false);
      });
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

/**
 * ISOLAMENTO DE MARCA NOS BLOCOS.
 *
 * Nenhum bloco pode escrever o nome/site/handle da marca dona em texto fixo: as
 * mesmas artes rodam para marcas de clientes no Studio público, e um literal
 * planta "Aliv.iA" no criativo de outra empresa. Todo lockup lê `brand.ts`.
 */
describe("isolamento de marca nos blocos do Studio", () => {
  const dir = path.resolve(__dirname, "../pages/studio/blocks");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".tsx") || f.endsWith(".ts"));

  /** Remove comentários de bloco e de linha — documentação pode citar a marca. */
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("nenhum bloco contém o nome, site ou handle da marca em código", () => {
    expect(files.length).toBeGreaterThan(10);
    const forbidden = [/Aliv\.?iA/i, /aliviawebapp/i, /@?aliviafisio/i];
    files.forEach((file) => {
      const code = stripComments(fs.readFileSync(path.join(dir, file), "utf8"));
      forbidden.forEach((pattern) => {
        expect(pattern.test(code), `${file} cita a marca em texto fixo (${pattern})`).toBe(false);
      });
    });
  });
});
