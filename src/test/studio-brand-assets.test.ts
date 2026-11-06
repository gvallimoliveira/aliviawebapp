import { describe, expect, it } from "vitest";
import { applyStudioBrandTheme, BRAND_LOGO, BRAND_MARK, resetStudioBrandTheme, resolveStudioBrandAsset } from "@/pages/studio/brand";
import physiotechIcon from "@/assets/physiotech-icon.png";

describe("exportable official brand assets", () => {
  it("uses a same-origin copy of the PhysioTech logo, including cache-busted legacy snapshots", () => {
    expect(resolveStudioBrandAsset("https://physiotechapp.lovable.app/apple-touch-icon.png?v=2")).toBe(physiotechIcon);
  });
  it("applies the same copy to logos and repeated marks", () => {
    try {
      applyStudioBrandTheme({ name: "PhysioTech", slogan: "", logo: "https://physiotechapp.lovable.app/apple-touch-icon.png" });
      expect(BRAND_LOGO).toBe(physiotechIcon);
      expect(BRAND_MARK).toBe(physiotechIcon);
    } finally { resetStudioBrandTheme(); }
  });
  it("does not replace another brand's assets or data URLs", () => {
    for (const url of ["https://example.com/apple-touch-icon.png", "/logo.png", "data:image/png;base64,abc"]) {
      expect(resolveStudioBrandAsset(url)).toBe(url);
    }
  });
});