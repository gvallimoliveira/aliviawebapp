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
