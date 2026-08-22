// Shared formatter for the mandatory general-health screening
// (hypertension / diabetes / heart disease / continuous medication).
const LABELS: Record<string, string> = {
  hypertension: "Hypertension",
  diabetes: "Diabetes",
  heart_disease: "Heart disease / cardiopathy",
  none: "None reported",
  other: "Other",
};

export function formatHealthHistoryForPrompt(a: any): string {
  if (!a || typeof a !== "object") return "";
  const conds: string[] = Array.isArray(a.healthConditions)
    ? a.healthConditions
    : Array.isArray(a.health_conditions)
      ? a.health_conditions
      : [];
  const other = a.healthConditionsOther || a.health_conditions_other || "";
  const otherOnset = a.healthConditionsOtherOnset || a.health_conditions_other_onset || "";
  const otherControl = a.healthConditionsOtherControl || a.health_conditions_other_control || "";
  const uses = a.usesContinuousMedication || a.uses_continuous_medication || "";
  const meds = a.continuousMedications || a.continuous_medications || a.medications || "";

  const lines: string[] = [];
  if (conds.length > 0) {
    const txt = conds
      .map((c) => (c === "other" && other ? `Other: ${other}` : LABELS[c] || c))
      .join(", ");
    lines.push(`- Systemic health conditions: ${txt}`);
    if (conds.includes("other") && (otherOnset || otherControl)) {
      lines.push(
        `- Other condition detail: onset ${otherOnset || "not specified"}; current control: ${otherControl || "not specified"}`,
      );
      if (otherControl === "uncontrolled" || otherControl === "no_followup") {
        lines.push(
          `- CAUTION: the additional condition is uncontrolled or without medical follow-up. Be conservative with intensity/progression and explicitly recommend medical evaluation.`,
        );
      }
    }
    const risky = conds.filter((c) => c === "hypertension" || c === "diabetes" || c === "heart_disease");
    if (risky.length > 0) {
      lines.push(
        `- MANDATORY SAFETY: patient reports ${risky.map((c) => LABELS[c]).join(" + ")}. Adjust exercise dosage accordingly (avoid Valsalva/breath-holding and sustained isometrics at high intensity with hypertension/cardiopathy; monitor perceived exertion; consider glycemic control, foot care and neuropathy screening with diabetes; recommend medical clearance before high-intensity work when cardiopathy is present). Mention these adaptations explicitly.`,
      );
    }
  }
  if (uses) {
    lines.push(
      `- Continuous-use medication: ${uses === "yes" ? meds || "Yes (not specified)" : "No"}`,
    );
    if (uses === "yes" && meds) {
      lines.push(
        `- Consider possible medication effects on exercise response (beta-blockers blunt heart rate, antihypertensives may cause orthostatic hypotension, corticosteroids affect tendon/bone tolerance, anticoagulants contraindicate vigorous manual therapy).`,
      );
    }
  }
  return lines.join("\n");
}
