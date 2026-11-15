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

import { takePendingProTrial } from "@/lib/proCheckout";
describe("pending PRO trial choice", () => {
  it("keeps the trial choice through signup and clears it once read", () => {
    savePendingProPlan("monthly", true);
    expect(takePendingProTrial()).toBe(true);
    expect(takePendingProTrial()).toBe(false);
  });
  it("defaults to immediate payment", () => {
    savePendingProPlan("annual");
    expect(takePendingProTrial()).toBe(false);
  });
});
