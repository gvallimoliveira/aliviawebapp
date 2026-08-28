import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ArtworkGuard from "@/pages/studio/ArtworkGuard";
describe("ArtworkGuard", () => {
  it("renderiza arte sem recursão", () => {
    const { container } = render(<ArtworkGuard brand="X"><section><p>arte</p></section></ArtworkGuard>);
    expect(container.textContent).toBe("arte");
  });
  it("mostra fallback quando vazio", () => {
    const { container } = render(<ArtworkGuard brand="X">{null}</ArtworkGuard>);
    expect(container.textContent).toContain("X");
  });
});
