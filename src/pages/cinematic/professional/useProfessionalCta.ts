import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { savePendingProPlan, startProCheckout, type ProPlan } from "@/lib/proCheckout";

/** Shared CTA behaviour for every block of the professional landing. */
export const useProfessionalCta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = useCallback(async (plan: ProPlan = "annual", trial = false) => {
    if (user) {
      const ok = await startProCheckout(plan, trial);
      if (!ok) navigate("/dashboard?tab=professional");
      return;
    }
    savePendingProPlan(plan, trial);
    try { sessionStorage.setItem("signupOrigin", "professional"); } catch { /* noop */ }
    navigate("/auth", { state: { redirectTo: "/dashboard" } });
  }, [navigate, user]);

  const scrollToPricing = useCallback(() => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return { handleCTA, scrollToPricing };
};
