import { supabase } from "@/integrations/supabase/client";

export type ProPlan = "monthly" | "annual";
const KEY = "pendingProPlan";
const TRIAL_KEY = "pendingProTrial";

export const savePendingProPlan = (plan: ProPlan, trial = false) => {
  try {
    sessionStorage.setItem(KEY, plan); localStorage.setItem(KEY, plan);
    const t = trial ? "1" : "0";
    sessionStorage.setItem(TRIAL_KEY, t); localStorage.setItem(TRIAL_KEY, t);
  } catch { /* noop */ }
};

/** Reads and clears whether the pending checkout should start the 7-day trial. */
export const takePendingProTrial = (): boolean => {
  try {
    const v = sessionStorage.getItem(TRIAL_KEY) || localStorage.getItem(TRIAL_KEY);
    sessionStorage.removeItem(TRIAL_KEY); localStorage.removeItem(TRIAL_KEY);
    return v === "1";
  } catch { return false; }
};

export const takePendingProPlan = (): ProPlan | null => {
  try {
    const v = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    sessionStorage.removeItem(KEY); localStorage.removeItem(KEY);
    return v === "monthly" || v === "annual" ? v : null;
  } catch { return null; }
};

/** Opens Stripe checkout for PRO. Returns false when it could not redirect. */
export const startProCheckout = async (plan: ProPlan, trial = false): Promise<boolean> => {
  try {
    const { data, error } = await supabase.functions.invoke("create-pro-subscription", { body: { plan, trial } });
    if (error) return false;
    if (data?.already_active) { window.location.href = "/dashboard?tab=professional"; return true; }
    if (data?.url) { window.location.href = data.url; return true; }
    return false;
  } catch { return false; }
};
