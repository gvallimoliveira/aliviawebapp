/** Context filtering is separate from RLS: one account can legitimately access both practices. */
export function careScope<T extends { eq(column: string, value: string): T; is(column: string, value: null): T }>(query: T, clinicId?: string | null, professionalId?: string | null): T {
  if (clinicId) return query.eq("clinic_id", clinicId);
  const solo = query.is("clinic_id", null);
  // Never fall back to all records when a profile has not loaded yet.
  return professionalId ? solo.eq("professional_id", professionalId) : solo;
}

export function threadScope<T extends { eq(column: string, value: string): T; is(column: string, value: null): T }>(query: T, clinicId?: string | null): T {
  return clinicId ? query.eq("clinic_id", clinicId) : query.is("clinic_id", null);
}