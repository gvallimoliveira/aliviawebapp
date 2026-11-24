import { describe, expect, it } from "vitest";
import { marketplaceStatus } from "../marketplaceVisibility";

const now = new Date("2026-11-24T12:00:00Z").getTime();
const paying = {
  active: true,
  approved: true,
  marketplace_hidden: false,
  active_profile_mode: "professional",
  subscription_status: "active",
  subscription_stripe_id: "sub_1",
};

describe("vitrine de profissionais", () => {
  it("assinante aprovado aparece na vitrine", () => {
    expect(marketplaceStatus(paying, now)).toBe("visible");
  });

  it("profissional ocultado pelo admin sai da vitrine mesmo pagando", () => {
    expect(marketplaceStatus({ ...paying, marketplace_hidden: true }, now)).toBe("hidden");
  });

  it("reexibir devolve o assinante à vitrine", () => {
    const hidden = { ...paying, marketplace_hidden: true };
    expect(marketplaceStatus({ ...hidden, marketplace_hidden: false }, now)).toBe("visible");
  });

  it("parceiro aparece sem assinatura; acadêmico e conta sem acesso não aparecem", () => {
    const base = { ...paying, subscription_status: "inactive", subscription_stripe_id: null };
    expect(marketplaceStatus({ ...base, is_partner: true }, now)).toBe("visible");
    expect(marketplaceStatus(base, now)).toBe("ineligible");
    expect(marketplaceStatus({ ...paying, active_profile_mode: "student" }, now)).toBe("ineligible");
    expect(marketplaceStatus({ ...paying, approved: false }, now)).toBe("ineligible");
  });

  it("acesso anual ou carência só contam enquanto não vencem", () => {
    const base = { ...paying, subscription_status: "canceled", subscription_stripe_id: null };
    expect(marketplaceStatus({ ...base, pro_access_expires_at: "2026-12-01T00:00:00Z" }, now)).toBe("visible");
    expect(marketplaceStatus({ ...base, subscription_grace_until: "2026-11-01T00:00:00Z" }, now)).toBe("ineligible");
  });
});
