import { describe, expect, it } from "vitest";
import {
  applyArtTextSizes,
  captureArtTextEditSnapshot,
  clearArtTextSizes,
  restoreArtTextEditSnapshot,
  setArtEditing,
} from "@/pages/studio/artTextEdit";

describe("studio text sizing", () => {
  it("aumenta e reduz o texto selecionado e reaplica o tamanho na mesma arte", () => {
    const root = document.createElement("div");
    root.id = "size-art";
    root.innerHTML = '<h2 style="font-size:40px">Título</h2><p style="font-size:20px">Apoio</p>';
    document.body.appendChild(root);

    setArtEditing(root, true);
    const increase = root.querySelector<HTMLButtonElement>('[aria-label="Aumentar texto"]');
    expect(increase).toBeTruthy();
    increase?.click();
    expect(root.querySelector("h2")?.style.fontSize).toBe("44px");

    setArtEditing(root, false);
    root.querySelector("h2")?.style.setProperty("font-size", "");
    applyArtTextSizes(root);
    expect(root.querySelector("h2")?.style.fontSize).toBe("44px");

    clearArtTextSizes(root);
    expect(root.querySelector("h2")?.style.fontSize).toBe("40px");
    root.remove();
  });

  it("cancela texto e tamanho como uma única edição", () => {
    const root = document.createElement("div");
    root.id = "cancel-art";
    root.innerHTML = '<h2 style="font-size:40px">Título original</h2>';
    document.body.appendChild(root);

    const before = captureArtTextEditSnapshot(root);
    setArtEditing(root, true);
    const title = root.querySelector("h2");
    if (title) title.textContent = "Título alterado";
    root.querySelector<HTMLButtonElement>('[aria-label="Diminuir texto"]')?.click();
    expect(title?.style.fontSize).toBe("36px");

    setArtEditing(root, false);
    restoreArtTextEditSnapshot(root, before);
    expect(title?.textContent).toBe("Título original");
    expect(title?.style.fontSize).toBe("40px");
    root.remove();
  });

  it("mantém o tamanho escolhido ao concluir e o remove só no desfazer geral", () => {
    const root = document.createElement("div");
    root.id = "commit-art";
    root.innerHTML = '<h2 style="font-size:40px">Título</h2>';
    document.body.appendChild(root);

    setArtEditing(root, true);
    root.querySelector<HTMLButtonElement>('[aria-label="Aumentar texto"]')?.click();
    setArtEditing(root, false);
    expect(root.querySelector("h2")?.style.fontSize).toBe("44px");

    clearArtTextSizes(root);
    expect(root.querySelector("h2")?.style.fontSize).toBe("40px");
    root.remove();
  });
});