import { describe, it, expect } from "vitest";
import { formatParticipationContext, workDemandLabel } from "../participationContext";
describe("participationContext", () => {
  it("vazio quando nada informado", () => { expect(formatParticipationContext({})).toBe(""); });
  it("formata demanda e meta", () => {
    expect(formatParticipationContext({ workDemand: "away_from_work", participationGoal: "correr" }))
      .toBe("Demanda do trabalho/rotina: Afastado do trabalho (atestado/INSS) · Atividade/participação que mais faz falta: correr");
  });
  it("ignora id desconhecido", () => { expect(workDemandLabel("x")).toBe(""); });
});

import { toggleWorkDemand } from "../participationContext";
describe("rotina híbrida", () => {
  it("permite até 2 opções", () => {
    expect(toggleWorkDemand("sitting,standing", "physical_load")).toBe("standing,physical_load");
  });
  it("afastado é exclusivo", () => {
    expect(toggleWorkDemand("sitting,standing", "away_from_work")).toBe("away_from_work");
    expect(toggleWorkDemand("away_from_work", "sitting")).toBe("sitting");
  });
  it("texto para a IA combina as duas", () => {
    expect(formatParticipationContext({ workDemand: "sitting,standing" })).toContain("Sentado a maior parte do dia + Em pé ou caminhando");
  });
});
