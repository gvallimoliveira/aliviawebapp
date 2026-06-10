import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ENABLE_CLINICAL_AGENT } from "@/lib/featureFlags";

/**
 * Gate for the Clinical Agent (Beta).
 * Visible if: ENABLE_CLINICAL_AGENT flag is on OR the user is a VIP.
 */
export function useClinicalAgentAccess() {
  const { user, loading: authLoading, ready: authReady } = useAuth();
  const normalizedEmail = user?.email?.toLowerCase().trim() || "";
  const isKnownAdmin = normalizedEmail === "gvallimoliveira@gmail.com";
  const [isVip, setIsVip] = useState(false);
  const [globalEnabled, setGlobalEnabled] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!authReady || authLoading) return;

      if (!normalizedEmail) {
        setIsVip(false);
        setGlobalEnabled(false);
        setChecked(true);
        return;
      }

      const { data, error } = await supabase.functions.invoke("clinical-agent-threads", {
        body: { action: "access_status" },
      });

      if (!cancelled) {
        setIsVip(!!data?.isVip);
        setGlobalEnabled(!!data?.globalEnabled);
        setChecked(true);

        if (error) {
          setIsVip(false);
          setGlobalEnabled(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [normalizedEmail, authLoading, authReady]);

  return {
    hasAccess: ENABLE_CLINICAL_AGENT || globalEnabled || isVip || isKnownAdmin,
    isBetaInternal: !ENABLE_CLINICAL_AGENT && (isVip || isKnownAdmin),
    checked,
  };
}
