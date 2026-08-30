import { describe, expect, it } from "vitest";
import { freezeMotion } from "@/pages/studio/exportImage";

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
