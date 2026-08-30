import { describe, it } from "vitest";
import { render } from "@testing-library/react";
import brand from "./brand.json";
import { buildSegmentContent, brandSlogan, relationForSegment } from "../../pages/studio-pro/brandContent";
import { audiencesWithSlogan, SLOGAN_SEGMENT, readAudiences, resolveAudience, audienceAncestors } from "../../pages/studio-pro/audiences";
import { varyContent } from "../../pages/studio/vary";
import { voiceRegister } from "../../pages/studio/lexicon";
import { readColorKit } from "../../pages/studio-pro/brandColors";
import { buildBrandThemeStyle } from "../../pages/studio-pro/brandTheme";
import { STUDIO_BLOCKS, composePage, buildCoverage, createPicker, createRng, personaForSeed, buildCaption } from "../../studio-core";
import { enforceRationale, explainArt, rationaleText } from "../../pages/studio/rationale";
import { kindsForModels } from "../../pages/studio/models";
import AutoFit from "../../pages/studio/AutoFit";
import ArtworkGuard from "../../pages/studio/ArtworkGuard";

describe("slogan segment render", () => {
  it("renders all blocks", () => {
    const b: any = brand;
    const audiences = audiencesWithSlogan(readAudiences(b.audiences), b.slogan);
    const kit: any = { name: b.name, niche: b.niche, tone: b.tone, description: b.description, keywords: b.topics, positioning: b.positioning, briefAnswers: b.brief_answers, slogan: b.slogan };
    for (const angle of ["informar","dor","desejo","venda"] as const) {
      for (let s = 0; s < 4; s++) {
        const seed = `s${s}`;
        const vs = `${b.id}:${seed}:${SLOGAN_SEGMENT}:${angle}`;
        const built = buildSegmentContent({ kit, audiences, segment: SLOGAN_SEGMENT, angle, positioning: b.positioning, variationSeed: vs });
        const content = varyContent(built, { register: voiceRegister(b.tone, b.name), seed: vs, forbidden: ["aliv.ia","alivia"] });
        const persona = personaForSeed(`${b.id}:${seed}`);
        const picker = createPicker(buildCoverage("pro", content, {}), () => {});
        const blocks = composePage(createRng(`${vs}:layout`), persona, undefined, content.carousels, 0, kindsForModels([], 0, false), false);
        const audience = resolveAudience(audiences, SLOGAN_SEGMENT);
        const rel = relationForSegment({ kit, audiences, segment: SLOGAN_SEGMENT, angle, positioning: b.positioning, variationSeed: vs });
        const ctx: any = { content, audienceLabel: audience?.label, keyword: audience?.keyword, hook: audience?.hook, cta: audience?.cta, angle, photoCount: 0, brandName: b.name, relation: rel, brand: { niche: b.niche, tone: b.tone, description: b.description, positioning: b.positioning, topics: b.topics, briefAnswered: 0 } };
        const audit = enforceRationale(blocks, ctx);
        const themeStyle = buildBrandThemeStyle({ kit: readColorKit(b.colors), seed });
        audit.blocks.forEach((block: any, index: number) => {
          const Block = STUDIO_BLOCKS[block.kind];
          buildCaption(content, block.kind, createRng("c"+index));
          rationaleText(explainArt(block, ctx, { index, total: audit.blocks.length, copy: [], formatLabel: "Livre", personaLabel: persona.name }));
          const { unmount } = render(
            <div style={themeStyle as any}>
              <ArtworkGuard brand={b.name}>
                <AutoFit resetKey={`${vs}:${index}`}>
                  <Block content={content} rng={createRng(`${vs}:${block.kind}:${index}`)} treatment={block.treatment} format="free" picker={picker} persona={persona} slide={block.slide} photos={[]} />
                </AutoFit>
              </ArtworkGuard>
            </div>
          );
          unmount();
        });
      }
    }
  });
});
