import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

/**
 * TRAVAS DO APRENDIZADO DE ONBOARDING DE MARCA (docs/studio-brand-onboarding-playbook.md).
 *
 * Cada asserção aqui existe porque o erro correspondente já aconteceu com uma marca real
 * de terceiro no Studio público. Documentação sozinha não impede regressão — este arquivo sim.
 */

const root = path.resolve(__dirname, "..");
const studioDirs = [
  path.join(root, "pages/studio"),
  path.join(root, "pages/studio/blocks"),
  path.join(root, "pages/studio/content"),
  path.join(root, "pages/studio-pro"),
];

/** Lista arquivos de código de um diretório (sem recursão: cada pasta é declarada acima). */
const codeFiles = (dir: string) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(ts|tsx)$/.test(e.name))
    .map((e) => path.join(dir, e.name));

/** Comentários podem citar a marca dona; só o código executável é auditado. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Arquivos que legitimamente conhecem a marca dona (mundo interno / bindings). */
const OWNER_AWARE = new Set([
  "brand.ts", // define BRAND_NAME e o fallback neutro
  "brandDna.ts", // DNA do produto Aliv.iA, usado só no Studio interno
  "StudioLanding.tsx",
  "StudioProLanding.tsx",
  "StudioProVip.tsx",
  "StudioProAuth.tsx",
  "StudioProApp.tsx",
  "product.ts",
  "plan.ts",
]);

describe("Studio: isolamento da marca dona", () => {
  const audited = studioDirs
    .flatMap(codeFiles)
    .filter((f) => !OWNER_AWARE.has(path.basename(f)));

  it("acervo criativo e blocos não citam a marca dona em código", () => {
    expect(audited.length).toBeGreaterThan(20);
    const leaks: string[] = [];
    audited.forEach((file) => {
      const code = stripComments(fs.readFileSync(file, "utf8"));
      if (/Aliv\.?\s?iA|aliviawebapp/i.test(code)) leaks.push(path.relative(root, file));
    });
    expect(leaks, `marca dona vazando em: ${leaks.join(", ")}`).toEqual([]);
  });
});

describe("Studio: vocabulário proibido no acervo neutro", () => {
  it("nada de jargão de gestão de projeto nos textos gerados", () => {
    const file = path.join(root, "pages/studio-pro/brandContent.ts");
    const code = stripComments(fs.readFileSync(file, "utf8"));
    ["prazo", "responsável", "escopo"].forEach((term) => {
      expect(
        new RegExp(`\\b${term}s?\\b`, "i").test(code),
        `termo de gestão proibido no acervo: "${term}"`,
      ).toBe(false);
    });
  });

  it("blocos de números não mencionam biblioteca de evidências / PEDro (beta)", () => {
    const files = [
      path.join(root, "pages/studio/content/defaults.ts"),
      path.join(root, "pages/studio/content/professional.ts"),
      path.join(root, "pages/studio/content/academic.ts"),
    ].filter(fs.existsSync);
    expect(files.length).toBeGreaterThan(0);
    files.forEach((file) => {
      const code = stripComments(fs.readFileSync(file, "utf8"));
      expect(/PEDro/i.test(code), `${path.basename(file)} cita PEDro`).toBe(false);
    });
  });
});

describe("Studio: texto nunca é entregue cortado", () => {
  it("condensePhrase encurta em fronteira natural, sem reticências", async () => {
    const { condensePhrase } = await import("../pages/studio-pro/textFit");
    const long =
      "Sua recuperação começa aqui com a referência em plataforma de avaliação e acompanhamento de pacientes";
    const out = condensePhrase(long, 48);
    expect(out.length).toBeLessThanOrEqual(48);
    expect(out).not.toMatch(/[…]|\.\.\.$/);
    expect(out.trim()).not.toMatch(/[,;:]$/);
    expect(out.length).toBeGreaterThan(0);
  });

  it("frase já curta permanece intacta", async () => {
    const { condensePhrase } = await import("../pages/studio-pro/textFit");
    expect(condensePhrase("Movimento sem medo", 48)).toBe("Movimento sem medo");
  });
});
