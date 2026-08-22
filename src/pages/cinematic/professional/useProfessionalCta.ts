import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/** Shared CTA behaviour for every block of the professional landing. */
export const useProfessionalCta = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = useCallback(() => {
    if (user) {
      navigate("/dashboard?tab=professional");
      return;
    }
    try { sessionStorage.setItem("signupOrigin", "professional"); } catch { /* noop */ }
    navigate("/auth", { state: { redirectTo: "/dashboard?tab=professional" } });
  }, [navigate, user]);

  const scrollToPricing = useCallback(() => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return { handleCTA, scrollToPricing };
};
