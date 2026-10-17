import { describe, it, expect } from "vitest";
import { findPendingPreAssessment, mergeAnamnesisOnUpdate } from "@/lib/preAssessmentContinuation";

describe("pre-assessment continuation", () => {
  it("finds the latest link assessment not yet completed in person", () => {
    const list = [
      { id: "old", created_at: "2026-09-01", anamnesis_data: { manualEntry: true } },
      { id: "link", created_at: "2026-10-10", anamnesis_data: { chiefComplaint: "dor" } },
    ];
    expect(findPendingPreAssessment(list)?.id).toBe("link");
  });
  it("returns null when the latest is manual or already completed", () => {
    expect(findPendingPreAssessment([
      { id: "link", created_at: "2026-10-01", anamnesis_data: {} },
      { id: "m", created_at: "2026-10-05", anamnesis_data: { manualEntry: true } },
    ])).toBeNull();
    expect(findPendingPreAssessment([{ id: "x", created_at: "2026-10-01", anamnesis_data: { completedInPerson: { at: "x" } } }])).toBeNull();
  });
  it("keeps patient answers and questionnaires, snapshot written only once", () => {
    const prev = { chiefComplaint: "dor torácica", specialtyResults: [{ questionnaireId: "srs22r", totalScore: 3.8 }], extraLinkKey: 1 };
    const first = mergeAnamnesisOnUpdate(prev, { manualEntry: true, chiefComplaint: "dor torácica refinada" }, { continuation: true, userId: "u", now: "t1" });
    expect(first.extraLinkKey).toBe(1);
    expect(first.specialtyResults).toHaveLength(1);
    expect(first.patientSnapshot.chiefComplaint).toBe("dor torácica");
    const second = mergeAnamnesisOnUpdate(first, { manualEntry: true, chiefComplaint: "outra" }, { continuation: true, now: "t2" });
    expect(second.patientSnapshot.chiefComplaint).toBe("dor torácica");
    expect(second.completedInPerson.at).toBe("t2");
  });
});
