import { supabase } from "@/integrations/supabase/client";
import { careScope } from "@/lib/careScope";

export interface RegistrationIdentity {
  id: string;
  full_name: string;
  email?: string | null;
  assessmentIds?: string[];
}

export interface RegistrationSaved {
  patientId: string;
  oldKey: string;
  newKey: string;
  name: string;
  email: string | null;
  assessmentIds: string[];
  clinicId: string | null;
  professionalId: string;
}

/** Editing must retain the original row; clinical history uses explicit IDs, never a new name lookup. */
export async function updatePatientRegistration(
  original: RegistrationIdentity,
  values: Record<string, unknown> & { full_name: string; email: string | null },
  professionalId: string,
  clinicId?: string | null,
): Promise<RegistrationSaved> {
  if (!original.id) throw new Error("Cadastro original não encontrado. Reabra o prontuário antes de editar.");
  const sb = supabase as any;
  const { data, error } = await careScope(
    sb.from("patients").update(values).eq("id", original.id), clinicId, professionalId,
  ).select("id").single();
  if (error) throw error;
  if (!data?.id) throw new Error("Não foi possível atualizar o cadastro original.");

  const oldEmail = original.email?.trim() || "";
  const oldName = original.full_name.trim();
  const assessmentIds = [...new Set(original.assessmentIds || [])];
  if (oldName !== values.full_name || oldEmail !== (values.email || "")) {
    // Explicit record assessments also cover patients who have never supplied an email.
    if (assessmentIds.length) {
      const result = await careScope(sb.from("assessments")
        .update({ patient_name: values.full_name, patient_email: values.email })
        .in("id", assessmentIds), clinicId, professionalId);
      if (result.error) throw result.error;
    } else if (oldEmail) {
      const result = await careScope(sb.from("assessments")
        .update({ patient_name: values.full_name, patient_email: values.email })
        .eq("patient_email", oldEmail), clinicId, professionalId);
      if (result.error) throw result.error;
    }
    if (oldEmail) {
      const result = await careScope(sb.from("professional_appointments")
        .update({ patient_name: values.full_name, patient_email: values.email })
        .eq("patient_email", oldEmail), clinicId, professionalId);
      if (result.error) throw result.error;
    }
  }
  return {
    patientId: original.id, oldKey: oldEmail || oldName,
    newKey: values.email || values.full_name, name: values.full_name,
    email: values.email, assessmentIds, clinicId: clinicId || null, professionalId,
  };
}