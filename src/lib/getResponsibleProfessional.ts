import { supabase } from "@/integrations/supabase/client";
import type { ResponsibleProfessional } from "@/utils/generatePdf";

/**
 * Resolves the technical responsible (name + CREFITO) for a PDF report.
 *
 * Rules:
 * - Solo PRO / clinic therapist with their own professional record → use their record.
 * - Clinic owner / secretary → fallback to the clinic owner's professional record.
 * - If none can be resolved → returns undefined (PDF will skip the block).
 */
export async function resolveResponsibleProfessional(opts: {
  /** Auth user id of who is generating the PDF. */
  userId?: string | null;
  /** Pre-loaded professional record of the current user, when available. */
  ownProfessional?: { full_name?: string | null; crefito?: string | null } | null;
  /** Active clinic context, when in clinic mode. */
  clinicId?: string | null;
  clinicOwnerUserId?: string | null;
}): Promise<ResponsibleProfessional | undefined> {
  // 1. Prefer the current user's own professional record
  if (opts.ownProfessional?.full_name) {
    return {
      name: opts.ownProfessional.full_name,
      crefito: opts.ownProfessional.crefito || undefined,
    };
  }

  // 2. If we have a userId, try to fetch their professional record
  if (opts.userId) {
    const { data: mine } = await supabase
      .from("professionals")
      .select("full_name, crefito")
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (mine?.full_name) {
      return { name: mine.full_name, crefito: mine.crefito || undefined };
    }
  }

  // 3. Fallback to clinic owner (when generating from clinic owner/secretary login)
  if (opts.clinicOwnerUserId) {
    const { data: owner } = await supabase
      .from("professionals")
      .select("full_name, crefito")
      .eq("user_id", opts.clinicOwnerUserId)
      .maybeSingle();
    if (owner?.full_name) {
      return { name: owner.full_name, crefito: owner.crefito || undefined };
    }
  }

  return undefined;
}
