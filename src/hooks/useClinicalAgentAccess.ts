import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ENABLE_CLINICAL_AGENT } from "@/lib/featureFlags";

/**
 * Gate for the Clinical Agent (Beta).
 * Visible if: ENABLE_CLINICAL_AGENT flag is on OR the user is a VIP.
 */
export function useClinicalAgentAccess() {
  const { user } = useAuth();
  const [isVip, setIsVip] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.email) {
        setIsVip(false);
        setChecked(true);
        return;
      }
      const { data } = await supabase
        .from("vip_users")
        .select("id")
        .eq("email", user.email.toLowerCase().trim())
        .maybeSingle();
      if (!cancelled) {
        setIsVip(!!data);
        setChecked(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  return {
    hasAccess: ENABLE_CLINICAL_AGENT || isVip,
    isBetaInternal: !ENABLE_CLINICAL_AGENT && isVip,
    checked,
  };
}
