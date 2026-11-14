import { supabase } from "@/integrations/supabase/client";

export type ProPlan = "monthly" | "annual";
const KEY = "pendingProPlan";

export const savePendingProPlan = (plan: ProPlan) => {
  try { sessionStorage.setItem(KEY, plan); localStorage.setItem(KEY, plan); } catch { /* noop */ }
};

export const takePendingProPlan = (): ProPlan | null => {
  try {
    const v = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    sessionStorage.removeItem(KEY); localStorage.removeItem(KEY);
    return v === "monthly" || v === "annual" ? v : null;
  } catch { return null; }
};

/** Opens Stripe checkout for PRO. Returns false when it could not redirect. */
export const startProCheckout = async (plan: ProPlan): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke("create-pro-subscription", { body: { plan } });
    if (error) return false;
    if (data?.already_active) { window.location.href = "/dashboard?tab=professional"; return true; }
    if (data?.url) { window.location.href = data.url; return true; }
    return false;
  } catch { return false; }
};
