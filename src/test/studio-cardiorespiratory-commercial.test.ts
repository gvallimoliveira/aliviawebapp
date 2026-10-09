import { describe, expect, it } from "vitest";
import { ALIVIA_DIFFERENTIALS } from "@/pages/studio-pro/aliviaDifferentials";
import { ALIVIA_AUDIENCES, officialAudienceCount } from "@/pages/studio-pro/audiences";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";
import { buildAliviaEcosystemSet, ecosystemCarousel } from "@/pages/studio-pro/aliviaEcosystems";
import { officialPhotoIdsForDifferential } from "@/pages/studio-pro/aliviaOfficialMedia";

const cardio = ALIVIA_DIFFERENTIALS.filter((item) => item.id.startsWith("diferencial-cardio-"));

describe("Comunicação cardiorrespiratória Aliv.iA", () => {
  it("oferece três recortes completos sem criar um público oficial", () => {
    expect(cardio).toHaveLength(3);
    expect(officialAudienceCount(ALIVIA_AUDIENCES)).toBe(4);
    for (const item of cardio) {
      expect(item.parentId).toBe("pro");
      for (const field of [item.pains, item.desires, item.proof, item.scenes, item.objections, item.stakes, item.triggers]) {
        expect(field?.length).toBeGreaterThanOrEqual(2);
      }
      expect(item.cta).toBeTruthy();
    }
  });

  it("distingue leitura de prints de conexão e análise clínica de diagnóstico", () => {
    const [monitor, tests, report] = cardio;
    expect(JSON.stringify(monitor)).toMatch(/pulseira, relógio, cinta peitoral ou oxímetro/);
    expect(monitor.description).toMatch(/sem conexão automática/);
    expect(JSON.stringify(monitor)).toMatch(/TRIMP.*somente com tempos por zona/);
    expect(tests.description).toMatch(/supervisionados/);
    expect(JSON.stringify(tests)).toMatch(/TC6M.*equação brasileira.*TSL e degrau.*referência informada/);
    expect(JSON.stringify(tests)).toMatch(/Pressão arterial/);
    expect(JSON.stringify(report)).toMatch(/Sem medir VO₂máx/);
    expect(report.description).toMatch(/sem inventar resultados/);
    expect(JSON.stringify(report)).toMatch(/decisão final do fisioterapeuta/);
  });

  it("produz conteúdos focados e determinísticos para cada novo recorte", () => {
    for (const item of cardio) {
      const input = {
        kit: { name: "Aliv.iA", niche: "fisioterapia", tone: "profissional", description: "", keywords: [] },
        audiences: ALIVIA_AUDIENCES,
        segment: item.id,
        angle: "venda" as const,
        variationSeed: `cardio-commercial:${item.id}`,
      };
      const content = buildSegmentContent(input);
      expect(content).toEqual(buildSegmentContent(input));
      expect(content.carousels[0]?.slides).toHaveLength(4);
      expect(JSON.stringify(content).toLowerCase()).toContain(item.keyword?.toLowerCase());
      // Não ilustrar a nova função com telas oficiais de outras funcionalidades.
      expect(officialPhotoIdsForDifferential(item.id as Parameters<typeof officialPhotoIdsForDifferential>[0])).toBeUndefined();
    }
  });

  it("conecta medidas, teste e relatório sem criar um lançamento duplicado", () => {
    const set = buildAliviaEcosystemSet("jornada-cardiorrespiratoria");
    expect(set).toHaveLength(6);
    expect(set[0].steps.map((step) => step.id)).toEqual(cardio.map((item) => item.id));
    expect(new Set(set.map((item) => item.title)).size).toBe(6);
    expect(set[0].steps[1].body).toMatch(/Prints entram direto no teste/);
    expect(set[0].steps[1].body).toMatch(/sem duplicar a carga semanal/);
    expect(set[0].steps[2].body).toMatch(/hipóteses e lacunas explícitas/);
    expect(ecosystemCarousel(set[0]).slides.map((slide) => slide.body)).toEqual(set[0].steps.map((step) => step.body));
    expect(set).toEqual(buildAliviaEcosystemSet("jornada-cardiorrespiratoria"));
  });
});