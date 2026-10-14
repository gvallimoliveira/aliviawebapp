import { supabase } from "@/integrations/supabase/client";
import type { ResponsibleProfessional } from "@/utils/generatePdf";
import { resolveResponsibleProfessional } from "./getResponsibleProfessional";

export interface AssessmentBranding {
  clinicLogoUrl?: string;
  clinicName?: string;
  brandColor?: string;
  professionalLogoUrl?: string;
  responsibleProfessional?: ResponsibleProfessional;
}

/**
 * Single source of truth for the data that turns a raw PDF into a branded
 * professional / clinic report: clinic logo + name, professional logo, and
 * the technical-responsible block (with auto-sign signature when enabled).
 *
 * Pass any combination of clinicId / professionalId / userId — whatever is
 * known at the call site. Missing fields silently default to no-brand.
 */
export async function resolveAssessmentBranding(opts: {
  clinicId?: string | null;
  professionalId?: string | null;
  /** Currently authenticated user (used as last-resort lookup). */
  userId?: string | null;
}): Promise<AssessmentBranding> {
  const out: AssessmentBranding = {};

  // ── Clinic branding (logo + name) ──
  if (opts.clinicId) {
    try {
      const { data: rows } = await (supabase as any).rpc("get_clinics_public", { _ids: [opts.clinicId] });
      const c: any = rows?.[0];
      if (c?.logo_url) out.clinicLogoUrl = c.logo_url as string;
      if (c?.name) out.clinicName = c.name as string;
      if (c?.brand_color) out.brandColor = c.brand_color as string;
    } catch {
      /* ignore */
    }
  }

  // ── Professional logo (only meaningful when NOT clinic-branded) ──
  let proRow: any = null;
  if (opts.professionalId) {
    try {
      const { data } = await supabase
        .from("professionals")
        .select("full_name, crefito, logo_url, signature_image_url, is_student, active_profile_mode, student_institution, student_period, user_id")
        .eq("id", opts.professionalId)
        .maybeSingle();
      proRow = data;
    } catch {
      /* ignore */
    }
  }
  if (!proRow && opts.userId) {
    try {
      const { data } = await supabase
        .from("professionals")
        .select("full_name, crefito, logo_url, signature_image_url, is_student, active_profile_mode, student_institution, student_period, user_id")
        .eq("user_id", opts.userId)
        .maybeSingle();
      proRow = data;
    } catch {
      /* ignore */
    }
  }
  if (proRow?.logo_url && !out.clinicLogoUrl) {
    out.professionalLogoUrl = proRow.logo_url as string;
  }

  // ── Responsible Technical block (with optional auto-signed signature) ──
  try {
    out.responsibleProfessional = await resolveResponsibleProfessional({
      userId: opts.userId || proRow?.user_id || null,
      ownProfessional: proRow
        ? {
            full_name: proRow.full_name,
            crefito: proRow.crefito,
            signature_image_url: proRow.signature_image_url,
            is_student: proRow.is_student,
            active_profile_mode: proRow.active_profile_mode,
            student_institution: proRow.student_institution,
            student_period: proRow.student_period,
          }
        : null,
      clinicId: opts.clinicId || null,
    });
  } catch {
    /* ignore */
  }

  return out;
}
