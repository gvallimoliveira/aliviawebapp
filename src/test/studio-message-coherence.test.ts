import { describe, expect, it } from "vitest";
import { removeTitleDescriptionEcho } from "@/pages/studio-pro/veterinaryVoice";
import { finalizeListCoherence } from "@/pages/studio/listCoherence";

describe("Studio message coherence", () => {
  it("never fills an echoed support with the generic engine phrase", () => {
    const title = "Roupas de cama e banho para a sua estadia.";
    expect(removeTitleDescriptionEcho(title, "Roupas de cama e banho para a sua estadia.")).toBe("");
  });

  it("drops list items that only restate the headline", () => {
    const list = finalizeListCoherence({
      headline: "Natureza privativa e vista para o mar para aproveitar juntos.",
      items: ["Natureza privativa e vista para o mar para aproveitar juntos.", "Borda infinita de frente para o mar."],
    });
    expect(list.items).toEqual(["Borda infinita de frente para o mar."]);
  });
});
