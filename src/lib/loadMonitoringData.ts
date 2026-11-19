import { supabase } from "@/integrations/supabase/client";

export interface LoadMonitoringScope {
  patientId?: string | null;
  patientName?: string | null;
  patientEmail?: string | null;
  professionalId?: string | null;
  clinicId?: string | null;
}

export async function fetchLoadMonitoring(scope: LoadMonitoringScope) {
  if (!scope.clinicId && !scope.professionalId) throw new Error("Perfil de atendimento indisponível.");
  let query = supabase.from("patients").select("id, load_monitoring_enabled");
  query = scope.clinicId
    ? query.eq("clinic_id", scope.clinicId)
    : query.is("clinic_id", null).eq("professional_id", scope.professionalId ?? "");
  if (scope.patientId) query = query.eq("id", scope.patientId);
  else if (scope.patientEmail) query = query.eq("email", scope.patientEmail);
  else if (scope.patientName) query = query.eq("full_name", scope.patientName);
  else throw new Error("Paciente não identificado.");
  // Ambiguous names must never activate a different patient's record.
  const [{ data, error }, permission] = await Promise.all([
    query.maybeSingle(),
    supabase.rpc("can_manage_patient_load", {
      _professional_id: scope.professionalId || null,
      _clinic_id: scope.clinicId || null,
    }),
  ]);
  if (error) throw error;
  if (permission.error) throw permission.error;
  if (scope.patientId && !data) throw new Error("Cadastro do paciente não encontrado neste perfil.");
  return { patientId: data?.id ?? null, enabled: data?.load_monitoring_enabled ?? false, canManage: permission.data === true };
}

export async function setLoadMonitoring(scope: LoadMonitoringScope, enabled: boolean): Promise<string> {
  let id = scope.patientId;
  if (!id) {
    // Recheck before creation, including after a failed activation attempt.
    const existing = await fetchLoadMonitoring(scope);
    if (!existing.canManage) throw new Error("Sem permissão para ativar o controle de carga.");
    id = existing.patientId;
    if (!id) {
      const { data, error } = await supabase.from("patients").insert({
        full_name: scope.patientName || scope.patientEmail || "Paciente",
        email: scope.patientEmail || null,
        clinic_id: scope.clinicId || null,
        professional_id: scope.clinicId ? null : scope.professionalId || null,
        load_monitoring_enabled: enabled,
      }).select("id").single();
      if (error) throw error;
      return data.id;
    }
  }
  const { data, error } = await supabase.rpc("set_patient_load_monitoring", {
    _patient_id: id,
    _enabled: enabled,
    _clinic_id: scope.clinicId || null,
    _professional_id: scope.professionalId || null,
  });
  if (error) throw error;
  if (data !== enabled) throw new Error("Não foi possível confirmar a alteração.");
  return id;
}