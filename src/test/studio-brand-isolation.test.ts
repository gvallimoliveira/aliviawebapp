import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * TRAVAS DO APRENDIZADO DE ONBOARDING DE MARCA (docs/studio-brand-onboarding-playbook.md).
 *
 * Cada asserção existe porque o erro correspondente já aconteceu com uma marca real de
 * terceiro no Studio público. Documentação sozinha não impede regressão — este arquivo sim.
 *
 * Escopo deliberadamente estreito: auditamos apenas o que precisa ser NEUTRO —
 * os blocos de arte (rodam para qualquer marca) e o acervo de conteúdo genérico.
 * O conteúdo do mundo interno (`pages/studio/content/*`, landings, kit da marca dona)
 * fala da Aliv.iA por definição e está fora da auditoria.
 */

const root = path.resolve(__dirname, "..");
const blocksDir = path.join(root, "pages/studio/blocks");
const neutralAcervo = path.join(root, "pages/studio-pro/brandContent.ts");

/** Comentários podem citar a marca dona; só código executável é auditado. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const readCode = (file: string) => stripComments(fs.readFileSync(file, "utf8"));

const OWNER_BRAND = /Aliv\.?\s?iA|aliviawebapp/i;

describe("Studio: blocos e acervo neutro não carregam a marca dona", () => {
  const blockFiles = fs
    .readdirSync(blocksDir)
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => path.join(blocksDir, f));

  it("nenhum bloco de arte cita a marca dona em código", () => {
    expect(blockFiles.length).toBeGreaterThan(10);
    const leaks = blockFiles
      .filter((f) => OWNER_BRAND.test(readCode(f)))
      .map((f) => path.basename(f));
    expect(leaks, `blocos com marca fixa: ${leaks.join(", ")}`).toEqual([]);
  });

  it("o acervo de conteúdo genérico do Studio público é neutro", () => {
    const code = readCode(neutralAcervo);
    const literals = code.match(/(?:"[^"\n]*"|'[^'\n]*')/g) ?? [];
    // Owner-brand helper identifiers/import paths are not visible copy.
    expect(literals.filter((s) => !s.includes("./aliviaCoreCharm")).some((s) => OWNER_BRAND.test(s))).toBe(false);
  });

  it("blocos leem o nome da marca pelo binding, não por string", () => {
    // Ao menos os lockups tipográficos precisam consumir o binding dinâmico.
    const mono = readCode(path.join(blocksDir, "MonoBlock.tsx"));
    expect(mono).toMatch(/brandWordmarkParts|BRAND_NAME/);
  });
});

describe("Studio: vocabulário proibido no acervo neutro", () => {
  it("nada de jargão de gestão de projeto (prazo/responsável/escopo)", () => {
    const code = readCode(neutralAcervo);
    ["prazo", "responsável", "escopo"].forEach((term) => {
      expect(
        new RegExp(`\\b${term}s?\\b`, "i").test(code),
        `termo de gestão proibido no acervo: "${term}"`,
      ).toBe(false);
    });
  });

  it("acervo neutro não promete biblioteca de evidências / PEDro (ainda beta)", () => {
    const code = readCode(neutralAcervo);
    expect(/PEDro/i.test(code)).toBe(false);
  });
});

describe("Studio: texto nunca é entregue cortado", () => {
  it("condensePhrase encurta em fronteira natural, sem reticências", async () => {
    const { condensePhrase } = await import("../pages/studio-pro/textFit");
    const long =
      "Sua recuperação começa aqui com a referência em plataforma de avaliação e acompanhamento de pacientes";
    const out = condensePhrase(long, 48);
    expect(out.length).toBeLessThanOrEqual(48);
    expect(out).not.toMatch(/…|\.\.\.$/);
    expect(out.trim()).not.toMatch(/[,;:]$/);
    expect(out.trim().length).toBeGreaterThan(0);
  });

  it("frase já curta permanece intacta", async () => {
    const { condensePhrase } = await import("../pages/studio-pro/textFit");
    expect(condensePhrase("Movimento sem medo", 48)).toBe("Movimento sem medo");
  });
});
