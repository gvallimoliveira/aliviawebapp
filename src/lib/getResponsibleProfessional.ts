import { supabase } from "@/integrations/supabase/client";
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
 * - Clinic owner / secretary → fallback to the clinic owner's professional record.
 * - If `includeSignature` is true (or auto-sign pref is on), tries to embed signature image.
 */
export async function resolveResponsibleProfessional(opts: {
  userId?: string | null;
  ownProfessional?: {
    full_name?: string | null;
    crefito?: string | null;
    signature_image_url?: string | null;
  } | null;
  clinicId?: string | null;
  clinicOwnerUserId?: string | null;
  /** When true, embed signature image. Defaults to user preference. */
  includeSignature?: boolean;
}): Promise<ResponsibleProfessional | undefined> {
  const wantSig = opts.includeSignature ?? isAutoSignEnabled();
  let resolved: { name: string; crefito?: string; signaturePath?: string | null } | null = null;

  if (opts.ownProfessional?.full_name && opts.ownProfessional?.crefito) {
    resolved = {
      name: opts.ownProfessional.full_name,
      crefito: opts.ownProfessional.crefito,
      signaturePath: opts.ownProfessional.signature_image_url ?? null,
    };
  }

  if (!resolved && opts.userId) {
    const { data: mine } = await supabase
      .from("professionals")
      .select("full_name, crefito, signature_image_url")
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (mine?.full_name && mine?.crefito) {
      resolved = {
        name: mine.full_name,
        crefito: mine.crefito,
        signaturePath: (mine as any).signature_image_url ?? null,
      };
    }
  }

  if (!resolved) {
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
        .select("full_name, crefito, signature_image_url")
        .eq("user_id", ownerUserId)
        .maybeSingle();
      if (owner?.full_name) {
        resolved = {
          name: owner.full_name,
          crefito: owner.crefito || undefined,
          signaturePath: (owner as any).signature_image_url ?? null,
        };
      }
    }
  }

  if (!resolved && opts.ownProfessional?.full_name) {
    resolved = {
      name: opts.ownProfessional.full_name,
      crefito: opts.ownProfessional.crefito || undefined,
      signaturePath: opts.ownProfessional.signature_image_url ?? null,
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
  };
}
