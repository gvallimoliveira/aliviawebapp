/**
 * Helpers for the "Final Hypothesis" overrule feature.
 *
 * Professionals (PRO autônomo) and clinic owners/therapists can override
 * the AI-suggested diagnostic hypothesis with their own clinical judgment.
 * When `final_hypothesis` is set, it should be displayed in place of the
 * AI hypothesis everywhere (chart, PDF, WhatsApp share).
 */

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AssessmentLikeForHypothesis {
  diagnosis?: { hypothesis?: string | null } | null;
  final_hypothesis?: string | null;
  professional_id?: string | null;
  clinic_id?: string | null;
}

/**
 * Returns the hypothesis to display: final (overruled) when present,
 * otherwise the AI-generated one. Empty/whitespace strings are treated as null.
 */
export function getDisplayHypothesis(
  assessment?: AssessmentLikeForHypothesis | null,
): string | null {
  if (!assessment) return null;
  const final = assessment.final_hypothesis?.trim();
  if (final) return final;
  return assessment.diagnosis?.hypothesis?.trim() || null;
}

/** True when the assessment carries a professional-defined override. */
export function hasFinalOverride(
  assessment?: AssessmentLikeForHypothesis | null,
): boolean {
  return !!assessment?.final_hypothesis?.trim();
}

type ClinicRoleLite = "owner" | "secretary" | "therapist" | null;

/**
 * Hook that returns whether the current user can edit the final hypothesis
 * for the given assessment.
 *
 * Authorized:
 *  - The PRO professional that owns the assessment (matches professional_id → user_id)
 *  - Clinic members with role 'owner' or 'therapist' for the assessment's clinic
 *
 * Explicitly NOT authorized: clinic 'secretary' role (clinical decision).
 */
export function useCanEditFinalHypothesis(
  assessment?: AssessmentLikeForHypothesis | null,
): boolean {
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!assessment) {
        if (!cancelled) setCanEdit(false);
        return;
      }
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) {
        if (!cancelled) setCanEdit(false);
        return;
      }

      // PRO autônomo: professional that owns this assessment
      if (assessment.professional_id) {
        const { data: pro } = await supabase
          .from("professionals")
          .select("id")
          .eq("id", assessment.professional_id)
          .eq("user_id", uid)
          .maybeSingle();
        if (pro) {
          if (!cancelled) setCanEdit(true);
          return;
        }
      }

      // Clinic owner/therapist
      if (assessment.clinic_id) {
        const { data: member } = await supabase
          .from("clinic_members")
          .select("role")
          .eq("clinic_id", assessment.clinic_id)
          .eq("user_id", uid)
          .eq("status", "active")
          .maybeSingle();
        const role = (member?.role as ClinicRoleLite) ?? null;
        if (role === "owner" || role === "therapist") {
          if (!cancelled) setCanEdit(true);
          return;
        }
      }

      if (!cancelled) setCanEdit(false);
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [assessment?.professional_id, assessment?.clinic_id]);

  return canEdit;
}
