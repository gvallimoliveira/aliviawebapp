import { describe, it, expect } from "vitest";
import { cleanSignaturePixels } from "@/lib/cleanSignature";

describe("cleanSignaturePixels", () => {
  it("removes white and light-gray checkerboard, keeps dark ink", () => {
    const d = new Uint8ClampedArray([
      255, 255, 255, 255, // white
      204, 204, 204, 255, // checker gray
      20, 20, 20, 255, // ink
    ]);
    cleanSignaturePixels(d);
    expect(d[3]).toBe(0);
    expect(d[7]).toBe(0);
    expect(d[11]).toBeGreaterThan(200);
  });
});
