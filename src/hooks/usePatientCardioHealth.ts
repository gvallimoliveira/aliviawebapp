import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { summaryHealthRecord } from "@/lib/recordSummary";

/** Same dated health sources as the record; never requires birthdate or writes a profile. */
export function usePatientCardioHealth(patientId: string | null | undefined, assessments: any[], patientEmail?: string | null, clinicId?: string | null, refreshKey?: boolean) {
  const [manual, setManual] = useState<any[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let request = 0;
    setManual([]);
    setError(false);
    if (!patientId) return;
    const refresh = async () => {
      const current = ++request;
      const { data: patient, error: patientError } = await supabase.from("patients").select("email").eq("id", patientId).maybeSingle();
      const email = patientEmail || patient?.email;
      let query = supabase.from("patient_health_records").select("*");
      query = email ? query.or(`patient_id.eq.${patientId},patient_email.eq.${email}`) : query.eq("patient_id", patientId);
      query = clinicId ? query.eq("clinic_id", clinicId) : query.is("clinic_id", null);
      const { data, error: healthError } = await query;
      if (cancelled || current !== request) return;
      setError(!!patientError || !!healthError);
      if (!healthError) setManual(data || []);
    };
    void refresh().catch(() => { if (!cancelled) setError(true); });
    window.addEventListener("reload-pro-patients", refresh);
    window.addEventListener("focus", refresh);
    const channel = supabase.channel(`cardio-health:${patientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "patient_health_records", filter: `patient_id=eq.${patientId}` }, refresh)
      .subscribe();
    return () => {
      cancelled = true;
      window.removeEventListener("reload-pro-patients", refresh);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(channel);
    };
  }, [patientId, patientEmail, clinicId, refreshKey]);
  return { health: summaryHealthRecord(assessments, manual), error };
}