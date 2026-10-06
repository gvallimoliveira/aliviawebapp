import { describe, expect, it } from "vitest";
import { composePage } from "@/pages/studio/composePage";
import { createRng } from "@/pages/studio/rng";
import { kindsForModels } from "@/pages/studio/models";
import {
  ALIVIA_ECOSYSTEM_RECIPES,
  buildAliviaEcosystem,
  buildAliviaEcosystemSet,
  normalizeEcosystemIds,
  withAliviaEcosystem,
} from "@/pages/studio-pro/aliviaEcosystems";
import { ALIVIA_DIFFERENTIALS } from "@/pages/studio-pro/aliviaDifferentials";
import { WORLDS } from "@/pages/studio/content";

describe("Ecossistema de soluções Aliv.iA", () => {
  it("explica a estimativa de HEP sem confundir esforço alvo com resposta real", () => {
    const dose = ALIVIA_DIFFERENTIALS.find((item) => item.id === "diferencial-hep-dose");
    const text = JSON.stringify(dose);
    expect(text).toMatch(/força ×1/);
    expect(text).toMatch(/propriocepção ×0,5/);
    expect(text).toMatch(/mobilidade e flexibilidade fora/);
    expect(text).toMatch(/esforço percebido real vem do paciente/);
    expect(text).toMatch(/preservando as sessões passadas/);
    expect(text).toMatch(/criado pelo Agente/);
    expect(text).not.toMatch(/começa cheio|dose planejada por região|chega sozinha/);
  });

  it("mantém as frentes e a atualização futura na cadeia de periodização", () => {
    const ecosystem = buildAliviaEcosystem("periodizacao");
    const text = JSON.stringify(ecosystem);
    expect(text).toMatch(/fisioterapia, academia ou outro esporte/);
    expect(text).toMatch(/sessões futuras/);
    expect(ecosystem.promise).toMatch(/estimativa de dose/);
    expect(ecosystem.closing).toMatch(/edições do programa/);
    const carousel = withAliviaEcosystem(WORLDS.pro, "periodizacao").carousels[0];
    expect(carousel.slides.find((slide) => slide.topic === "hep")?.body).toMatch(/estabilização/);
  });

  it("mantém nove cadeias recomendadas com 3–5 funcionalidades canônicas", () => {
    const canonical = new Set(ALIVIA_DIFFERENTIALS.map((item) => item.id));
    expect(ALIVIA_ECOSYSTEM_RECIPES).toHaveLength(9);
    ALIVIA_ECOSYSTEM_RECIPES.forEach((recipe) => {
      expect(recipe.ids.length).toBeGreaterThanOrEqual(3);
      expect(recipe.ids.length).toBeLessThanOrEqual(5);
      expect(recipe.ids.every((id) => canonical.has(id))).toBe(true);
    });
  });

  it("inclui segurança clínica e acompanhamento entre sessões", () => {
    expect(buildAliviaEcosystem("seguranca-clinica").steps.map((step) => step.id)).toEqual([
      "diferencial-red-flags",
      "diferencial-avaliacao-externa-ia",
      "diferencial-avaliacao-manual",
      "diferencial-relatorios",
      "diferencial-reavaliacao",
    ]);
    expect(buildAliviaEcosystem("adesao-e-evolucao").steps.map((step) => step.id)).toEqual([
      "diferencial-hep-video",
      "diferencial-hep-dose",
      "diferencial-evolucao-voz",
      "diferencial-prontidao-carga",
      "diferencial-reavaliacao",
    ]);
  });

  it("atrela os prints oficiais somente às funcionalidades correspondentes", () => {
    const security = buildAliviaEcosystem("seguranca-clinica");
    expect(security.steps.find((step) => step.id === "diferencial-avaliacao-externa-ia")?.photoIds)
      .toEqual(["official:alivia:external-upload"]);
    expect(security.steps.find((step) => step.id === "diferencial-red-flags")?.photoIds)
      .toEqual(["official:alivia:red-flags-screening", "official:alivia:red-flags-positive"]);
    expect(buildAliviaEcosystem("recem-formado").steps.find((step) => step.id === "diferencial-agente-clinico")?.photoIds)
      .toEqual([
        "official:alivia:clinical-agent",
        "official:alivia:evidence-library",
        "official:alivia:clinical-agent-case",
      ]);
    expect(buildAliviaEcosystem("gestao-da-clinica").steps.find((step) => step.id === "diferencial-clinica-agenda")?.photoIds)
      .toEqual(["official:alivia:agenda"]);
    expect(buildAliviaEcosystem("gestao-da-clinica").steps.find((step) => step.id === "diferencial-insights")?.photoIds)
      .toEqual(["official:alivia:insights", "official:alivia:professional-dashboard"]);
    expect(security.steps.find((step) => step.id === "diferencial-relatorios")?.photoIds)
      .toEqual([
        "official:alivia:record-summary-hypothesis",
        "official:alivia:record-summary-details",
        "official:alivia:record-pain-map",
        "official:alivia:record-questionnaires",
        "official:alivia:record-health-conditions",
      ]);
    expect(buildAliviaEcosystem("periodizacao").steps.find((step) => step.id === "diferencial-hep-video")?.photoIds)
      .toEqual(["official:alivia:hep-exercise-list", "official:alivia:hep-exercise-video"]);
    expect(buildAliviaEcosystem("rotina-clinica").steps.find((step) => step.id === "diferencial-pre-avaliacao")?.photoIds)
      .toEqual(["official:alivia:pre-assessment-start"]);
  });

  it("leva o vínculo de imagem para o slide correspondente do carrossel", () => {
    const carousel = withAliviaEcosystem(WORLDS.pro, "seguranca-clinica").carousels[0];
    expect(carousel.imagePolicy).toBe("explicit-only");
    expect(carousel.slides.find((slide) => slide.topic === "external-upload")?.photoIds)
      .toEqual(["official:alivia:external-upload"]);
  });

  it("gera seis argumentos autônomos para a mesma cadeia", () => {
    const set = buildAliviaEcosystemSet("rotina-clinica");
    expect(set).toHaveLength(6);
    expect(new Set(set.map((item) => item.title)).size).toBe(6);
    expect(set.every((item) => item.steps.map((step) => step.id).join("|") === set[0].steps.map((step) => step.id).join("|"))).toBe(true);
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
      "Dose do HEP calculada",
      "HEP em vídeo",
      "Prontidão e carga percebida",
    ]);
    expect(ecosystem.steps[0].body).toMatch(/cadeia começa/i);
    expect(ecosystem.steps.at(-1)?.body).toMatch(/ciclo volta como decisão/i);
    expect(ecosystem.closing).toMatch(/planejada.*percebida/i);
  });

  it("leva a jornada da landing ao ecossistema do paciente sem criar outra cadeia", () => {
    const journey = ALIVIA_ECOSYSTEM_RECIPES.find((recipe) => recipe.id === "jornada-do-paciente");
    const ecosystem = buildAliviaEcosystem("jornada-do-paciente");

    expect(ALIVIA_ECOSYSTEM_RECIPES).toHaveLength(9);
    expect(ecosystem.steps.map((step) => step.id)).toEqual([
      "diferencial-paciente-autoavaliacao",
      "diferencial-paciente-premium",
      "diferencial-paciente-relatorio",
      "diferencial-paciente-plano",
      "diferencial-paciente-fisioterapeuta",
    ]);
    expect(JSON.stringify(journey)).toMatch(/sem recomeçar|sem retrabalho/i);
    expect(JSON.stringify(journey)).not.toMatch(/diagnóstico online|cura|resolver a dor/i);
  });

  it("entrega seis artes integradas e um carrossel indivisível", () => {
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
    expect(standalone).toHaveLength(6);
    expect(standalone.map((block) => block.treatment)).toEqual([0, 1, 2, 3, 4, 5]);
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