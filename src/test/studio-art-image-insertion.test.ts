import { afterEach, describe, expect, it } from "vitest";
import { applyInsertedArtImage, artPhotoSlots, resolvePhotoPick, type InsertedArtImage } from "@/pages/studio/artPhotoSwap";

const insertion = (mode: "background" | "composition"): InsertedArtImage => ({
  mode,
  x: 0.5,
  y: 0.5,
  width: 0.4,
  photo: { src: "data:image/png;base64,test", label: "Teste", focusX: 50, focusY: 50, zoom: 1, rotation: 0, safeArea: "none" },
});

describe("imagem inserida em arte textual", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("insere em primeiro plano quando a próxima arte não tem foto para substituir", () => {
    expect(resolvePhotoPick(0, 2, "replace")).toEqual({ slot: 0, mode: "composition" });
  });

  it("limita a substituição às fotos existentes na arte atual", () => {
    expect(resolvePhotoPick(1, 2, "replace")).toEqual({ slot: 0, mode: "replace" });
    expect(resolvePhotoPick(2, 1, "replace")).toEqual({ slot: 1, mode: "replace" });
    expect(resolvePhotoPick(0, 0, "background").mode).toBe("background");
  });

  it("cria um fundo escurecido atrás do texto", () => {
    document.body.innerHTML = '<div id="art"><section><h2>Texto</h2></section></div>';
    const root = document.getElementById("art") as HTMLElement;
    applyInsertedArtImage(root, insertion("background"));
    const layer = root.querySelector<HTMLElement>("[data-studio-inserted-image]");
    const image = layer?.querySelector<HTMLImageElement>("img");
    expect(root.querySelector("section")?.firstElementChild).toBe(layer);
    expect(image?.dataset.studioExportImageLayer).toBe("backdrop");
    expect(image?.style.filter).toContain("brightness");
    expect(root.querySelector("h2")?.style.zIndex).toBe("1");
  });

  it("cria composição exportável acima do texto com alça removida do PNG", () => {
    document.body.innerHTML = '<div id="art"><h2>Texto</h2></div>';
    const root = document.getElementById("art") as HTMLElement;
    applyInsertedArtImage(root, insertion("composition"));
    const layer = root.querySelector<HTMLElement>("[data-studio-inserted-image]");
    expect(layer?.style.zIndex).toBe("30");
    expect(layer?.style.pointerEvents).toBe("none");
    expect(layer?.querySelector("img")?.getAttribute("data-studio-export-image-layer")).toBe("foreground");
    expect(layer?.querySelectorAll("[data-studio-no-export='1']")).toHaveLength(5);
    expect(layer?.querySelector("[data-studio-image-move-handle='1']")).not.toBeNull();
    expect(layer?.querySelectorAll("[data-studio-image-resize-handle]")).toHaveLength(4);
  });

  it("mostra os controles ao tocar na imagem e esconde ao tocar fora", () => {
    document.body.innerHTML = '<div id="outside"></div><div id="art"><section><h2>Texto</h2></section></div>';
    const root = document.getElementById("art") as HTMLElement;
    applyInsertedArtImage(root, insertion("composition"));
    const image = root.querySelector<HTMLImageElement>("[data-studio-inserted-image] img");
    const handle = root.querySelector<HTMLElement>("[data-studio-image-move-handle='1']");
    document.getElementById("outside")?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(handle?.style.display).toBe("none");
    image?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(handle?.style.display).toBe("flex");
  });

  it("remove a inserção anterior ao trocar ou apagar", () => {
    document.body.innerHTML = '<div id="art"><h2>Texto</h2></div>';
    const root = document.getElementById("art") as HTMLElement;
    applyInsertedArtImage(root, insertion("composition"));
    applyInsertedArtImage(root);
    expect(root.querySelector("[data-studio-inserted-image]")).toBeNull();
  });
  it('covers decorative patterns and restores them on removal without hiding text or the logo', () => {
    document.body.innerHTML = '<div id="art"><section><div id="pattern" aria-hidden="true" style="position:absolute;background-image:linear-gradient(red,blue)"></div><img id="logo" data-brand-logo="1"><h2>Texto</h2></section></div>';
    const root = document.getElementById('art');
    const pattern = root?.querySelector<HTMLElement>('#pattern');
    const original = pattern?.getAttribute('style');
    applyInsertedArtImage(root, insertion('background'));
    expect(pattern?.style.display).toBe('none');
    expect(root?.querySelector<HTMLElement>('#logo')?.style.display).not.toBe('none');
    expect(root?.querySelector('h2')?.style.display).not.toBe('none');
    applyInsertedArtImage(root);
    expect(pattern?.getAttribute('style')).toBe(original);
  });

  it("não trata inserções recriadas como slots originais de substituição", () => {
    document.body.innerHTML = '<div id="art"><section><img data-studio-photo="1" src="original.png" /></section></div>';
    const root = document.getElementById("art");
    applyInsertedArtImage(root, insertion("background"));
    expect(artPhotoSlots(root).map((img) => img.getAttribute("src"))).toEqual(["original.png"]);
  });
});