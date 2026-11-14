import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** True when the user's own PRO row was created by subscribe-first and still lacks CREFITO/academic data. */
export const useRegistrationPending = (enabled = true) => {
  const { user } = useAuth();
  const [pending, setPending] = useState<boolean | null>(null);
  useEffect(() => {
    if (!enabled || !user?.id) { setPending(false); return; }
    setPending(null);
    let cancelled = false;
    (supabase.from("professionals") as any)
      .select("registration_pending").eq("user_id", user.id).maybeSingle()
      .then(({ data }: any) => { if (!cancelled) setPending(data?.registration_pending === true); });
    return () => { cancelled = true; };
  }, [user?.id, enabled]);
  return pending;
};
