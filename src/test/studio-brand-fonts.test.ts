import { describe, expect, it, vi } from "vitest";
import { ensureFontLoaded, findFont, isSerifFont } from "@/pages/studio-pro/brandFonts";

describe("fontes do Studio", () => {
  it("não confunde sans-serif com serifada", () => {
    expect(isSerifFont(findFont("inter"))).toBe(false);
    expect(isSerifFont(findFont("outfit"))).toBe(false);
    expect(isSerifFont(findFont("playfair"))).toBe(true);
  });

  it("carrega Inter sem recursão e carrega a fonte de título serifada", () => {
    document.head.querySelectorAll('[id^="studio-font-"]').forEach((node) => node.remove());
    const append = vi.spyOn(document.head, "appendChild");

    expect(() => ensureFontLoaded("inter")).not.toThrow();
    expect(document.getElementById("studio-font-inter")).not.toBeNull();

    expect(() => ensureFontLoaded("playfair")).not.toThrow();
    expect(document.getElementById("studio-font-playfair")).not.toBeNull();
    expect(append).toHaveBeenCalledTimes(2);
    append.mockRestore();
  });
});