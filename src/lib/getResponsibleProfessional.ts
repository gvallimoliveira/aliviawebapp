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
  /** Active clinic context id, when in clinic mode. */
  clinicId?: string | null;
  /** Optional pre-known owner user id (saves one query). */
  clinicOwnerUserId?: string | null;
}): Promise<ResponsibleProfessional | undefined> {
  // 1. Prefer the current user's own professional record (with crefito)
  if (opts.ownProfessional?.full_name && opts.ownProfessional?.crefito) {
    return {
      name: opts.ownProfessional.full_name,
      crefito: opts.ownProfessional.crefito,
    };
  }

  // 2. If we have a userId, try to fetch their professional record
  if (opts.userId) {
    const { data: mine } = await supabase
      .from("professionals")
      .select("full_name, crefito")
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (mine?.full_name && mine?.crefito) {
      return { name: mine.full_name, crefito: mine.crefito };
    }
  }

  // 3. Fallback to clinic owner — resolve owner_user_id from clinics table
  let ownerUserId = opts.clinicOwnerUserId || null;
  if (!ownerUserId && opts.clinicId) {
    const { data: clinic } = await supabase
      .from("clinics")
      .select("owner_user_id")
      .eq("id", opts.clinicId)
      .maybeSingle();
    ownerUserId = clinic?.owner_user_id || null;
  }
  if (ownerUserId) {
    const { data: owner } = await supabase
      .from("professionals")
      .select("full_name, crefito")
      .eq("user_id", ownerUserId)
      .maybeSingle();
    if (owner?.full_name) {
      return { name: owner.full_name, crefito: owner.crefito || undefined };
    }
  }

  // 4. Last resort: own record without crefito (so name still appears)
  if (opts.ownProfessional?.full_name) {
    return {
      name: opts.ownProfessional.full_name,
      crefito: opts.ownProfessional.crefito || undefined,
    };
  }

  return undefined;
}
