// Hardcoded fallback list of VIP/admin emails.
// Keeps the "alternância livre" between Profissional ↔ Acadêmico working even
// if the `vip_users` table query fails (RLS/timing). Keep in sync with Admin.
export const VIP_FALLBACK_EMAILS = [
  "gvallimoliveira@gmail.com",
  "gvallim.fisio@gmail.com",
];

export const isFallbackVip = (email?: string | null) =>
  !!email && VIP_FALLBACK_EMAILS.includes(email.trim().toLowerCase());
