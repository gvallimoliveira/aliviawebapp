import { describe, expect, it } from "vitest";
import { clinicAdminGroup } from "@/lib/clinicAdminGroups";

describe("admin clinic groups", () => {
  it("separates subscribed clinics from free access", () => {
    expect(clinicAdminGroup({ subscription_stripe_id: "sub_paid", subscription_status: "active" })).toBe("paid");
  });
  it("groups active free access as partners", () => {
    expect(clinicAdminGroup({ subscription_stripe_id: null, subscription_status: "active" })).toBe("partners");
  });
  it("does not call trial or inactive clinics partners with access", () => {
    for (const subscription_status of ["trialing", "trial"]) {
      expect(clinicAdminGroup({ subscription_stripe_id: null, subscription_status })).toBe("trial");
    }
    for (const subscription_status of ["inactive", null]) {
      expect(clinicAdminGroup({ subscription_stripe_id: null, subscription_status })).toBe("other");
    }
  });
  it("keeps subscription history in subscribers even if not active", () => {
    expect(clinicAdminGroup({ subscription_stripe_id: "sub_previous", subscription_status: "inactive" })).toBe("paid");
  });
});