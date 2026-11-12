import { describe, it, expect } from "vitest";
import { cleanSignaturePixels } from "@/lib/cleanSignature";

const px = (rgb: number[], times: number) => Array.from({ length: times }, () => [...rgb, 255]).flat();

describe("signature + stamp", () => {
  it("keeps light blue stamp ink and fine gray stamp text fully visible on white paper", () => {
    const d = new Uint8ClampedArray([...px([255, 255, 255], 10), ...px([110, 140, 220], 1), ...px([140, 140, 140], 1), ...px([20, 20, 20], 1)]);
    cleanSignaturePixels(d);
    expect(d[3]).toBe(0);
    expect(d[10 * 4 + 3]).toBeGreaterThanOrEqual(150);
    expect(d[11 * 4 + 3]).toBeGreaterThanOrEqual(90);
    expect(d[12 * 4 + 3]).toBeGreaterThan(200);
  });
  it("removes shaded paper in phone photos while keeping stamp and handwriting", () => {
    const d = new Uint8ClampedArray([...px([190, 188, 185], 10), ...px([90, 60, 150], 1), ...px([60, 60, 60], 1)]);
    cleanSignaturePixels(d);
    expect(d[3]).toBe(0);
    expect(d[10 * 4 + 3]).toBeGreaterThanOrEqual(150);
    expect(d[11 * 4 + 3]).toBeGreaterThan(90);
  });
});
