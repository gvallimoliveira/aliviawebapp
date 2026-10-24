/** Context filtering is separate from RLS: one account can legitimately access both practices. */
// Recursive PostgREST builders require an unconstrained adapter to avoid TS depth overflow.
export function careScope(query: any, clinicId?: string | null, professionalId?: string | null): any {
  if (clinicId) return query.eq("clinic_id", clinicId);
  const solo = query.is("clinic_id", null);
  // Never fall back to all records when a profile has not loaded yet.
  return solo.eq("professional_id", professionalId || "00000000-0000-0000-0000-000000000000");
}

export function threadScope(query: any, clinicId?: string | null): any {
  return clinicId ? query.eq("clinic_id", clinicId) : query.is("clinic_id", null);
}