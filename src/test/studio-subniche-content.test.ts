import { describe, expect, it } from "vitest";
import { ALIVIA_AUDIENCES, resolveAudience, audienceAncestors } from "@/pages/studio-pro/audiences";
import { buildSegmentContent } from "@/pages/studio-pro/brandContent";

const kit = { name: "Aliv.iA", niche: "fisioterapia", tone: "próximo e técnico", description: "", keywords: [] };

describe("sub-nichos no motor criativo", () => {
  it("resolve herança do público matriz", () => {
    const sub = resolveAudience(ALIVIA_AUDIENCES, "paciente-pos-operatorio")!;
    expect(sub.pains).toContain("Insegurança sobre o que pode ou não fazer");
    // herda do pai "paciente"
    expect(sub.pains).toContain("Dor que volta sempre");
    expect(audienceAncestors(ALIVIA_AUDIENCES, "paciente-pos-operatorio")[0].id).toBe("paciente");
  });

  it("gera conteúdo dirigido para cada sub-nicho", () => {
    for (const id of ["paciente-dor-cronica", "paciente-pos-operatorio", "paciente-atleta-amador", "paciente-60-mais"]) {
      const audience = ALIVIA_AUDIENCES.find((a) => a.id === id)!;
      const content = buildSegmentContent({ kit, audiences: ALIVIA_AUDIENCES, segment: id, angle: "informar" });
      const blob = JSON.stringify(content).toLowerCase();
      expect(content.label).toContain(audience.label);
      expect(blob).toContain(audience.pains![0].toLowerCase());
      expect(blob).toContain(audience.cta!.toLowerCase());
    }
  });
});
