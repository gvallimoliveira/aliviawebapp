import { supabase } from "@/integrations/supabase/client";

export type ClinicTier = "small" | "medium" | "large";
export type ClinicPlan = "monthly" | "annual";
export interface PendingClinicPlan { tier: ClinicTier; plan: ClinicPlan }
const KEY = "pendingClinicPlan";

export const savePendingClinicPlan = (p: PendingClinicPlan) => {
  const v = JSON.stringify(p);
  try { sessionStorage.setItem(KEY, v); localStorage.setItem(KEY, v); } catch { /* noop */ }
};

export const takePendingClinicPlan = (): PendingClinicPlan | null => {
  try {
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    sessionStorage.removeItem(KEY); localStorage.removeItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!["small", "medium", "large"].includes(p?.tier) || !["monthly", "annual"].includes(p?.plan)) return null;
    return { tier: p.tier, plan: p.plan };
  } catch { return null; }
};

/** Opens Stripe checkout for a new clinic. Returns false when it could not redirect. */
export const startClinicCheckout = async ({ tier, plan }: PendingClinicPlan): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke("create-clinic-subscription", {
      body: { tier, plan, clinic_name: "Minha Clínica" },
    });
    if (error || data?.error) return false;
    if (data?.already_active) { window.location.href = "/dashboard"; return true; }
    if (data?.url) { window.location.href = data.url; return true; }
    return false;
  } catch { return false; }
};
