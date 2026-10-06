import { describe, expect, it } from "vitest";
import { applyArtText, collectEditableNodes, readArtText, setArtEditing } from "@/pages/studio/artTextEdit";

const mount = (id: string, rows = 2) => {
  const root = document.createElement("div");
  root.id = id;
  root.innerHTML = `<h2>Comparação</h2><p>Antes</p><ul>${Array.from({ length: rows }, (_, i) =>
    `<li><svg aria-hidden="true"><path d="M0 0L1 1" /></svg><span>Argumento ${i + 1}</span></li>`).join("")}</ul><p>Com a marca</p>`;
  document.body.append(root);
  return root;
};

describe("ícones de listagem durante edição", () => {
  it("edita somente a frase e preserva os ícones ao reaplicar textos", () => {
    const root = mount("list-icon-edit");
    const nodes = collectEditableNodes(root);
    expect(nodes[2].tagName).toBe("SPAN");
    const edits = readArtText(root);
    edits[2] = "Novo argumento";
    applyArtText(root, edits);
    expect(root.querySelectorAll("li svg")).toHaveLength(2);
    expect(root.querySelector("li span")?.textContent).toBe("Novo argumento");
    setArtEditing(root, true);
    expect(root.querySelector("li")?.getAttribute("contenteditable")).toBeNull();
    expect(root.querySelector("li span")?.getAttribute("contenteditable")).toBe("true");
    setArtEditing(root, false);
    root.remove();
  });

  it("não desloca o snapshot antigo ao remover uma linha duplicada", () => {
    const old = mount("old-list", 3);
    const edits = readArtText(old);
    old.remove();
    const next = mount("new-list", 2);
    applyArtText(next, edits);
    expect(next.querySelectorAll("li svg")).toHaveLength(2);
    expect(next.querySelector("p:last-child")?.textContent).toBe("Com a marca");
    expect(next.querySelectorAll("li span")[1]?.textContent).toBe("Argumento 2");
    next.remove();
  });

  it("esvaziar um item não apaga seu ícone e permite restaurar sua frase", () => {
    const root = mount("empty-list");
    const edits = readArtText(root);
    edits[2] = "";
    applyArtText(root, edits);
    expect(root.querySelectorAll("li svg")).toHaveLength(2);
    edits[2] = "Argumento restaurado";
    applyArtText(root, edits);
    expect(root.querySelector("li span")?.textContent).toBe("Argumento restaurado");
    root.remove();
  });
});