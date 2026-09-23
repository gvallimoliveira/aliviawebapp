import { describe, expect, it } from "vitest";
import {
  createStaticExportSurface,
  calculateCoverCrop,
  freezeMotion,
  lockRenderedTextLines,
  lockUniformHeight,
  readStrokeTextRuns,
} from "@/pages/studio/exportImage";

describe("photo crop fidelity", () => {
  it("respeita o foco horizontal em fotos largas", () => {
    expect(calculateCoverCrop(1600, 900, 400, 500, 0, 50)).toEqual({
      sx: 0,
      sy: 0,
      sw: 720,
      sh: 900,
    });
    expect(calculateCoverCrop(1600, 900, 400, 500, 100, 50).sx).toBe(880);
  });

  it("respeita o foco vertical em fotos altas", () => {
    expect(calculateCoverCrop(900, 1600, 500, 400, 50, 100)).toEqual({
      sx: 0,
      sy: 880,
      sw: 900,
      sh: 720,
    });
  });
});

/**
 * Slides de carrossel fora do centro da tela eram capturados no meio do efeito
 * de scroll — a arte saía deslocada/parcial no PNG. A exportação precisa zerar
 * essas camadas antes de rasterizar e devolver tudo ao normal depois.
 */
describe("freezeMotion", () => {
  const build = () => {
    const root = document.createElement("div");
    root.innerHTML = `
      <div data-studio-motion="1" style="transform: translateY(70px) scale(0.9); opacity: 0.72; filter: blur(8px); clip-path: inset(0% 0% 12% 0%)">
        <h2>Headline</h2>
      </div>
      <div class="assinatura">Marca</div>
    `;
    document.body.appendChild(root);
    return { root, layer: root.querySelector<HTMLElement>('[data-studio-motion="1"]')! };
  };

  it("neutraliza transform, opacidade, desfoque e recorte durante a captura", () => {
    const { root, layer } = build();
    const restore = freezeMotion(root);

    expect(layer.style.transform).toBe("none");
    expect(layer.style.opacity).toBe("1");
    expect(layer.style.filter).toBe("none");
    expect(layer.style.clipPath).toBe("none");

    restore();
    expect(layer.style.transform).toContain("translateY(70px)");
    expect(layer.style.opacity).toBe("0.72");
    expect(layer.style.filter).toContain("blur");
  });

  it("também congela quando o próprio nó exportado é a camada animada", () => {
    const node = document.createElement("div");
    node.dataset.studioMotion = "1";
    node.style.transform = "translateX(80px)";
    document.body.appendChild(node);

    const restore = freezeMotion(node);
    expect(node.style.transform).toBe("none");
    restore();
    expect(node.style.transform).toBe("translateX(80px)");
  });
});

