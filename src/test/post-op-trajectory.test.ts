import { describe, it, expect } from "vitest";
import { computePostOpStatus } from "@/lib/postOpTrajectory";

describe("postOpTrajectory", () => {
  it("week 2 without criteria stays in protection", () => {
    const s = computePostOpStatus({ surgery_date: "2026-10-20" }, "2026-10-30");
    expect(s.week).toBe(2);
    expect(s.phase.id).toBe("protection");
    expect(s.behindSchedule).toBe(false);
  });
  it("time alone never advances phase: week 20 without criteria flags behind schedule", () => {
    const s = computePostOpStatus({ surgery_date: "2026-06-01" }, "2026-10-19");
    expect(s.phase.id).toBe("protection");
    expect(s.behindSchedule).toBe(true);
  });
  it("criteria met early do not skip time-based protection", () => {
    const all = { full_extension: true, effusion_low: true, slr_no_lag: true, gait_normal: true };
    const s = computePostOpStatus({ surgery_date: "2026-10-20", criteria: all }, "2026-10-30");
    expect(s.phase.id).toBe("protection");
  });
  it("meniscal repair adds caveat", () => {
    const s = computePostOpStatus({ surgery_date: "2026-10-20", meniscal_repair: true }, "2026-10-30");
    expect(s.caveats.length).toBe(1);
  });
});

import { autoCriteriaFromMeasurements, effectiveCriteria } from "@/lib/postOpTrajectory";
describe("auto criteria", () => {
  const a = (date: string, rom: any[], str: any[]) => ({ created_at: date + "T10:00:00Z", anamnesis_data: { romTable: rom, strengthTable: str } });
  it("quad 68% fails 80, 85% passes 80 not 90; latest wins; pre-surgery ignored", () => {
    const list = [
      a("2026-09-01", [], [{ movement: "Extensão de joelho", leftValue: "50", rightValue: "50" }]),
      a("2026-10-10", [], [{ movement: "Extensão de joelho", leftValue: "34", rightValue: "50" }]),
      a("2026-10-25", [{ joint: "Joelho extensão", leftValue: "-5", rightValue: "0" }], [{ movement: "Quadríceps", leftValue: "42.5", rightValue: "50" }]),
    ];
    const r = autoCriteriaFromMeasurements(list, "2026-10-01");
    expect(r.quad_lsi_80.value).toBe(true);
    expect(r.quad_lsi_90.value).toBe(false);
    expect(r.full_extension.value).toBe(false);
  });
  it("manual mark overrides measurement", () => {
    expect(effectiveCriteria({ quad_lsi_80: false }, { quad_lsi_80: { value: true, source: "", date: "" } }).quad_lsi_80).toBe(false);
  });
});

import { prefillFromAnamnesis, phaseUnlockDate } from "@/lib/postOpTrajectory";
describe("prefillFromAnamnesis", () => {
  it("lê data, enxerto, menisco e restrições da anamnese pós-operatória", () => {
    const p = prefillFromAnamnesis([{ created_at: "2026-10-30T10:00:00Z", anamnesis_data: { onset: "post_surgery", previousSurgeries: "Reconstrução do LCA em 08/10/2026 com enxerto de flexores e sutura meniscal. Cirurgião: 1 muleta por 2 semanas." } }], "2026-10-30");
    expect(p).toMatchObject({ surgery_date: "2026-10-08", graft_type: "hamstring", meniscal_repair: true });
    expect(p?.surgeon_restrictions).toContain("muleta");
  });
  it("não inventa dados ausentes nem usa casos sem contexto cirúrgico", () => {
    expect(prefillFromAnamnesis([{ created_at: "2026-10-30", anamnesis_data: { onset: "gradual", chiefComplaint: "lombalgia" } }], "2026-10-30")).toBeNull();
    const p = prefillFromAnamnesis([{ created_at: "2026-10-30", anamnesis_data: { onset: "post_surgery", previousSurgeries: "LCA" } }], "2026-10-30");
    expect(p).toMatchObject({ surgery_date: null, graft_type: null, meniscal_repair: false, surgeon_restrictions: null });
  });
  it("fase de força libera na semana 5 (D+28)", () => {
    expect(phaseUnlockDate("2026-10-08", 1)).toBe("2026-11-05");
  });
});

import { phasesFor, ROTATOR_CUFF_PHASES } from "@/lib/postOpTrajectory";
describe("manguito rotador", () => {
  it("rotura grande/maciça atrasa fases em 2 semanas", () => {
    expect(phasesFor("rotator_cuff_repair", "large_massive")[1].fromWeek).toBe(ROTATOR_CUFF_PHASES[1].fromWeek + 2);
    expect(phasesFor("rotator_cuff_repair", "large_massive")[0].fromWeek).toBe(0);
  });
  it("metas cumpridas não pulam proteção do tendão (semana 4)", () => {
    const crit = Object.fromEntries(ROTATOR_CUFF_PHASES[0].exitCriteria.map((c) => [c.id, true]));
    const s = computePostOpStatus({ surgery_type: "rotator_cuff_repair", surgery_date: "2026-10-01", criteria: crit }, "2026-10-25");
    expect(s.phase.id).toBe("rc_protection");
  });
  it("anamnese com manguito pré-seleciona a cirurgia", () => {
    const p = prefillFromAnamnesis([{ created_at: "2026-10-20", anamnesis_data: { onset: "post_surgery", previousSurgeries: "Reparo do manguito rotador (supraespinhal) em 01/10/2026, rotura grande. Tipóia por 6 semanas." } }], "2026-10-30");
    expect(p?.surgery_type).toBe("rotator_cuff_repair");
    expect(p?.graft_type).toBe("large_massive");
    expect(p?.surgery_date).toBe("2026-10-01");
  });
});
