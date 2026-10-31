import { describe, expect, it } from "vitest";
import { manualQuestionnaireSelection } from "@/lib/manualQuestionnaireSelection";

describe("painless preoperative complementary questionnaires", () => {
  const catalog = [{ id: "cat" }, { id: "tug" }, { id: "fabq" }];
  it("does not suggest unrelated cardio, geriatric or psychological instruments by default", () => {
    expect(manualQuestionnaireSelection(catalog, null, [])).toEqual([]);
  });
  it("preserves an explicit professional choice without including other instruments", () => {
    expect(manualQuestionnaireSelection(catalog, "fabq", [])).toEqual([{ id: "fabq" }]);
  });
  it("does not duplicate completed instruments or fabricate an adapted KOOS", () => {
    expect(manualQuestionnaireSelection(catalog, "fabq", ["fabq"])).toEqual([]);
    expect(manualQuestionnaireSelection(catalog, "koos_functional", [])).toEqual([]);
  });
});