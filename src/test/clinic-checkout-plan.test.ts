import { describe, it, expect, beforeEach } from "vitest";
import { savePendingClinicPlan, takePendingClinicPlan } from "@/lib/clinicCheckout";

describe("clinic subscribe-first plan memory", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  it("keeps tier and billing chosen on the landing until signup", () => {
    savePendingClinicPlan({ tier: "medium", plan: "monthly" });
    expect(takePendingClinicPlan()).toEqual({ tier: "medium", plan: "monthly" });
  });
  it("is consumed once", () => {
    savePendingClinicPlan({ tier: "large", plan: "annual" });
    takePendingClinicPlan();
    expect(takePendingClinicPlan()).toBeNull();
  });
});
