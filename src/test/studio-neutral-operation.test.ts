import { describe, expect, it } from "vitest";
import { buildBrandContent, type BrandKit } from "@/pages/studio-pro/brandContent";

/**
 * O acervo neutro (marca sem manual/briefing) não pode falar de consultório.
 * Ele deve usar o vocabulário da operação real derivada do kit da marca.
 */
const textOf = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textOf).join(" ");
  if (value && typeof value === "object") return Object.values(value).map(textOf).join(" ");
  return "";
};

const CLINICAL = /\b(paciente|pacientes|consulta|consultas|conduta|alta cl[íi]nica|sess[ãa]o|sess[õo]es|reavalia[çc][ãa]o)\b/i;

const render = (kit: BrandKit) => textOf(buildBrandContent(kit, { seed: "op-test" }));

describe("acervo neutro segue a operação da marca", () => {
  it("marca de software não fala de consultório", () => {
    const text = render({ name: "OrbitaCRM", niche: "plataforma de vendas", description: "Software de gestão comercial para equipes." });
    expect(CLINICAL.test(text)).toBe(false);
    expect(/cliente/i.test(text)).toBe(true);
  });

  it("marca de curso fala de aluno e trilha", () => {
    const text = render({ name: "Escola Vento", niche: "curso de fotografia", description: "Mentoria e curso para fotógrafos iniciantes." });
    expect(CLINICAL.test(text)).toBe(false);
    expect(/aluno/i.test(text)).toBe(true);
  });

  it("marca clínica pode usar vocabulário de atendimento", () => {
    const text = render({ name: "Clínica Move", niche: "fisioterapia", description: "Atendimento de fisioterapia e reabilitação." });
    expect(/paciente/i.test(text)).toBe(true);
  });
});
