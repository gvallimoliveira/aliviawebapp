// Structural types keep this helper testable in both Deno and the app's test runner.
type LinkRow = { id?: string; token?: string };
type LinkQuery = {
  ilike(column: string, value: string): LinkQuery;
  eq(column: string, value: string | boolean): LinkQuery;
  limit(count: number): LinkQuery;
  maybeSingle(): PromiseLike<{ data: LinkRow | null; error: unknown }>;
};
type CheckinLinkClient = {
  from(table: string): {
    select(columns: string): LinkQuery;
    insert(values: { patient_id: string; plan_id: null; audience: string; token: string; active: boolean }): PromiseLike<{ error: unknown }>;
  };
};

type MyLinkResult =
  | { status: 200; body: { token: string | null } }
  | { status: 500; body: { error: string } };

/** Called only after validating the caller; email comes from the authenticated account. */
export async function getPatientCheckinLink(
  supabase: CheckinLinkClient,
  email: string,
): Promise<MyLinkResult> {
  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .select("id")
    .ilike("email", email)
    .limit(1)
    .maybeSingle();

  if (patientError) return { status: 500, body: { error: "patient_lookup_failed" } };
  // Self-service/new accounts need not be registered as a professional's patient.
  // This is an expected empty state, and must never create a patient or a link.
  if (!patient?.id) return { status: 200, body: { token: null } };

  const { data: existing, error: linkError } = await supabase
    .from("periodization_links")
    .select("token")
    .eq("patient_id", patient.id)
    .eq("audience", "patient")
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (linkError) return { status: 500, body: { error: "link_lookup_failed" } };
  if (existing?.token) return { status: 200, body: { token: existing.token } };

  const token = crypto.randomUUID();
  const { error: insertError } = await supabase
    .from("periodization_links")
    .insert({ patient_id: patient.id, plan_id: null, audience: "patient", token, active: true });

  if (insertError) return { status: 500, body: { error: "link_create_failed" } };
  return { status: 200, body: { token } };
}