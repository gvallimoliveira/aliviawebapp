import { it } from "vitest";
import { buildBrandContent } from "@/pages/studio-pro/brandContent";
it("dbg", () => {
  const kit = { name: "PerformaPro", niche: "treino", tone: "técnico", keywords: ["força"] };
  const a = buildBrandContent(kit, { seed: "a" }, []);
  const b = buildBrandContent(kit, { seed: "b" }, []);
  console.log(a.headlines.length, b.headlines.length);
  console.log(a.headlines.slice(0,3), b.headlines.slice(0,3));
});
