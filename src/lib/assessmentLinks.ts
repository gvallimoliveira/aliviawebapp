import { supabase } from "@/integrations/supabase/client";
import { getPublicOrigin } from "./getPublicOrigin";

export type AssessmentLinkContext = {
  professionalId?: string | null;
  clinicId?: string | null;
};

const generateToken = () =>
  (typeof crypto !== "undefined" && (crypto as any).randomUUID
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

const baseUrl = ({ professionalId, clinicId }: AssessmentLinkContext) => {
  const origin = getPublicOrigin();
  if (clinicId) return `${origin}/assessment/clinic/${clinicId}`;
  if (professionalId) return `${origin}/assessment/professional/${professionalId}`;
  throw new Error("Missing professionalId or clinicId");
};

export const buildGeneralAssessmentLink = (ctx: AssessmentLinkContext) =>
  baseUrl(ctx);

export const buildReassessmentLink = (
  ctx: AssessmentLinkContext,
  reassessmentId: string,
) => `${baseUrl(ctx)}?reassessment=${reassessmentId}`;

export const buildPersonalizedAssessmentLink = (
  ctx: AssessmentLinkContext,
  token: string,
) => `${baseUrl(ctx)}?patient=${token}`;

/**
 * Ensure the patient row has an assessment_token. Returns the token (existing or new).
 * Mutates patientRec.assessment_token in place when a new one is created.
 */
export const ensurePatientAssessmentToken = async (patientRec: {
  id: string;
  assessment_token?: string | null;
}): Promise<string> => {
  if (patientRec.assessment_token) return patientRec.assessment_token;
  const token = generateToken();
  const { error } = await (supabase.from("patients" as any) as any)
    .update({ assessment_token: token })
    .eq("id", patientRec.id);
  if (error) throw error;
  patientRec.assessment_token = token;
  return token;
};
