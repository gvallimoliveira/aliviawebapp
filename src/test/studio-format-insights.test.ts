/**
 * INSIGHTS DE FORMATOS — o diálogo declarado no kit precisa chegar na arte
 * exatamente como foi escrito, e o campo vazio não pode mudar nada.
 */

import { describe, expect, it } from "vitest";
import { readFormatInsights } from "@/pages/studio-pro/formatInsights";
import { buildSegmentContent, type BrandKit } from "@/pages/studio-pro/brandContent";
import { GLOBAL_SEGMENT } from "@/pages/studio-pro/audiences";

const KIT: BrandKit = { name: "Aliv.iA", niche: "fisioterapia", description: "Raciocínio clínico." };

const build = (kit: BrandKit) =>
  buildSegmentContent({ kit, audiences: [], segment: GLOBAL_SEGMENT, angle: "informar", variationSeed: "t1" });

describe("Insights de formatos", () => {
  it("lê título, falas e fecho de cada linha", () => {
    const [insight] = readFormatInsights("Mito e verdade | Dizem que passa | O contexto decide | Faça a avaliação");
    expect(insight.title).toBe("Mito e verdade");
    expect(insight.beats).toEqual(["Dizem que passa", "O contexto decide"]);
    expect(insight.closing).toBe("Faça a avaliação");
    expect(insight.id).toBe("insight-mito-e-verdade");
  });

  it("ignora comentários e linhas vazias", () => {
    expect(readFormatInsights("# só um lembrete\n\nUma ideia real | com fala")).toHaveLength(1);
  });

  it("campo vazio não altera o acervo", () => {
    expect(build({ ...KIT, formatInsights: "" }).headlines).toEqual(build(KIT).headlines);
  });

  it("o diálogo declarado entra nos acervos sem ser reescrito", () => {
    const content = build({
      ...KIT,
      formatInsights: "O que ninguém explica sobre a sua dor | Dor não é só lesão | O contexto decide a conduta | Comece pela avaliação",
    });
    const flat = JSON.stringify(content);
    expect(flat).toContain("Dor não é só lesão");
    expect(flat).toContain("O contexto decide a conduta");
    expect(content.carousels[0].id).toBe("insight-o-que-ninguem-explica-sobre-a-sua-dor");
    expect(content.lists[0].items).toHaveLength(2);
    expect(content.stories[0].moral).toContain("Comece pela avaliação");
  });
});
