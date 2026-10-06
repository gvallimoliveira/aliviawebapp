import { describe, expect, it } from "vitest";
import { clarifyStudioCopy, HEP_MEANING } from "@/pages/studio-pro/contextualCopy";
import { frameEditorialLoss } from "@/pages/studio-pro/narrativeArc";
import { finalizeBrandVoice } from "@/pages/studio-pro/veterinaryVoice";
import { buildAliviaEcosystem, ecosystemCarousel } from "@/pages/studio-pro/aliviaEcosystems";

describe("Clareza e fluidez global do Studio", () => {
  it("explica HEP no apoio, mantendo o título e os vínculos intactos", () => {
    const source = { title: "HEP em vídeo", body: "O paciente consulta os movimentos.", id: "HEP", topic: "hep", photoIds: ["official:alivia:hep-exercise-video"] };
    const revised = clarifyStudioCopy(source);
    expect(revised.title).toBe(source.title);
    expect(revised.body).toContain(`${HEP_MEANING} (HEP)`);
    expect(revised.photoIds).toEqual(source.photoIds);
    expect(revised.id).toBe(source.id);
    expect(clarifyStudioCopy(revised)).toEqual(revised);
  });

  it("explica em cada slide e evita duplicação onde já existe", () => {
    const source = { slides: [
      { heading: "Dose do HEP", body: "Veja a carga da semana." },
      { heading: "HEP em vídeo", body: `${HEP_MEANING} com vídeos.` },
    ] };
    const revised = finalizeBrandVoice(source);
    revised.slides.forEach((slide) => expect(slide.body).toContain(HEP_MEANING));
    expect(revised.slides[1].body.match(/Programa de exercícios domiciliares/g)).toHaveLength(1);
  });

  it("inclui o significado nas etapas e slides do ecossistema", () => {
    const ecosystem = buildAliviaEcosystem("periodizacao");
    ecosystem.steps.filter((step) => /HEP/i.test(step.label)).forEach((step) => expect(step.body).toContain(HEP_MEANING));
    ecosystemCarousel(ecosystem).slides.filter((slide) => /HEP/i.test(slide.heading)).forEach((slide) => expect(slide.body).toContain(HEP_MEANING));
  });

  it("preserva consequências já contextualizadas sem colar outro conector", () => {
    expect(frameEditorialLoss("Sem orientação, os exercícios ficam esquecidos.")).toBe("Sem orientação, os exercícios ficam esquecidos.");
    expect(frameEditorialLoss("Quando os dados se perdem, a decisão atrasa.")).toBe("Quando os dados se perdem, a decisão atrasa.");
    expect(frameEditorialLoss("")).toBe("");
  });

  it("varia naturalmente sem perder a consequência e continua determinístico", () => {
    const losses = ["O registro atrasa", "A dúvida permanece", "O paciente repete a história", "Os detalhes se perdem", "A equipe refaz a coleta", "A consulta começa do zero"];
    const results = losses.map(frameEditorialLoss);
    expect(new Set(results.map((text) => text.split(/[,：:]/)[0])).size).toBeGreaterThan(1);
    losses.forEach((loss, index) => {
      expect(results[index]).toContain(loss.charAt(0).toLowerCase() + loss.slice(1));
      expect(frameEditorialLoss(loss)).toBe(results[index]);
    });
  });

  it("remove o bordão também de textos legados de qualquer marca", () => {
    const revised = finalizeBrandVoice({ title: "Registro", body: "E o custo aparece na rotina: o registro atrasa." }, { brand: "Outra marca" });
    expect(revised.body).not.toMatch(/custo aparece/i);
    expect(revised.body).toContain("o registro atrasa");
  });
});