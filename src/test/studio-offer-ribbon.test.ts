import { describe, expect, it } from "vitest";
import { WORLDS } from "@/pages/studio/content";
import { blockKindSupported, composePage } from "@/pages/studio/composePage";
import { kindsForModels } from "@/pages/studio/models";
import { createRng } from "@/pages/studio/rng";

describe("declared-offer ribbon format", () => {
  it("does not generate an offer without declared sales conditions", () => {
    const content = { ...WORLDS.pro, sales: { ...WORLDS.pro.sales, offers: [] } };
    expect(blockKindSupported("offerRibbon", content)).toBe(false);
    expect(composePage(createRng("no-offer"), undefined, undefined, undefined, 0, ["offerRibbon"], false, false, content).some((b) => b.kind === "offerRibbon")).toBe(false);
  });
  it("selects the new format with declared offers without requiring brand exclusivity", () => {
    const kinds = kindsForModels(["ofertafaixas"], 0, false);
    expect(kinds).toEqual(["offerRibbon"]);
    const blocks = composePage(createRng("ribbon"), undefined, undefined, undefined, 0, kinds, false, false, WORLDS.pro);
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((b) => b.kind === "offerRibbon")).toBe(true);
  });
});