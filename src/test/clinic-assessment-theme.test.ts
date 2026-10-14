import { describe, expect, it } from "vitest";
import { clinicAssessmentTheme } from "@/lib/clinicAssessmentTheme";

describe("institutional assessment colors", () => {
  it("leaves the default theme intact without a valid clinic color", () => {
    expect(clinicAssessmentTheme(null)).toBeUndefined();
    expect(clinicAssessmentTheme("invalid")).toBeUndefined();
  });
  it("creates scoped HSL tokens and readable foregrounds", () => {
    expect(clinicAssessmentTheme("#B87333")).toMatchObject({
      "--primary": "28.9 56.6% 46.1%",
      "--ring": "28.9 56.6% 46.1%",
      "--primary-foreground": "0 0% 0%",
    });
    expect(clinicAssessmentTheme("#ffffff")).toHaveProperty("--primary-foreground", "0 0% 0%");
    expect(clinicAssessmentTheme("#000000")).toHaveProperty("--primary-foreground", "0 0% 100%");
  });
});