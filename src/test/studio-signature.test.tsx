import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { hasOwnLockup } from "@/pages/studio-pro/StudioProSignature";
import StudioSignature from "@/pages/studio/blocks/StudioSignature";

describe("assinatura das artes do Studio", () => {
  it("não acrescenta a logo completa quando o modelo já mostra o símbolo da marca", () => {
    const art = document.createElement("div");
    const mark = document.createElement("img");
    mark.setAttribute("data-brand-mark", "1");
    vi.spyOn(mark, "getBoundingClientRect").mockReturnValue({
      width: 96,
      height: 96,
      top: 0,
      right: 96,
      bottom: 96,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    art.appendChild(mark);

    expect(hasOwnLockup(art, "Dra. Aline Furtado")).toBe(true);
  });

  it("respeita modelos que declaram o próprio rodapé de marca", () => {
    const art = document.createElement("div");
    const footer = document.createElement("footer");
    footer.setAttribute("data-studio-own-lockup", "1");
    art.appendChild(footer);
    expect(hasOwnLockup(art, "Dra. Aline Furtado")).toBe(true);
  });

  it("torna a assinatura inequívoca mesmo quando o arquivo de logo contém só o símbolo", () => {
    render(<StudioSignature />);
    expect(screen.getByText("Aliv.iA")).toBeTruthy();
    expect(document.querySelector('[data-studio-brand-signature="1"]')).toBeTruthy();
  });
});