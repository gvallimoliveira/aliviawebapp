// PhysioTech entitlement for an Aliv.iA professional (single source of truth).
// Rules (mem://business/physiotech-commercial-model):
//  - manual allowlist → unlimited (beta / released partners)
//  - active add-on (Stripe) → its tier, unlimited reports
//  - Aliv.iA PRO annual → 3 reports/month during the first 6 months
//  - Aliv.iA PRO monthly → 1 lifetime trial report
import Stripe from "https://esm.sh/stripe@18.5.0";

export const PHYSIOTECH_ALLOWLIST = [
  "gvallimoliveira@gmail.com", "gvallim.fisio@gmail.com",
  "decosancho@gmail.com", "sancho.derique@gmail.com",
];
export const PHYSIOTECH_PRICES = {
  monthly: { essencial: "price_1UYEV52HgVhVBE8UPpZIHZat", pro: "price_1UYEVL2HgVhVBE8UoZOp8LPP" },
  annual: { essencial: "price_1UYEVb2HgVhVBE8UrjNyp7bv", pro: "price_1UYEVo2HgVhVBE8UZsp42JbV" },
} as const;
const PRO_PRODUCTS = ["prod_UHdISwfBcfWftS", "prod_UA4lNoezZmPwvs"];

export type Entitlement = {
  kind: "unlimited" | "addon" | "annual_franchise" | "monthly_trial" | "none";
  plan: "essencial" | "pro" | null;
  base: "annual" | "monthly" | null;
  limit: number | null; used: number; remaining: number | null;
  franchiseEndsAt?: string | null;
};

// deno-lint-ignore no-explicit-any
export async function getPhysioTechEntitlement(admin: any, userId: string, email: string): Promise<Entitlement> {
  if (PHYSIOTECH_ALLOWLIST.includes(email.toLowerCase()))
    return { kind: "unlimited", plan: "pro", base: null, limit: null, used: 0, remaining: null };

  const { data: addon } = await admin.from("physiotech_addons").select("*").eq("user_id", userId).maybeSingle();
  const addonActive = addon?.status === "active" && (!addon.current_period_end || new Date(addon.current_period_end) > new Date());

  // Base Aliv.iA PRO plan
  let base: "annual" | "monthly" | null = null;
  let start: Date | null = null;
  const { data: pro } = await admin.from("professionals").select("pro_access_expires_at").eq("user_id", userId).maybeSingle();
  if (pro?.pro_access_expires_at && new Date(pro.pro_access_expires_at) > new Date()) {
    base = "annual"; start = new Date(new Date(pro.pro_access_expires_at).getTime() - 365 * 86400000);
  } else {
    try {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
      const cust = (await stripe.customers.list({ email, limit: 1 })).data[0];
      if (cust) {
        const subs = await stripe.subscriptions.list({ customer: cust.id, status: "active", limit: 10 });
        // deno-lint-ignore no-explicit-any
        const s: any = subs.data.find((x: any) => x.items.data.some((i: any) => PRO_PRODUCTS.includes(i.price.product)));
        if (s) {
          base = s.items.data[0]?.price?.recurring?.interval === "year" ? "annual" : "monthly";
          start = new Date(s.start_date * 1000);
        }
      }
    } catch (e) { console.error("entitlement stripe", e); }
  }

  if (addonActive) return { kind: "addon", plan: addon.tier, base, limit: null, used: 0, remaining: null };

  if (base === "annual" && start) {
    const ends = new Date(start); ends.setMonth(ends.getMonth() + 6);
    if (new Date() < ends) {
      const m = new Date(); const monthStart = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1));
      const { count } = await admin.from("physiotech_reports").select("id", { count: "exact", head: true })
        .eq("sent_by", userId).gte("created_at", monthStart.toISOString());
      const used = count ?? 0;
      return { kind: "annual_franchise", plan: "essencial", base, limit: 3, used, remaining: Math.max(0, 3 - used), franchiseEndsAt: ends.toISOString() };
    }
    return { kind: "none", plan: null, base, limit: 0, used: 0, remaining: 0, franchiseEndsAt: ends.toISOString() };
  }
  if (base === "monthly") {
    const { count } = await admin.from("physiotech_reports").select("id", { count: "exact", head: true }).eq("sent_by", userId);
    const used = count ?? 0;
    return { kind: "monthly_trial", plan: "essencial", base, limit: 1, used, remaining: Math.max(0, 1 - used) };
  }
  return { kind: "none", plan: null, base: null, limit: 0, used: 0, remaining: 0 };
}

export const canSendReport = (e: Entitlement) => e.remaining === null || e.remaining > 0;
