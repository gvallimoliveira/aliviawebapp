import { buildSegmentContent, relationForSegment } from "../../pages/studio-pro/brandContent";
import { audiencesWithSlogan, SLOGAN_SEGMENT, GLOBAL_SEGMENT } from "../../pages/studio-pro/audiences";
import { varyContent } from "../../pages/studio/vary";
import { voiceRegister } from "../../pages/studio/lexicon";
import { DEFAULT_VARIATION_PROFILE } from "../../pages/studio/variation";
import { composePage, buildCoverage, createPicker, createRng, personaForSeed, buildCaption } from "../../studio-core/index";
import { enforceRationale, explainArt, rationaleText } from "../../pages/studio/rationale";
import { kindsForModels } from "../../pages/studio/models";

const slogan = "Onde a dor insistiu em ficar, o raciocínio clínico encontra a saída.";
const kit: any = {
  name: "Guilherme Vallim Fisioterapia",
  niche: "Fisioterapia ortopédica e esportiva",
  tone: "sócio experiente, acolhedor e técnico",
  description: "Fisioterapia com raciocínio clínico para dores persistentes e pós-operatório.",
  keywords: ["fisioterapia", "dor crônica", "pós-operatório", "reabilitação"],
  positioning: "Fisioterapeuta que investiga a causa da dor antes de tratar.",
  briefAnswers: { proposito: "Devolver movimento sem dor", publico: "Adultos 30-60 com dor persistente", crenca: "Dor tem causa e a causa tem plano", oferta: "Avaliação com raciocínio clínico estruturado", inimigo: "Tratamento paliativo" },
  slogan,
};
const ids = ["dor-cronica","pos-operatorio","esportista-performance","geracao-60","vestibular","feridas"];
const base: any[] = ids.map((id,i)=>({ id, label: id, keyword: "K"+i, hook: "Você que convive com "+id, hooks: ["Você que "+id, "Você que já tentou de tudo"], cta: "Entenda sua dor", pains: ["dor que não passa "+i, "medo de piorar"], desires: ["voltar a treinar "+i], proof: ["fisioterapia com raciocínio clínico"] }));
base.push({ id: "domiciliar-rj", label: "Atendimento Domiciliar RJ", parentId: "dor-cronica", keyword: "Domiciliar", hook: "Você que precisa de atendimento em casa", cta: "Agende em casa", pains: ["não consegue sair de casa"], desires: ["tratar em casa"], proof: ["atendimento domiciliar"] });
const auds = audiencesWithSlogan(base as any, slogan);

for (const seg of [SLOGAN_SEGMENT, GLOBAL_SEGMENT]) {
for (const angle of ["informar","dor","desejo","venda"] as const) {
  for (let s = 0; s < 8; s++) {
    const seed = `s${s}`;
    const built = buildSegmentContent({ kit, audiences: auds, segment: seg, angle, positioning: kit.positioning, variationSeed: `b:${seed}:${seg}:${angle}`, variationProfile: DEFAULT_VARIATION_PROFILE });
    const content = varyContent(built, { register: voiceRegister(kit.tone, kit.name), seed: `b:${seed}:${seg}:${angle}`, forbidden: ["aliv.ia","alivia","fisioterap"], profile: DEFAULT_VARIATION_PROFILE });
    const persona = personaForSeed(`b:${seed}`);
    createPicker(buildCoverage("pro", content, {}), () => {});
    for (const photos of [0, 3]) {
      const blocks = composePage(createRng(`b:${seed}:${seg}:${angle}:layout`), persona, undefined, content.carousels, photos, kindsForModels([], photos, false), false);
      const rel = relationForSegment({ kit, audiences: auds, segment: seg, angle, positioning: kit.positioning, variationSeed: `b:${seed}:${seg}:${angle}` });
      const ctx: any = { content, audienceLabel: "Slogan em destaque", keyword: slogan, hook: slogan, cta: "Entenda sua dor", angle, photoCount: photos, brandName: kit.name, relation: { pain: rel.pain, desire: rel.desire, axis: rel.axis }, brand: { niche: kit.niche, tone: kit.tone, description: kit.description, positioning: kit.positioning, topics: kit.keywords, briefAnswered: 5 } };
      const audit = enforceRationale(blocks, ctx);
      audit.blocks.forEach((b: any, i: number) => { rationaleText(explainArt(b, ctx, {} as any)); buildCaption(content as any, b.kind, createRng("cap"+i)); });
    }
  }
}
}
console.log("OK");
