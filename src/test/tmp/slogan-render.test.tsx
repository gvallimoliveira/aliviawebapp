import { describe, it } from "vitest";
globalThis.IntersectionObserver = class { constructor(){} observe(){} unobserve(){} disconnect(){} takeRecords(){return []} } as any;
import { render } from "@testing-library/react";
import { STUDIO_BLOCKS, composePage, buildCoverage, createPicker, createRng, personaForSeed } from "@/studio-core";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { audiencesWithSlogan, SLOGAN_SEGMENT } from "@/pages/studio-pro/audiences";

const slogan = "Onde a dor insistiu em ficar, o raciocínio clínico encontra a saída.";
const kit: any = { name: "Guilherme Vallim Fisioterapia", niche: "Fisioterapia", tone: "sócio experiente", description: "Fisioterapia ortopédica", slogan };
const base: any[] = ["dor-cronica","pos-operatorio","esportista"].map((id,i)=>({id,label:id,keyword:"K"+i,hook:"Você que "+id,cta:"CTA"+i,pains:["dor"+i],desires:["d"+i],proof:["p"+i]}));
const auds = audiencesWithSlogan(base as any, slogan);

describe("slogan segment render", () => {
  it("renderiza todos os blocos", () => {
    for (const angle of ["informar","dor","desejo","venda"] as const) {
      const content = buildSegmentContent({ kit, audiences: auds, segment: SLOGAN_SEGMENT, angle, variationSeed: "s" + angle });
      for (let s = 0; s < 6; s++) {
        const picker = createPicker(buildCoverage("pro", content, {}), () => {});
        const persona = personaForSeed("b:" + s);
        const blocks = composePage(createRng(`b:${s}:layout`), persona, undefined, content.carousels, 0, undefined, false);
        blocks.forEach((b: any, i: number) => {
          const Cmp = (STUDIO_BLOCKS as any)[b.kind];
          if (!Cmp) throw new Error("bloco sem componente: " + b.kind);
          try {
            render(<Cmp block={b} content={content} picker={picker} persona={persona} rng={createRng(`b:${s}:${i}`)} format="free" index={i} treatment={b.treatment ?? 0} />);
          } catch (e) {
            throw new Error(`${angle}/${s}/${b.kind}: ${(e as Error).message}`);
          }
        });
      }
    }
  });
});
