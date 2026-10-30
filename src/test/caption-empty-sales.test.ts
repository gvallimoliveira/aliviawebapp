import { describe, it, expect } from "vitest";
import { buildCaption } from "@/pages/studio/caption";
import { stripColdSpecs } from "@/pages/studio/captionCoherence";
import { createRng } from "@/pages/studio/rng";
import { WORLDS } from "@/pages/studio/content";

describe("caption with empty sales lists", () => {
  it("stripColdSpecs tolerates undefined", () => {
    expect(stripColdSpecs(undefined)).toBe("");
  });
  it("buildCaption does not crash when offers/objections/ctas are empty", () => {
    const base = WORLDS.pro;
    const content = { ...base, sales: { ...base.sales, offers: [], objections: [], ctas: [] } };
    const out = buildCaption(content as never, "hero", createRng("x"));
    expect(out).not.toContain("undefined");
    expect(out).not.toContain("👉");
  });
});
