import { describe, expect, it } from "vitest";
import { ACL_PREOP_PHASES, computePreOpStatus, prefillAclPreoperative } from "@/lib/aclPreoperative";

const assessment = (text: string) => [{ created_at: "2026-10-30", anamnesis_data: { history: text } }];
describe("ACL preparation", () => {
  it("recognizes testagem externa's preventive goal and separately scheduled date", () => {
    expect(prefillAclPreoperative([{ created_at: "2026-10-31", anamnesis_data: {
      assessmentPurpose: "prevention", preventionGoalDetails: "Pré operatório da cirurgia de reconstrução do LCA",
      history: "Rotura do ligamento dia 10/09/26. Jogando futsal, cirurgia marcada para 12/12/26.",
      previousSurgeries: "cirurgia marcada para 12/12/26.", historyRegions: ["right_knee"],
    } }])).toMatchObject({ planned_surgery_date: "2026-12-12" });
  });
  it("does not infer preparation from preventive knee interest without explicit ACL surgery", () => {
    expect(prefillAclPreoperative([{ created_at: "2026-10-31", anamnesis_data: { assessmentPurpose: "prevention", historyRegions: ["right_knee"], preventionGoalDetails: "Fortalecer joelho" } }])).toBeNull();
  });
  it("counts 21 days until planned surgery, with no postoperative counters", () => {
    const status = computePreOpStatus({ planned_surgery_date: "2026-11-20" }, "2026-10-30");
    expect(status.daysUntilSurgery).toBe(21);
    expect(status).not.toHaveProperty("days");
    expect(status).not.toHaveProperty("week");
  });
  it("accepts no surgery date and starts preparation", () => {
    const status = computePreOpStatus({}, "2026-10-30");
    expect(status.daysUntilSurgery).toBeNull();
    expect(status.phase.id).toBe("pre_calm");
  });
  it("the scheduled date passing never advances preparation or implies surgery", () => {
    const status = computePreOpStatus({ planned_surgery_date: "2026-10-20" }, "2026-10-30");
    expect(status.daysUntilSurgery).toBe(-10);
    expect(status.phase.id).toBe("pre_calm");
  });
  it("completed goals advance preparation independently of the scheduled date", () => {
    const criteria = Object.fromEntries(ACL_PREOP_PHASES[0].exitCriteria.map((goal) => [goal.id, true]));
    expect(computePreOpStatus({ criteria }, "2026-10-30").phase.id).toBe("pre_function");
    criteria.pre_pain = false;
    expect(computePreOpStatus({ criteria }, "2026-10-30").phase.id).toBe("pre_calm");
  });
  it("all goals complete remain preoperative, never postoperative clearance", () => {
    const criteria = Object.fromEntries(ACL_PREOP_PHASES.flatMap((phase) => phase.exitCriteria.map((goal) => [goal.id, true])));
    expect(computePreOpStatus({ criteria }, "2026-10-30")).toMatchObject({ preparationComplete: true, currentPhaseIndex: 2 });
  });
  it("requires explicit ACL preparation, not region or postoperative onset alone", () => {
    expect(prefillAclPreoperative(assessment("Dor no joelho com lesão de LCA"))).toBeNull();
    expect(prefillAclPreoperative([{ created_at: "2026-10-30", anamnesis_data: { onset: "post_surgery", chiefComplaint: "Dor no ombro" } }])).toBeNull();
    expect(prefillAclPreoperative(assessment("Pré-operatório de reconstrução do LCA"))?.planned_surgery_date).toBeNull();
  });
  it("prefills the scheduled date but not unrelated birth/exam dates", () => {
    expect(prefillAclPreoperative(assessment("Pré-operatório de LCA. Cirurgia marcada para 20/11/2026."))?.planned_surgery_date).toBe("2026-11-20");
    expect(prefillAclPreoperative(assessment("Pré-operatório de LCA. Exame em 01/10/2026."))?.planned_surgery_date).toBeNull();
  });
  it("does not mistake explicit already-operated or negated context for preparation", () => {
    expect(prefillAclPreoperative(assessment("Pós-operatório de LCA, fez pré-operatório antes da cirurgia realizada."))).toBeNull();
    expect(prefillAclPreoperative(assessment("LCA sem indicação cirúrgica, não está em pré-operatório."))).toBeNull();
  });
  it("rejects impossible dates without inventing a replacement", () => {
    expect(prefillAclPreoperative(assessment("Pré-operatório LCA. Cirurgia marcada para 31/02/2027."))?.planned_surgery_date).toBeNull();
  });
});