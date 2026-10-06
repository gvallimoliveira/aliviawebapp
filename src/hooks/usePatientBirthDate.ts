import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Refresh demographics after record edits, without resetting session inputs. */
export function usePatientBirthDate(patientId: string, refreshKey?: boolean) {
  const [birth, setBirth] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    let request = 0;
    setBirth(null);
    const refresh = async () => {
      const current = ++request;
      const { data, error } = await supabase.from("patients").select("birth_date").eq("id", patientId).maybeSingle();
      if (!cancelled && current === request && !error) setBirth(data?.birth_date ?? null);
    };
    void refresh();
    window.addEventListener("reload-pro-patients", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("reload-pro-patients", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [patientId, refreshKey]);
  return birth;
}