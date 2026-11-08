import { supabase } from "@/integrations/supabase/client";
import { isFallbackVip } from "@/lib/vipEmails";
import type { PlanId } from "./product";

/**
 * PLANO EFETIVO DA CONTA NO STUDIO PÚBLICO
 *
 * Fonte única de verdade para limites (marcas, cota, marca d'água). Nunca ler
 * `studio_credits.plan` direto na UI: VIP e acessos cortesia não passam pelo
 * Stripe e só aparecem corretamente aqui.
 */

export type StudioPlan = "free" | PlanId;

export type StudioAccess = {
  plan: StudioPlan;
  /** VIP: sem cobrança e sem cota. */
  unlimited: boolean;
  /** Pode conceder acesso cortesia a outras pessoas. */
  isVip: boolean;
  /** Acesso concedido por um VIP (cortesia, plano Solo). */
  granted: boolean;
  /** Limite de marcas do plano efetivo. */
  brandLimit: number;
  /** Gerações por período (Infinity para VIP). Cada geração rende dezenas de artes. */
  creditsPerPeriod: number;
  /** Fotos no acervo privado do plano (0 no grátis). */
  photoLimit: number;
  /** Downloads saem com marca d'água discreta. */
  watermark: boolean;
};

/** Nome comercial de cada plano (usado em selos e textos de cortesia). */
export const PLAN_LABELS: Record<StudioPlan, string> = {
  free: "Grátis",
  solo: "Solo",
  marca: "Marca",
  agencia: "Agência",
};

export const PLAN_LIMITS: Record<StudioPlan, { brands: number; credits: number; photos: number }> = {
  free: { brands: 1, credits: 2, photos: 0 },
  solo: { brands: 1, credits: 10, photos: 20 },
  marca: { brands: 3, credits: 40, photos: 60 },
  agencia: { brands: 15, credits: 120, photos: 120 },
};

/** Teto de fotos do acervo para VIP/admin (soma de todas as marcas). */
export const VIP_PHOTO_LIMIT = 300;

const buildAccess = (
  plan: StudioPlan,
  opts: { isVip?: boolean; granted?: boolean } = {},
): StudioAccess => {
  const isVip = !!opts.isVip;
  const limits = PLAN_LIMITS[plan];
  return {
    plan,
    unlimited: isVip,
    isVip,
    granted: !!opts.granted,
    brandLimit: isVip ? PLAN_LIMITS.agencia.brands : limits.brands,
    creditsPerPeriod: isVip ? Infinity : limits.credits,
    photoLimit: isVip ? VIP_PHOTO_LIMIT : limits.photos,
    watermark: !isVip && plan === "free",
  };
};


export const FREE_ACCESS = buildAccess("free");

const normalize = (email?: string | null) => (email ?? "").trim().toLowerCase();

/** VIP: whitelist local + tabela `vip_users` (a tabela vence quando responde). */
export const checkStudioVip = async (email?: string | null): Promise<boolean> => {
  const mail = normalize(email);
  if (!mail) return false;
  if (isFallbackVip(mail)) return true;
  const { data } = await supabase.from("vip_users").select("id").eq("email", mail).maybeSingle();
  return !!data;
};

/**
 * Resolve o plano efetivo: VIP → agência ilimitada; e-mail com concessão ativa →
 * solo cortesia; assinante → plano da tabela; resto → free.
 */
export const resolveStudioPlan = async (email?: string | null): Promise<StudioAccess> => {
  const mail = normalize(email);
  if (!mail) return FREE_ACCESS;

  if (await checkStudioVip(mail)) {
    return buildAccess("agencia", { isVip: true });
  }

  const { data: grant } = await supabase
    .from("studio_granted_access")
    .select("plan, revoked_at")
    .eq("email", mail)
    .maybeSingle();

  if (grant && !grant.revoked_at) {
    const granted = (grant.plan as StudioPlan) ?? "solo";
    return buildAccess(PLAN_LIMITS[granted] ? granted : "solo", { granted: true });
  }

  const { data: credits } = await supabase
    .from("studio_credits")
    .select("plan, subscription_status")
    .maybeSingle();

  const plan = (credits?.plan as StudioPlan) ?? "free";
  return buildAccess(PLAN_LIMITS[plan] ? plan : "free");
};
