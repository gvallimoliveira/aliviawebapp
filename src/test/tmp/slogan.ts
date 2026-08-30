import { buildSegmentContent, relationForSegment } from "../../pages/studio-pro/brandContent";
import { audiencesWithSlogan, SLOGAN_SEGMENT } from "../../pages/studio-pro/audiences";
const kit: any = {
  name: "Guilherme Vallim Fisioterapia",
  niche: "Fisioterapia",
  tone: "sócio experiente",
  description: "Fisioterapia ortopédica e esportiva",
  slogan: "Onde a dor insistiu em ficar, o raciocínio clínico encontra a saída.",
};
const auds = audiencesWithSlogan([{ id: "dor-cronica", label: "Dor Crônica", keyword: "Dor crônica", hook: "Você que convive com dor", cta: "Entenda a sua dor", pains: ["dor que não passa"], desires: ["alívio"], proof: ["raciocínio clínico"] }] as any, kit.slogan);
for (const angle of ["informar","dor","desejo","venda"] as const) {
  const c = buildSegmentContent({ kit, audiences: auds, segment: SLOGAN_SEGMENT, angle, variationSeed: "seed-1" });
  const r = relationForSegment({ kit, audiences: auds, segment: SLOGAN_SEGMENT, angle, variationSeed: "seed-1" });
  console.log(angle, "ok", Object.keys(c).length, r ? "rel" : "norel");
}
