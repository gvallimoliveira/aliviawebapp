import { describe, it, expect } from "vitest";
import { rephrase } from "@/pages/studio/rewrite";
describe("rephrase", () => {
  it("varies", () => {
    for (const lvl of [0.22, 0.58, 0.9]) {
      const out = new Set(Array.from({length: 8}, (_,i)=>rephrase("Um processo claro transforma cuidado em resultado.", {register:"proximo", seed:`s${i}`, intensity: lvl})));
      console.log(lvl, [...out]);
      expect(out.size).toBeGreaterThan(1);
    }
    console.log(rephrase(" existe para resolver o que ficou sem solução.", {register:"direto", seed:"x", intensity:0.9}));
  });
});
