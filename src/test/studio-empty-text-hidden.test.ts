/**
 * Esvaziar um campo de texto na edição é uma decisão de layout: aquele trecho
 * deve sair da arte (invisível), sem erro e sem deixar o retângulo tracejado.
 */
import { describe, expect, it } from "vitest";
import { applyArtText, collectEditableNodes, readArtText, setArtEditing } from "@/pages/studio/artTextEdit";

const mount = (html: string) => {
  const root = document.createElement("div");
  root.id = `empty-${Math.random().toString(36).slice(2)}`;
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
};

describe("campo de texto esvaziado", () => {
  it("fica invisível e sem contorno depois de concluir o ajuste", () => {
    const root = mount("<h1>Título</h1><p>Apoio que vai sair</p>");
    setArtEditing(root, true);
    const support = root.querySelector("p") as HTMLElement;
    support.textContent = "";
    setArtEditing(root, false);
    expect(support.style.visibility).toBe("hidden");
    expect(support.style.outline).toBe("");
    expect(collectEditableNodes(root).length).toBe(2);
    expect(readArtText(root)[1]).toBe("");
    root.remove();
  });

  it("mantém o campo esvaziado na remontagem e permite reescrever nele", () => {
    const first = mount("<h1>Título</h1><p>Apoio</p>");
    setArtEditing(first, true);
    (first.querySelector("p") as HTMLElement).textContent = "";
    setArtEditing(first, false);
    const edits = readArtText(first);
    first.remove();

    const again = mount("<h1>Título</h1><p>Apoio</p>");
    applyArtText(again, edits);
    const support = again.querySelector("p") as HTMLElement;
    expect(support.style.visibility).toBe("hidden");

    setArtEditing(again, true);
    expect(support.style.visibility).toBe("visible");
    support.textContent = "Novo apoio";
    setArtEditing(again, false);
    expect(support.style.visibility).toBe("");
    expect(readArtText(again)[1]).toBe("Novo apoio");
    again.remove();
  });
});
