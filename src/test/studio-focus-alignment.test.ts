import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve(process.cwd(), "src/pages/studio/blocks/FocusBlock.tsx"),
  "utf8",
);

describe("alinhamento universal do modelo das pedras", () => {
  it("mantém as duas setas e o caminho presos ao mesmo eixo central", () => {
    expect(source).toContain('data-studio-focus-axis="1"');
    expect(source).toContain('data-studio-focus-arrow="top"');
    expect(source).toContain('data-studio-focus-arrow="bottom"');
    expect(source).toContain('data-studio-focus-path="1"');
    expect(source).toContain('justifyContent: "center"');
    expect(source).toContain("grid w-full max-w-md justify-items-center");
  });

  it("não condiciona o alinhamento a uma marca específica", () => {
    expect(source).not.toMatch(/isAlivia|ALIVIA_NAME|Guilherme Vallim/);
  });
});