describe("static export surface", () => {
  it("clona a arte fora da tela e neutraliza o movimento sem alterar o original", async () => {
    const root = document.createElement("div");
    root.style.width = "320px";
    root.style.height = "480px";
    root.innerHTML = '<div data-studio-motion="1" style="transform:translateY(70px);opacity:.72">Arte</div>';
    document.body.appendChild(root);

    const surface = await createStaticExportSurface(root);
    const original = root.querySelector<HTMLElement>('[data-studio-motion="1"]');
    const clone = surface.node.querySelector<HTMLElement>('[data-studio-motion="1"]');

    expect(surface.node.isConnected).toBe(true);
    expect(clone?.style.transform).toBe("none");
    expect(clone?.style.opacity).toBe("1");
    expect(original?.style.transform).toContain("translateY(70px)");

    surface.dispose();
    expect(surface.node.isConnected).toBe(false);
    root.remove();
  });

  it("mantém o clone em coordenadas pintáveis no iPhone e limpa o estado transitório da edição", async () => {
    const root = document.createElement("div");
    root.style.width = "320px";
    root.style.height = "480px";
    root.innerHTML = '<h2 data-studio-text-slot="1" contenteditable="true" spellcheck="false" style="outline:1px dashed currentColor;cursor:text">Carga Planejada</h2>';
    document.body.appendChild(root);

    const surface = await createStaticExportSurface(root);
    const host = surface.node.parentElement;
    const title = surface.node.querySelector<HTMLElement>("h2");

    expect(host?.style.left).toBe("0px");
    expect(host?.style.zIndex).toBe("-2147483647");
    expect(title?.textContent).toBe("Carga Planejada");
    expect(title?.contentEditable).toBe("false");
    expect(title?.style.outline).toBe("");

    surface.dispose();
    root.remove();
  });

  it("engessa no clone as linhas vistas sem alterar a arte original", () => {
    const source = document.createElement("div");
    source.innerHTML = '<p style="display:block">O prontuário contou por ela.</p>';
    const clone = source.cloneNode(true) as HTMLElement;
    const textNode = source.querySelector("p")?.firstChild;
    const paragraph = source.querySelector("p");
    expect(textNode).toBeTruthy();
    if (!paragraph) throw new Error("Parágrafo de teste ausente");
    Object.defineProperty(paragraph, "offsetWidth", { value: 240 });

    const originalCreateRange = document.createRange.bind(document);
    document.createRange = (() => {
      const range = originalCreateRange();
      let start = 0;
      range.setStart = ((_node: Node, offset: number) => { start = offset; }) as typeof range.setStart;
      range.setEnd = (() => undefined) as typeof range.setEnd;
      range.getBoundingClientRect = (() => ({
        x: 0,
        y: start < 23 ? 10 : 30,
        top: start < 23 ? 10 : 30,
        left: 0,
        right: 100,
        bottom: start < 22 ? 20 : 40,
        width: 100,
        height: 10,
        toJSON: () => ({}),
      })) as typeof range.getBoundingClientRect;
      return range;
    }) as typeof document.createRange;

    try {
      lockRenderedTextLines(source, clone);
    } finally {
      document.createRange = originalCreateRange;
    }

    const lines = clone.querySelectorAll<HTMLElement>("[data-studio-export-line='1']");
    expect(lines).toHaveLength(2);
    expect(lines[0]?.textContent).toBe("O prontuário contou por");
    expect(lines[1]?.textContent).toBe("ela.");
    expect(clone.querySelector("p")?.style.width).toBe("240px");
    expect(lines[0]?.style.whiteSpace).toBe("pre");
    expect(source.querySelector("[data-studio-export-line='1']")).toBeNull();
  });

  it("mantém a largura e a quebra do título longo do modelo com foto", () => {
    const source = document.createElement("div");
    source.innerHTML = '<h2 style="display:block">Fisioterapeuta traumato-ortopédico</h2>';
    const clone = source.cloneNode(true) as HTMLElement;
    const title = source.querySelector("h2");
    const textNode = title?.firstChild;
    if (!title || !textNode) throw new Error("Título de teste ausente");
    Object.defineProperty(title, "offsetWidth", { value: 520 });

    const originalCreateRange = document.createRange.bind(document);
    document.createRange = (() => {
      const range = originalCreateRange();
      let start = 0;
      range.setStart = ((_node: Node, offset: number) => { start = offset; }) as typeof range.setStart;
      range.setEnd = (() => undefined) as typeof range.setEnd;
      range.getBoundingClientRect = (() => ({
        x: 0, y: start < 24 ? 20 : 72, top: start < 24 ? 20 : 72,
        left: 0, right: 500, bottom: start < 24 ? 60 : 112,
        width: 500, height: 40, toJSON: () => ({}),
      })) as typeof range.getBoundingClientRect;
      return range;
    }) as typeof document.createRange;

    try {
      lockRenderedTextLines(source, clone);
    } finally {
      document.createRange = originalCreateRange;
    }

    const clonedTitle = clone.querySelector("h2");
    const lines = clonedTitle?.querySelectorAll("[data-studio-export-line]");
    expect(clonedTitle?.style.width).toBe("520px");
    expect(lines).toHaveLength(2);
    expect(lines?.[0]?.textContent).toBe("Fisioterapeuta traumato-");
    expect(lines?.[1]?.textContent).toBe("ortopédico");
  });

  it("normaliza o lote pela maior altura real e restaura os estilos", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    Object.defineProperty(first, "scrollHeight", { value: 500 });
    Object.defineProperty(second, "scrollHeight", { value: 700 });

    const restore = lockUniformHeight([first, second]);
    expect(first.style.height).toBe("700px");
    expect(second.style.minHeight).toBe("700px");
    restore();
    expect(first.style.height).toBe("");
    expect(second.style.minHeight).toBe("");
  });

  it("preserva a indicação de logo em primeiro plano no clone exportado", async () => {
    const root = document.createElement("div");
    root.style.width = "320px";
    root.style.height = "480px";
    root.innerHTML = '<span><img data-studio-export-image-layer="foreground" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Símbolo da marca"></span>';
    document.body.appendChild(root);

    const surface = await createStaticExportSurface(root);
    expect(surface.node.querySelector("img")?.dataset.studioExportImageLayer).toBe("foreground");

    surface.dispose();
    root.remove();
  });

  it("preserva os metadados de enquadramento e máscara da foto no clone", async () => {
    const root = document.createElement("div");
    root.style.width = "320px";
    root.style.height = "480px";
    root.innerHTML = `
      <div data-studio-photo-mask="popout">
        <div data-studio-photo-frame="1">
          <img data-studio-photo="1" data-studio-photo-focus-x="72" data-studio-photo-focus-y="31"
            data-studio-photo-rotation="12" data-studio-photo-scale="1.4"
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Foto" />
        </div>
      </div>`;
    document.body.appendChild(root);

    const surface = await createStaticExportSurface(root);
    const image = surface.node.querySelector<HTMLImageElement>("[data-studio-photo]");
    expect(image?.dataset.studioPhotoFocusX).toBe("72");
    expect(image?.dataset.studioPhotoRotation).toBe("12");
    expect(image?.closest<HTMLElement>("[data-studio-photo-mask]")?.dataset.studioPhotoMask).toBe("popout");

    surface.dispose();
    root.remove();
  });

  it("preserva a camada de exportação da foto que cobre tipografia de fundo", async () => {
    const root = document.createElement("div");
    root.style.width = "320px";
    root.style.height = "480px";
    root.innerHTML = `
      <span aria-hidden="true">PALAVRA</span>
      <div data-studio-photo-frame="1">
        <img data-studio-photo="1" data-studio-export-image-layer="foreground"
          src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="Foto" />
      </div>`;
    document.body.appendChild(root);

    const surface = await createStaticExportSurface(root);
    expect(surface.node.querySelector("img")?.dataset.studioExportImageLayer).toBe("foreground");

    surface.dispose();
    root.remove();
  });
});

