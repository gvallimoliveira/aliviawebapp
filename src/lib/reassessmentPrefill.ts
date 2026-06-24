import { supabase } from "@/integrations/supabase/client";
import { formatCpf } from "@/utils/masks";

/**
 * Pulls stable demographics (sex, birth_date, cpf) from the `patients` table
 * to enrich the reassessment pre-fill, since they are often stored there but
 * NOT inside the older assessments' anamnesis_data JSON.
 *
 * Returns values already mapped to the format the AnamnesisForm expects:
 *  - sex   → "anamnesis.sex.male" | "anamnesis.sex.female"
 *  - ageRange (derived from birth_date) → "anamnesis.age.under_25" ... etc
 *  - birthDate (YYYY-MM-DD)
 *  - cpf (formatted ###.###.###-##)
 */
export interface PatientPrefillExtras {
  sex?: string;
  ageRange?: string;
  birthDate?: string;
  cpf?: string;
}

const ageBucket = (birthDate: string): string | undefined => {
  const d = new Date(birthDate);
  if (Number.isNaN(d.getTime())) return undefined;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  if (age < 25) return "anamnesis.age.under_25";
  if (age < 35) return "anamnesis.age.25_34";
  if (age < 45) return "anamnesis.age.35_44";
  if (age <= 55) return "anamnesis.age.45_55";
  return "anamnesis.age.over_55";
};

const mapSex = (raw: string | null | undefined): string | undefined => {
  if (!raw) return undefined;
  const v = raw.toLowerCase();
  if (v === "male" || v === "m" || v === "masculino") return "anamnesis.sex.male";
  if (v === "female" || v === "f" || v === "feminino") return "anamnesis.sex.female";
  return undefined;
};

export async function fetchPatientPrefillExtras(opts: {
  professionalId?: string | null;
  clinicId?: string | null;
  patientName?: string | null;
  patientEmail?: string | null;
}): Promise<PatientPrefillExtras> {
  const { professionalId, clinicId, patientName, patientEmail } = opts;
  if (!patientName && !patientEmail) return {};

  try {
    let q = supabase
      .from("patients")
      .select("sex, cpf, birth_date")
      .limit(1);

    if (clinicId) q = q.eq("clinic_id", clinicId);
    else if (professionalId) q = q.eq("professional_id", professionalId);

    // Prefer email match, fallback to name (case-insensitive)
    if (patientEmail) q = q.ilike("email", patientEmail);
    else if (patientName) q = q.ilike("full_name", patientName);

    const { data } = await q.maybeSingle();
    if (!data) return {};

    const out: PatientPrefillExtras = {};
    const sx = mapSex(data.sex);
    if (sx) out.sex = sx;
    if (data.birth_date) {
      out.birthDate = data.birth_date as string;
      const bucket = ageBucket(data.birth_date as string);
      if (bucket) out.ageRange = bucket;
    }
    if (data.cpf) out.cpf = formatCpf(String(data.cpf));
    return out;
  } catch {
    return {};
  }
}
