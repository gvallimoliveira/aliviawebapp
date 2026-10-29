// Link direto de cadastro para integrantes da equipe da clínica.
export const INVITE_PARAM = "convite";

export const buildInviteLink = (token: string, origin = typeof window !== "undefined" ? window.location.origin : "") =>
  `${origin}/auth?${INVITE_PARAM}=${encodeURIComponent(token)}`;

export const inviteMessage = (lang: "pt" | "en" | "es", clinicName: string, roleLabel: string, link: string) => {
  const c = clinicName || "Aliv.iA";
  if (lang === "en") return `Hi! You were invited to join the ${c} team on Aliv.iA as ${roleLabel}. Create your access here: ${link}`;
  if (lang === "es") return `¡Hola! Fuiste invitado al equipo de ${c} en Aliv.iA como ${roleLabel}. Crea tu acceso aquí: ${link}`;
  return `Olá! Você foi convidado para integrar a equipe da ${c} no Aliv.iA como ${roleLabel}. Crie seu acesso por aqui: ${link}`;
};
