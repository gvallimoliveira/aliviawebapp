export type ClinicAdminGroup = "paid" | "partners" | "trial" | "other";

export function clinicAdminGroup(clinic: {
  subscription_stripe_id: string | null;
  subscription_status: string | null;
}): ClinicAdminGroup {
  if (clinic.subscription_stripe_id?.trim()) return "paid";
  if (clinic.subscription_status === "active") return "partners";
  if (clinic.subscription_status === "trialing" || clinic.subscription_status === "trial") return "trial";
  return "other";
}