describe("stroke text fidelity", () => {
  it("não transforma um destaque inline-block em linhas de bloco", () => {
    const source = document.createElement("p");
    source.innerHTML = '<span>Quem sou: </span><span data-studio-stroke="1" style="display:inline-block">Aliv.iA, um sistema</span><span> de raciocínio.</span>';
    const clone = source.cloneNode(true) as HTMLElement;
    const accent = source.querySelector<HTMLElement>("[data-studio-stroke]");
    const clonedAccent = clone.querySelector<HTMLElement>("[data-studio-stroke]");
    if (!accent || !clonedAccent) throw new Error("Destaque de teste ausente");

    lockRenderedTextLines(source, clone);

    expect(clone.textContent).toBe(source.textContent);
    expect(clonedAccent.querySelector("[data-studio-export-line]")).toBeNull();
    expect(clonedAccent.style.display).toBe("inline-block");
  });

  it("preserva as palavras nas linhas e posições vistas após a edição", () => {
    const element = document.createElement("span");
    element.textContent = "Aliv.iA, um sistema de raciocínio";
    document.body.appendChild(element);

    const originalCreateRange = document.createRange.bind(document);
    document.createRange = (() => {
      const range = originalCreateRange();
      let start = 0;
      range.setStart = ((_node: Node, offset: number) => { start = offset; }) as typeof range.setStart;
      range.setEnd = (() => undefined) as typeof range.setEnd;
      range.getBoundingClientRect = (() => {
        const line = start < 10 ? 0 : start < 21 ? 1 : 2;
        return {
          x: 20,
          y: 40 + line * 32,
          top: 40 + line * 32,
          left: 20,
          right: 100,
          bottom: 64 + line * 32,
          width: 80,
          height: 24,
          toJSON: () => ({}),
        };
      }) as typeof range.getBoundingClientRect;
      return range;
    }) as typeof document.createRange;

    try {
      const runs = readStrokeTextRuns(element);
      expect(runs.map((run) => run.text)).toEqual(["Aliv.iA,", "um", "sistema", "de", "raciocínio"]);
      expect(new Set(runs.map((run) => run.rect.top))).toEqual(new Set([40, 72, 104]));
    } finally {
      document.createRange = originalCreateRange;
      element.remove();
    }
  });
});
