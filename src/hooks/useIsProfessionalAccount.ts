import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { hasRealCrefito } from "@/lib/crefito";

/**
 * True when the account really treats patients (professional or clinic staff).
 * Mirrors the rule the dashboard uses to unlock professional mode, so the
 * notification settings and the personal dashboard never disagree.
 */
export function useIsProfessionalAccount() {
  const { user } = useAuth();
  const [isProfessional, setIsProfessional] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setIsProfessional(null);
      return;
    }
    let active = true;
    (async () => {
      const [{ data: pro }, { data: member }] = await Promise.all([
        supabase
          .from("professionals")
          .select("active, crefito, subscription_stripe_id, is_partner, is_partner_account")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase.from("clinic_members" as any) as any)
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "active")
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      const p = pro as any;
      const realPro =
        !!p &&
        (p.active ||
          hasRealCrefito(p.crefito) ||
          !!p.subscription_stripe_id ||
          !!p.is_partner ||
          !!p.is_partner_account);
      setIsProfessional(realPro || !!member);
    })();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return isProfessional;
}
