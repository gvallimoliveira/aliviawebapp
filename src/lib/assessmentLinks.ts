import { supabase } from "@/integrations/supabase/client";
import { getPublicOrigin } from "./getPublicOrigin";

export type AssessmentLinkContext = {
  professionalId?: string | null;
  clinicId?: string | null;
};

const generateToken = (): string => {
  if ((crypto as any).randomUUID) return (crypto as any).randomUUID();
  // Fallback: 128 bits from the cryptographic RNG (never Math.random/time).
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

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
  steps?: string[] | null,
) => {
  const params = new URLSearchParams({ reassessment: reassessmentId });
  if (steps && steps.length > 0) params.set("steps", steps.join(","));
  return `${baseUrl(ctx)}?${params.toString()}`;
};

export const buildPersonalizedAssessmentLink = (
  ctx: AssessmentLinkContext,
  token: string,
) => `${baseUrl(ctx)}?patient=${token}`;

export const buildResumeAssessmentLink = (
  ctx: AssessmentLinkContext,
  assessmentId: string,
  patientToken?: string | null,
) => {
  const params = new URLSearchParams({ resume: assessmentId });
  if (patientToken) params.set("patient", patientToken);
  return `${baseUrl(ctx)}?${params.toString()}`;
};

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
