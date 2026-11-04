import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PatientCareProvider {
  kind: "clinic" | "professional";
  provider_id: string;
  name: string;
}

export function usePatientCare(userId: string | undefined, enabled: boolean) {
  const [care, setCare] = useState<{ userId?: string; loading: boolean; linked: boolean; names: string[]; providers: PatientCareProvider[] }>({ loading: true, linked: false, names: [], providers: [] });
  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelled = false;
    setCare({ userId, loading: true, linked: false, names: [], providers: [] });
    Promise.all([
      supabase.rpc("get_my_care_providers" as never),
      supabase.rpc("get_my_active_exercise_programs" as never),
    ]).then(([providers, programs]) => {
      if (cancelled) return;
      const rows = (providers.data || []) as unknown as PatientCareProvider[];
      const hep = (programs.data || []) as unknown as { professional_name?: string }[];
      const names = [...new Set([...rows.map((p) => p.name), ...hep.map((p) => p.professional_name || "")].filter(Boolean))];
      const providersList = rows.filter((p, i, arr) => p?.provider_id && arr.findIndex((x) => x.kind === p.kind && x.provider_id === p.provider_id) === i);
      setCare({ userId, loading: false, linked: rows.length > 0 || hep.length > 0, names, providers: providersList });
    }).catch(() => {
      if (!cancelled) setCare({ userId, loading: false, linked: false, names: [], providers: [] });
    });
    return () => { cancelled = true; };
  }, [userId, enabled]);
  return care.userId === userId ? care : { loading: true, linked: false, names: [], providers: [] as PatientCareProvider[] };
}