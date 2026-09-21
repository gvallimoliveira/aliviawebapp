/**
 * REGRESSÃO: sub-nicho "Slogan em destaque" (marca real com 7 públicos).
 *
 * O clique nesse público deixava o Studio em tela branca. Este teste monta o
 * conteúdo do segmento, aplica o filtro de nexo e RENDERIZA todos os blocos da
 * leva — falhando se algum bloco quebrar ou se o React acusar chave duplicada
 * (o slogan entrava duas vezes na mesma lista e os nós se repetiam na tela).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { buildSegmentContent, relationForSegment } from "../pages/studio-pro/brandContent";
import { audiencesWithSlogan, resolveAudience, SLOGAN_SEGMENT } from "../pages/studio-pro/audiences";
import type { BrandAudience } from "../pages/studio-pro/audiences";
import { varyContent } from "../pages/studio/vary";
import { voiceRegister } from "../pages/studio/lexicon";
import { STUDIO_BLOCKS, buildCaption, buildCoverage, composePage, createPicker, createRng, personaForSeed } from "../studio-core";
import { enforceRationale, explainArt, rationaleText } from "../pages/studio/rationale";
import AutoFit from "../pages/studio/AutoFit";
import ArtworkGuard from "../pages/studio/ArtworkGuard";

const SLOGAN = "Onde a dor insistiu em ficar, o raciocínio clínico encontra a saída.";
const NAME = "Guilherme Vallim Fisioterapia";

const audienceOf = (id: string, label: string, parentId?: string): BrandAudience => ({
  id,
  label,
  keyword: label,
  hook: `Você que convive com ${label.toLowerCase()}`,
  hooks: [`Você que já tentou de tudo por causa de ${label.toLowerCase()}`],
  cta: "Entenda a sua dor",
  pains: [`Dor de ${label.toLowerCase()} que não passa.`, "Frustração com soluções paliativas."],
  desires: ["Compreender a causa exata da dor.", "Voltar a se mover sem medo."],
  proof: ["Raciocínio clínico estruturado para identificar a causa."],
  description: `Adultos que buscam ${label.toLowerCase()}.`,
  ...(parentId ? { parentId } : {}),
});

const AUDIENCES = audiencesWithSlogan(
  [
    audienceOf("dor-cronica", "Dor Crônica"),
    audienceOf("pos-operatorio", "Pós-operatório"),
    audienceOf("esportista-performance", "Performance esportiva"),
    audienceOf("geracao-60", "Geração 60+"),
    audienceOf("vestibular", "Reabilitação vestibular"),
    audienceOf("feridas", "Feridas"),
    audienceOf("domiciliar-rj", "Atendimento domiciliar", "dor-cronica"),
  ],
  SLOGAN,
);

const KIT = {
  name: NAME,
  niche: "Fisioterapeuta traumato ortopedico e esportivo",
  tone: "Direto e provocativo, mas acolhedor e educativo, como um sócio experiente.",
  description: "Fisioterapia focada na causa da dor, com método próprio e atendimento acolhedor.",
  keywords: ["raciocínio clínico", "causa da dor", "método", "avaliação"],
  positioning: "Caminho claro, focado na causa da dor, com metodologia própria.",
  slogan: SLOGAN,
};

let errors: string[] = [];
let spy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errors = [];
  // framer-motion precisa destes recursos de navegador no jsdom.
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
  (Element.prototype as unknown as { animate: unknown }).animate = () => ({
    finished: Promise.resolve(),
    cancel() {},
    play() {},
    pause() {},
    commitStyles() {},
    addEventListener() {},
    removeEventListener() {},
    currentTime: 0,
    startTime: 0,
    playState: "finished",
  });
  spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    errors.push(args.map((a) => String(a)).join(" "));
  });
});

afterEach(() => spy.mockRestore());

describe("slogan em destaque", () => {
  it("mantém separação entre as partes de toda manchete", () => {
    const built = buildSegmentContent({
      kit: KIT as never,
      audiences: AUDIENCES,
      segment: SLOGAN_SEGMENT,
      angle: "informar",
      positioning: "Caminho claro, focado na causa da dor.",
      variationSeed: "separacao-de-manchete",
    });

    built.headlines.forEach((headline) => {
      const statement = `${headline.strong} ${headline.rest}`.replace(/\s+/g, " ").trim();
      expect(statement).not.toMatch(/[a-zà-ÿ]\.[A-ZÀ-Ý]/u);
      if (headline.strong && headline.rest) {
        expect(statement).toContain(`${headline.strong} ${headline.rest}`);
      }
    });
  });

  it("renderiza a leva inteira sem quebrar e sem chave duplicada", () => {
    for (const angle of ["informar", "dor", "desejo", "venda"] as const) {
      for (let s = 0; s < 3; s += 1) {
        const seed = `seed-${s}`;
        const vs = `brand:${seed}:${SLOGAN_SEGMENT}:${angle}`;
        const built = buildSegmentContent({
          kit: KIT as never,
          audiences: AUDIENCES,
          segment: SLOGAN_SEGMENT,
          angle,
          positioning: "Caminho claro, focado na causa da dor.",
          variationSeed: vs,
        });
        const content = varyContent(built, {
          register: voiceRegister("sócio experiente", NAME),
          seed: vs,
          forbidden: ["aliv.ia", "alivia"],
        });
        const persona = personaForSeed(seed);
        const picker = createPicker(buildCoverage("pro", content, {}), () => {});
        const blocks = composePage(createRng(`${vs}:layout`), persona, undefined, content.carousels, 0, undefined, false);
        const audience = resolveAudience(AUDIENCES, SLOGAN_SEGMENT);
        const relation = relationForSegment({
          kit: KIT as never,
          audiences: AUDIENCES,
          segment: SLOGAN_SEGMENT,
          angle,
          variationSeed: vs,
        });
        const ctx = {
          content,
          audienceLabel: audience?.label,
          keyword: audience?.keyword,
          hook: audience?.hook,
          cta: audience?.cta,
          angle,
          photoCount: 0,
          brandName: NAME,
          relation,
          brand: { niche: KIT.niche, tone: KIT.tone, description: KIT.description, topics: KIT.keywords, briefAnswered: 0 },
        } as never;
        const audit = enforceRationale(blocks, ctx);
        expect(audit.blocks.length).toBeGreaterThan(3);
        audit.blocks.forEach((block, index) => {
          const Block = STUDIO_BLOCKS[block.kind];
          expect(Block).toBeTruthy();
          expect(buildCaption(content, block.kind, createRng(`cap-${index}`))).toBeTruthy();
          expect(
            rationaleText(
              explainArt(block, ctx, { index, total: audit.blocks.length, copy: [], formatLabel: "Livre", personaLabel: persona.name }),
            ),
          ).toBeTruthy();
          const view = render(
            <ArtworkGuard brand={NAME}>
              <AutoFit resetKey={`${vs}:${index}`}>
                <Block
                  content={content}
                  rng={createRng(`${vs}:${block.kind}:${index}`)}
                  treatment={block.treatment}
                  format="free"
                  picker={picker}
                  persona={persona}
                  slide={block.slide}
                  photos={[]}
                />
              </AutoFit>
            </ArtworkGuard>,
          );
          view.unmount();
        });
      }
    }
    expect(errors.filter((e) => e.includes("same key"))).toEqual([]);
  });
});
