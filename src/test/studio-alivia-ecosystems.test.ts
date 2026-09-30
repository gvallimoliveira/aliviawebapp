import { describe, expect, it } from "vitest";
import { composePage } from "@/pages/studio/composePage";
import { createRng } from "@/pages/studio/rng";
import { kindsForModels } from "@/pages/studio/models";
import {
  ALIVIA_ECOSYSTEM_RECIPES,
  buildAliviaEcosystem,
  normalizeEcosystemIds,
  withAliviaEcosystem,
} from "@/pages/studio-pro/aliviaEcosystems";
import { ALIVIA_DIFFERENTIALS } from "@/pages/studio-pro/aliviaDifferentials";
import { WORLDS } from "@/pages/studio/content";

describe("Ecossistema de soluções Aliv.iA", () => {
  it("mantém três cadeias recomendadas com 3–5 funcionalidades canônicas", () => {
    const canonical = new Set(ALIVIA_DIFFERENTIALS.map((item) => item.id));
    expect(ALIVIA_ECOSYSTEM_RECIPES).toHaveLength(3);
    ALIVIA_ECOSYSTEM_RECIPES.forEach((recipe) => {
      expect(recipe.ids.length).toBeGreaterThanOrEqual(3);
      expect(recipe.ids.length).toBeLessThanOrEqual(5);
      expect(recipe.ids.every((id) => canonical.has(id))).toBe(true);
    });
  });

  it("preserva ordem manual, remove duplicatas e limita a cinco etapas", () => {
    const ids = [
      "diferencial-relatorios",
      "diferencial-pre-avaliacao",
      "diferencial-relatorios",
      "diferencial-hep-video",
      "diferencial-reavaliacao",
      "diferencial-agente-clinico",
      "diferencial-red-flags",
    ];
    expect(normalizeEcosystemIds(ids, ALIVIA_ECOSYSTEM_RECIPES[0].ids)).toEqual([
      "diferencial-relatorios",
      "diferencial-pre-avaliacao",
      "diferencial-hep-video",
      "diferencial-reavaliacao",
      "diferencial-agente-clinico",
    ]);
  });

  it("constrói uma promessa única, progressão e fechamento para um só público", () => {
    const ecosystem = buildAliviaEcosystem("periodizacao");
    expect(ecosystem.audience).toMatch(/fisioterapeuta/i);
    expect(ecosystem.steps.map((step) => step.label)).toEqual([
      "Periodização de carga",
      "HEP em vídeo",
      "Prontidão e carga percebida",
    ]);
    expect(ecosystem.steps[0].body).toMatch(/cadeia começa/i);
    expect(ecosystem.steps.at(-1)?.body).toMatch(/ciclo volta como decisão/i);
    expect(ecosystem.closing).toMatch(/planejada.*percebida/i);
  });

  it("entrega uma arte integrada e um carrossel indivisível", () => {
    const content = withAliviaEcosystem(WORLDS.pro, "recem-formado");
    const blocks = composePage(
      createRng("ecosystem-fixed"),
      undefined,
      undefined,
      content.carousels,
      0,
      kindsForModels(["ecossistema"], 0, true),
      true,
      false,
      content,
    );
    const standalone = blocks.filter((block) => block.kind === "ecosystem");
    const carousel = blocks.filter((block) => block.kind === "carousel");
    expect(standalone).toHaveLength(1);
    expect(carousel).toHaveLength(content.ecosystems?.[0].steps.length + 2);
    expect(new Set(carousel.map((block) => block.slide?.group)).size).toBe(1);
  });

  it("não expõe o modelo para outras marcas", () => {
    expect(kindsForModels(["ecossistema"], 0, false)).toEqual([]);
    expect(kindsForModels(["ecossistema"], 0, true)).toEqual(["ecosystem", "carousel"]);
  });

  it("é determinístico para a mesma receita e ordem", () => {
    const ids = ALIVIA_ECOSYSTEM_RECIPES[0].ids.slice().reverse();
    expect(buildAliviaEcosystem("rotina-clinica", ids)).toEqual(buildAliviaEcosystem("rotina-clinica", ids));
  });
});