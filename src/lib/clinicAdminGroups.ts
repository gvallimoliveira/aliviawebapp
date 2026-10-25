export type ClinicAdminGroup = "paid" | "partners" | "other";

export function clinicAdminGroup(clinic: {
  subscription_stripe_id: string | null;
  subscription_status: string | null;
}): ClinicAdminGroup {
  if (clinic.subscription_stripe_id?.trim()) return "paid";
  if (clinic.subscription_status === "active") return "partners";
  return "other";
}