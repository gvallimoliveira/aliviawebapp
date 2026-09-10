import { describe, expect, it } from "vitest";
import {
  createStaticExportSurface,
  freezeMotion,
  lockRenderedTextLines,
  lockUniformHeight,
  readStrokeTextRuns,
} from "@/pages/studio/exportImage";

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

  it("engessa no clone as linhas vistas sem alterar a arte original", () => {
    const source = document.createElement("div");
    source.innerHTML = '<p style="display:block">O prontuário contou por ela.</p>';
    const clone = source.cloneNode(true) as HTMLElement;
    const textNode = source.querySelector("p")?.firstChild;
    expect(textNode).toBeTruthy();

    const originalCreateRange = document.createRange.bind(document);
    document.createRange = (() => {
      const range = originalCreateRange();
      let start = 0;
      range.setStart = ((_node: Node, offset: number) => { start = offset; }) as typeof range.setStart;
      range.setEnd = (() => undefined) as typeof range.setEnd;
      range.getBoundingClientRect = (() => ({
        x: 0,
        y: start < 22 ? 10 : 30,
        top: start < 22 ? 10 : 30,
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
    expect(source.querySelector("[data-studio-export-line='1']")).toBeNull();
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
});

describe("stroke text fidelity", () => {
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
