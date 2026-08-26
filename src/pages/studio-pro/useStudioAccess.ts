import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { FREE_ACCESS, resolveStudioPlan, type StudioAccess } from "./plan";

/** Plano efetivo da conta logada no Studio público. */
export const useStudioAccess = () => {
  const { user, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<StudioAccess>(FREE_ACCESS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (authLoading) return;
    if (!user?.email) {
      setAccess(FREE_ACCESS);
      setLoading(false);
      return;
    }
    setLoading(true);
    resolveStudioPlan(user.email)
      .then((result) => {
        if (active) setAccess(result);
      })
      .catch((error) => console.error("[studio-pro] resolveStudioPlan", error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [authLoading, user?.email]);

  return { access, loading: loading || authLoading };
};
