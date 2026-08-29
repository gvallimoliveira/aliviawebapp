/**
 * Editar arte salva não pode gerar arte nova: o instantâneo tem que voltar
 * idêntico, aceitar troca de frase pontual e ignorar código executável.
 */
import { describe, expect, it } from "vitest";
import { sanitizeSnapshotHtml, isArtSnapshot } from "@/pages/studio-pro/artSnapshot";
import { applyArtText, readArtText } from "@/pages/studio/artTextEdit";

const ART = `<div class="p-6"><h1>O movimento seguinte agora é seu</h1><p>Primeira sessão com plano na mão.</p></div>`;

const mount = (html: string) => {
  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
};

describe("instantâneo da arte salva", () => {
  it("mantém o HTML da arte ao sanitizar", () => {
    expect(sanitizeSnapshotHtml(ART)).toContain("O movimento seguinte agora é seu");
    expect(sanitizeSnapshotHtml(ART)).toContain("Primeira sessão com plano na mão.");
  });

  it("remove script, handlers e contenteditable", () => {
    const dirty = `${ART}<script>alert(1)</script><p onclick="alert(2)" contenteditable="true">oi</p>`;
    const clean = sanitizeSnapshotHtml(dirty);
    expect(clean).not.toContain("<script");
    expect(clean).not.toContain("onclick");
    expect(clean).not.toContain("contenteditable");
  });

  it("editar uma frase preserva o resto da arte", () => {
    const root = mount(sanitizeSnapshotHtml(ART));
    const before = readArtText(root);
    applyArtText(root, { ...before, 0: "Seu próximo movimento começa aqui" });
    const after = readArtText(root);
    expect(after[0]).toBe("Seu próximo movimento começa aqui");
    expect(after[1]).toBe(before[1]);
    expect(root.querySelectorAll("h1, p").length).toBe(2);
  });

  it("reconhece só instantâneos com slides", () => {
    expect(isArtSnapshot(null)).toBe(false);
    expect(isArtSnapshot({ version: 1, slides: [] })).toBe(false);
    expect(
      isArtSnapshot({ version: 1, format: "1x1", theme: {}, slides: [{ storage_path: "a", width: 1, height: 1 }] }),
    ).toBe(true);
  });
});
