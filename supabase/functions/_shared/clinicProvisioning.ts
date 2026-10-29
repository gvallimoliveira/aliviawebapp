// Single source of truth for creating/activating a paid clinic.
// Used by stripe-webhook (checkout.session.completed) and by
// check-clinic-subscription (self-heal when the webhook never arrived).
// Idempotent: an existing owned clinic is updated, never duplicated.

export interface ProvisionInput {
  clinicId?: string | null;
  userId: string;
  clinicName?: string | null;
  maxMembers?: number | null;
  subscriptionId?: string | null;
}

export interface ProvisionResult {
  clinicId: string | null;
  created: boolean;
}

export function resolveClinicName(name?: string | null): string {
  const n = (name ?? "").trim();
  return n.length > 0 ? n.slice(0, 120) : "Minha Clínica";
}

export function resolveMaxMembers(v?: number | string | null): number {
  const n = typeof v === "string" ? parseInt(v, 10) : v ?? NaN;
  return Number.isFinite(n) && (n as number) > 0 ? (n as number) : 3;
}

// deno-lint-ignore no-explicit-any
export async function provisionClinic(admin: any, input: ProvisionInput): Promise<ProvisionResult> {
  const maxMembers = resolveMaxMembers(input.maxMembers);
  let lookup = admin
    .from("clinics")
    .select("id")
    .eq("owner_user_id", input.userId);
  if (input.clinicId) lookup = lookup.eq("id", input.clinicId);
  const { data: existing, error: lookupError } = await lookup
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (lookupError) throw new Error(`clinic lookup failed: ${lookupError.message}`);
  if (input.clinicId && !existing) throw new Error("Checkout clinic does not belong to its owner");

  let clinicId: string | null = existing?.id ?? null;
  let created = false;

  if (clinicId) {
    const { error } = await admin
      .from("clinics")
      .update({
        subscription_status: "active",
        subscription_stripe_id: input.subscriptionId ?? undefined,
        max_members: maxMembers,
      })
      .eq("id", clinicId);
    if (error) throw new Error(`clinic activation failed: ${error.message}`);
  } else {
    const { data: newClinic, error } = await admin
      .from("clinics")
      .insert({
        name: resolveClinicName(input.clinicName),
        owner_user_id: input.userId,
        subscription_status: "active",
        subscription_stripe_id: input.subscriptionId ?? null,
        max_members: maxMembers,
      })
      .select("id")
      .single();
    if (error) throw new Error(`clinic insert failed: ${error.message}`);
    clinicId = newClinic.id;
    created = true;
  }

  // Ensure the owner membership exists and is active.
  const { data: member } = await admin
    .from("clinic_members")
    .select("id,status")
    .eq("clinic_id", clinicId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (!member) {
    const { error } = await admin.from("clinic_members").insert({
      clinic_id: clinicId,
      user_id: input.userId,
      role: "owner",
      invited_by: input.userId,
      accepted_at: new Date().toISOString(),
      status: "active",
    });
    if (error) throw new Error(`owner membership failed: ${error.message}`);
  } else if (member.status !== "active") {
    await admin.from("clinic_members").update({ status: "active" }).eq("id", member.id);
  }

  return { clinicId, created };
}
