/**
 * Anonymization helpers for patient data sent to AI models (LGPD).
 * Replaces identifiable fields with initials + short hash ID.
 */

function shortHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 4);
}

export function initialsOf(fullName: string | null | undefined): string {
  if (!fullName) return "Paciente";
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Paciente";
  if (parts.length === 1) return parts[0][0].toUpperCase() + ".";
  return parts.map(p => p[0].toUpperCase()).join(".") + ".";
}

export function anonymizePatient<T extends Record<string, any>>(
  patient: T | null | undefined,
): (Omit<T, "full_name" | "email" | "phone" | "cpf" | "address"> & {
  display_label: string;
}) | null {
  if (!patient) return null;
  const { full_name, email, phone, cpf, address, ...rest } = patient as any;
  const id = patient.id ? shortHash(String(patient.id)) : "anon";
  return {
    ...(rest as any),
    display_label: `${initialsOf(full_name)} #${id}`,
  };
}

/** Strip identifiable strings from free-text fields. */
export function scrubText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, "[CPF]")
    .replace(/\b\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g, "[telefone]")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[email]");
}
