import { describe, expect, it } from "vitest";
import { buildBrandThemeStyle } from "@/pages/studio-pro/brandTheme";

const alineKit = {
  primary: "#4A123D",
  primary2: "#F6EEF1",
  secondary: "#C999A8",
  secondary2: "#F4E9EC",
  extraPrimary: [],
  extraSecondary: [],
  useSecondary: true,
  font: "Montserrat",
};

describe("tema A/B das artes", () => {
  it("troca de fato a superfície e os papéis das cores no lado B", () => {
    const sideA = buildBrandThemeStyle({ kit: alineKit, seed: "aline-1" }) as Record<string, string>;
    const sideB = buildBrandThemeStyle({ kit: alineKit, seed: "aline-1", invert: true }) as Record<string, string>;
    expect(sideB["--background"]).not.toBe(sideA["--background"]);
    expect(sideB["--primary"]).not.toBe(sideA["--primary"]);
    expect(sideB["--foreground"]).not.toBe(sideA["--foreground"]);
  });
});