import { describe, it, expect, beforeEach } from "vitest";
import { savePendingProPlan, takePendingProPlan } from "@/lib/proCheckout";

describe("subscribe-first plan memory", () => {
  beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });
  it("keeps the plan chosen on the landing until login", () => {
    savePendingProPlan("monthly");
    expect(takePendingProPlan()).toBe("monthly");
  });
  it("is consumed once", () => {
    savePendingProPlan("annual");
    takePendingProPlan();
    expect(takePendingProPlan()).toBeNull();
  });
});
