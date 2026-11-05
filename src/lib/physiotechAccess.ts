// PhysioTech access is a manual allowlist: VIP admins + individually released
// people. Aliv.iA partners never get it automatically. Keep in sync with
// supabase/functions/physiotech-sso (server enforces the same list).
const PHYSIOTECH_ALLOWED = [
  "gvallimoliveira@gmail.com",
  "gvallim.fisio@gmail.com",
  // Derique Sancho (parceiro, liberado manualmente)
  "decosancho@gmail.com",
  "sancho.derique@gmail.com",
];

export const canUsePhysioTech = (email?: string | null) =>
  !!email && PHYSIOTECH_ALLOWED.includes(email.toLowerCase());
