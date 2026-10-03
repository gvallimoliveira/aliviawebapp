import { afterEach, describe, expect, it } from "vitest";
import { applyInsertedArtImage, type InsertedArtImage } from "@/pages/studio/artPhotoSwap";

const insertion = (mode: "background" | "composition"): InsertedArtImage => ({
  mode,
  x: 0.5,
  y: 0.5,
  width: 0.4,
  photo: { src: "data:image/png;base64,test", label: "Teste", focusX: 50, focusY: 50, zoom: 1, rotation: 0, safeArea: "none" },
});

describe("imagem inserida em arte textual", () => {
  afterEach(() => { document.body.innerHTML = ""; });

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
    document.getElementById("outside")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
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
});