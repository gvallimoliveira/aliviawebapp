import { describe, expect, it } from "vitest";
import {
  applyLearnedCopy,
  buildRewrites,
  buildVocabularyRewrites,
  type LearnedRewrite,
} from "@/pages/studio/copyLearning";

describe("studio learned vocabulary", () => {
  const rows: LearnedRewrite[] = [
    { original: "Libera prazo para o que importa.", edited: "Libera tempo para o que importa." },
    { original: "Uma execução medida melhora decisões.", edited: "Uma execução baseada em métricas melhora decisões." },
  ];

  it("extrai as expressões substituídas pelo usuário", () => {
    expect(buildVocabularyRewrites(rows)).toEqual(expect.arrayContaining([
      { from: "prazo", to: "tempo" },
      { from: "execução medida", to: "execução baseada em métricas" },
    ]));
  });

  it("aplica o vocabulário preferido em frases novas", () => {
    const result = applyLearnedCopy(
      { title: "Mais prazo para decidir", support: "Execução medida, evolução visível." },
      buildRewrites(rows),
      buildVocabularyRewrites(rows),
    );
    expect(result.content).toEqual({
      title: "Mais tempo para decidir",
      support: "execução baseada em métricas, evolução visível.",
    });
    expect(result.applied).toBe(2);
  });
});