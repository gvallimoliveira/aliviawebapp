import { supabase } from "@/integrations/supabase/client";

/**
 * Versioned consent registry (LGPD, art. 8º §1º — prova do consentimento).
 * Bump POLICY_VERSION whenever the privacy policy / consent text changes.
 */
export const POLICY_VERSION = "2026-07-30";

export type ConsentType =
  | "self_assessment"
  | "professional_terms"
  | "clinic_terms"
  | "marketing"
  | "professional_link_assessment"
  | "clinic_link_assessment";

export async function logConsent(params: {
  consentType: ConsentType;
  granted?: boolean;
  subjectEmail?: string | null;
  subjectName?: string | null;
  scopeRef?: string | null;
}) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("consent_records").insert({
      user_id: auth?.user?.id ?? null,
      consent_type: params.consentType,
      policy_version: POLICY_VERSION,
      granted: params.granted ?? true,
      subject_email: params.subjectEmail?.trim() || auth?.user?.email || null,
      subject_name: params.subjectName?.trim() || null,
      scope_ref: params.scopeRef ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 400) : null,
    });
  } catch {
    /* consent logging must never block the user flow */
  }
}
