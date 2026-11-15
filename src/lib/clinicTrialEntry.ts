import { supabase } from "@/integrations/supabase/client";
import { normalizeAndValidateCnpj } from "../../supabase/functions/_shared/cnpj";
import { isValidEmailFormat } from "@/lib/emailValidation";
import type { ClinicTier, ClinicPlan } from "@/lib/clinicCheckout";

export { normalizeAndValidateCnpj };
export const INVALID_CNPJ_MESSAGE = "CNPJ inválido. Digite um CNPJ válido (MEI também é aceito).";
export const CLINIC_TRIAL_ENTRY = "/clinica/ativar-teste";
export const PENDING_TRIAL_KEY = "pendingClinicTrial";
export interface PendingClinicTrial { email: string; phone: string; cnpj: string; tier: ClinicTier; plan: ClinicPlan }

export function normalizeTrialEntry(value: PendingClinicTrial): PendingClinicTrial {
  const cnpj = normalizeAndValidateCnpj(value.cnpj);
  if (!cnpj) throw new Error(INVALID_CNPJ_MESSAGE);
  const email = value.email.trim().toLowerCase();
  if (!isValidEmailFormat(email)) throw new Error("Informe um e-mail válido.");
  if (!value.phone.trim()) throw new Error("Informe seu WhatsApp.");
  if (!["small", "medium", "large"].includes(value.tier) || !["monthly", "annual"].includes(value.plan)) throw new Error("Escolha um plano válido.");
  return { email, phone: value.phone.trim(), cnpj, tier: value.tier, plan: value.plan };
}

export function savePendingClinicTrial(value: PendingClinicTrial) {
  sessionStorage.setItem(PENDING_TRIAL_KEY, JSON.stringify({ ...normalizeTrialEntry(value), savedAt: Date.now() }));
  sessionStorage.setItem("signupOrigin", "clinic");
  sessionStorage.removeItem("clinicActivationSkipped");
  // A trial must never resume a previously abandoned paid checkout.
  sessionStorage.removeItem("pendingClinicPlan");
  localStorage.removeItem("pendingClinicPlan");
}

export function readPendingClinicTrial(): PendingClinicTrial | null {
  try {
    const raw = sessionStorage.getItem(PENDING_TRIAL_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (typeof value.savedAt !== "number" || Date.now() - value.savedAt > 24 * 60 * 60 * 1000) {
      sessionStorage.removeItem(PENDING_TRIAL_KEY);
      return null;
    }
    return normalizeTrialEntry(value);
  } catch { return null; }
}

export async function activateClinicTrial(value: PendingClinicTrial) {
  const { data, error } = await supabase.functions.invoke("start-clinic-trial", { body: normalizeTrialEntry(value) });
  if (error) {
    let message = "Não foi possível ativar o teste. Tente novamente.";
    try {
      const response = await error.context?.json();
      if (response?.message) message = response.message;
    } catch { /* retain friendly fallback */ }
    throw new Error(message);
  }
  if (!data?.success) throw new Error(data?.message || "Não foi possível ativar o teste. Tente novamente.");
  return data as { success: boolean; requires_login?: boolean; requires_signup?: boolean; clinic_id?: string };
}