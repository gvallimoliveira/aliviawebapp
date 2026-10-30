import { supabase } from "@/integrations/supabase/client";
import { displayCrefito } from "@/lib/crefito";
import type { ResponsibleProfessional } from "@/utils/generatePdf";


const AUTOSIGN_KEY = "aliv:autosign-pdf";

/** Read the user's opt-in preference for embedding their digital signature. */
export function isAutoSignEnabled(): boolean {
  try {
    return localStorage.getItem(AUTOSIGN_KEY) === "1";
  } catch {
    return false;
  }
}

export function setAutoSignEnabled(enabled: boolean) {
  try {
    localStorage.setItem(AUTOSIGN_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** Fetches a private storage URL and converts it to a base64 data URL for PDF embedding. */
async function fetchSignatureDataUrl(signaturePath: string): Promise<string | null> {
  try {
    const { data: signed } = await supabase.storage
      .from("signatures")
      .createSignedUrl(signaturePath, 60);
    if (!signed?.signedUrl) return null;
    const res = await fetch(signed.signedUrl);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Resolves the technical responsible (name + CREFITO + optional signature) for a PDF report.
 *
 * Rules:
 * - Solo PRO / clinic therapist with their own professional record → use their record.
 * - Clinic reports resolve the requested member; a missing council never changes the issuer.
 * - If `includeSignature` is true (or auto-sign pref is on), tries to embed signature image.
 */
export async function resolveResponsibleProfessional(opts: {
  userId?: string | null;
  ownProfessional?: {
    full_name?: string | null;
    crefito?: string | null;
    signature_image_url?: string | null;
    is_student?: boolean | null;
    active_profile_mode?: string | null;
    student_institution?: string | null;
    student_period?: string | null;
  } | null;
  clinicId?: string | null;
  clinicOwnerUserId?: string | null;
  /** When true, embed signature image. Defaults to user preference. */
  includeSignature?: boolean;
}): Promise<ResponsibleProfessional | undefined> {
  const wantSig = opts.includeSignature ?? isAutoSignEnabled();
  if (opts.clinicId && opts.userId) {
    const { data, error } = await supabase.rpc("get_clinic_report_issuer", { _clinic_id: opts.clinicId, _user_id: opts.userId });
    if (error) throw error;
    const row = data as { full_name?: string; council_type?: string; council_number?: string; signature_image_url?: string; is_student?: boolean; active_profile_mode?: string; student_institution?: string; student_period?: string } | null;
    if (!row?.full_name) return undefined;
    const signatureImageDataUrl = wantSig && row.signature_image_url ? await fetchSignatureDataUrl(row.signature_image_url) : null;
    return {
      name: row.full_name,
      councilType: row.council_type || undefined,
      councilNumber: row.council_number || undefined,
      signatureImageDataUrl: signatureImageDataUrl || undefined,
      isStudent: (row.active_profile_mode ?? (row.is_student ? "student" : "professional")) === "student",
      studentInstitution: row.student_institution || undefined,
      studentPeriod: row.student_period || undefined,
    };
  }
  // Active mode wins over capability: a partner with both PRO+Academic
  // liberated only shows as student when active_profile_mode === 'student'.
  const isActiveStudent = (row: any) =>
    (row?.active_profile_mode ?? (row?.is_student ? "student" : "professional")) === "student";

  let resolved: {
    name: string;
    crefito?: string;
    signaturePath?: string | null;
    isStudent?: boolean;
    studentInstitution?: string;
    studentPeriod?: string;
  } | null = null;

  // Students don't need a CREFITO to be considered the responsible
  if (opts.ownProfessional?.full_name) {
    resolved = {
      name: opts.ownProfessional.full_name,
      crefito: displayCrefito(opts.ownProfessional.crefito),
      signaturePath: opts.ownProfessional.signature_image_url ?? null,
      isStudent: isActiveStudent(opts.ownProfessional),
      studentInstitution: opts.ownProfessional.student_institution ?? undefined,
      studentPeriod: opts.ownProfessional.student_period ?? undefined,
    };
  }


  if (!resolved && opts.userId) {
    const { data: mine } = await supabase
      .from("professionals")
      .select("full_name, crefito, signature_image_url, is_student, active_profile_mode, student_institution, student_period")
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (mine?.full_name) {
      resolved = {
        name: mine.full_name,
        crefito: displayCrefito(mine.crefito),

        signaturePath: (mine as any).signature_image_url ?? null,
        isStudent: isActiveStudent(mine),
        studentInstitution: (mine as any).student_institution ?? undefined,
        studentPeriod: (mine as any).student_period ?? undefined,
      };
    }
  }

  if (!resolved && !opts.userId) {
    let ownerUserId = opts.clinicOwnerUserId || null;
    if (!ownerUserId && opts.clinicId) {
      const { data: rows } = await (supabase as any).rpc("get_clinics_public", { _ids: [opts.clinicId] });
      const clinic: any = rows?.[0];
      ownerUserId = clinic?.owner_user_id || null;
    }
    if (ownerUserId) {
      const { data: owner } = await supabase
        .from("professionals")
        .select("full_name, crefito, signature_image_url, is_student, active_profile_mode, student_institution, student_period")
        .eq("user_id", ownerUserId)
        .maybeSingle();
      if (owner?.full_name) {
        resolved = {
          name: owner.full_name,
          crefito: displayCrefito(owner.crefito),
          signaturePath: (owner as any).signature_image_url ?? null,
          isStudent: isActiveStudent(owner),
          studentInstitution: (owner as any).student_institution ?? undefined,
          studentPeriod: (owner as any).student_period ?? undefined,
        };
      }
    }
  }

  if (!resolved && opts.ownProfessional?.full_name) {
    resolved = {
      name: opts.ownProfessional.full_name,
      crefito: displayCrefito(opts.ownProfessional.crefito),
      signaturePath: opts.ownProfessional.signature_image_url ?? null,
      isStudent: isActiveStudent(opts.ownProfessional),
      studentInstitution: opts.ownProfessional.student_institution ?? undefined,
      studentPeriod: opts.ownProfessional.student_period ?? undefined,
    };
  }

  if (!resolved) return undefined;

  let signatureImageDataUrl: string | undefined;
  if (wantSig && resolved.signaturePath) {
    const dataUrl = await fetchSignatureDataUrl(resolved.signaturePath);
    if (dataUrl) signatureImageDataUrl = dataUrl;
  }

  return {
    name: resolved.name,
    crefito: resolved.crefito,
    signatureImageDataUrl,
    isStudent: resolved.isStudent,
    studentInstitution: resolved.studentInstitution,
    studentPeriod: resolved.studentPeriod,
  };
}
