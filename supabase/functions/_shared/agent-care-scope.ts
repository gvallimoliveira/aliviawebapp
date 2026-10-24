export function patientMatchesCareScope(patient: { clinic_id?: string | null; professional_id?: string | null }, clinicId: string | null, professionalId: string | null): boolean {
  return clinicId
    ? patient.clinic_id === clinicId
    : !patient.clinic_id && !!professionalId && patient.professional_id === professionalId;
}

/** Identity comes from verified Auth, never a body-supplied user/professional ID. */
export async function canUseAgentScope(client: any, userId: string, clinicId: string | null, patientId?: string | null): Promise<boolean> {
  let professionalId: string | null = null;
  if (clinicId) {
    const { data, error } = await client.from("clinic_members").select("id")
      .eq("clinic_id", clinicId).eq("user_id", userId).eq("status", "active").maybeSingle();
    if (error) throw error;
    if (!data) return false;
  } else if (patientId) {
    const { data, error } = await client.from("professionals").select("id").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    professionalId = data?.id || null;
  }
  if (!patientId) return true;
  const { data, error } = await client.from("patients").select("clinic_id, professional_id").eq("id", patientId).maybeSingle();
  if (error) throw error;
  return !!data && patientMatchesCareScope(data, clinicId, professionalId);
}