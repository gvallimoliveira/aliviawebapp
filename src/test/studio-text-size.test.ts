import { describe, expect, it } from "vitest";
import {
  applyArtTextSizes,
  clearArtTextSizes,
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
    expect(root.querySelector("h2")?.style.fontSize).toBe("");
    root.remove();
  });
});