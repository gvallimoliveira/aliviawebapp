import { supabase } from "@/integrations/supabase/client";

/** Random URL-safe slug (base36, ~9 chars). */
const generateSlug = (len = 8): string => {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => (b % 36).toString(36)).join("");
};

const getProjectRef = () => {
  const url = (import.meta as any).env?.VITE_SUPABASE_URL || "";
  const m = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : "";
};

/**
 * Create a compact short link that resolves to a freshly-signed storage URL.
 * Returns the short URL (e.g. https://<ref>.supabase.co/functions/v1/s/abc123).
 * Falls back to the raw signed URL if the short-link insert fails.
 */
export async function createShortShareLink(opts: {
  bucket: string;
  filePath: string;
  ttlSeconds?: number;
}): Promise<string> {
  const ttl = opts.ttlSeconds ?? 60 * 60; // default 1h
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;

  if (!userId) {
    // Not signed in — just return a normal signed URL
    const { data } = await supabase.storage.from(opts.bucket).createSignedUrl(opts.filePath, ttl);
    return data?.signedUrl || "";
  }

  // Try a few times in case of slug collision
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = generateSlug(8);
    const { error } = await supabase.from("short_links").insert({
      slug,
      bucket: opts.bucket,
      file_path: opts.filePath,
      created_by: userId,
      expires_at: expiresAt,
    });
    if (!error) {
      const ref = getProjectRef();
      return `https://${ref}.supabase.co/functions/v1/s/${slug}`;
    }
    // unique violation → retry; otherwise fall back
    if (!String(error.message || "").toLowerCase().includes("duplicate")) break;
  }

  // Fallback: long signed URL
  const { data } = await supabase.storage.from(opts.bucket).createSignedUrl(opts.filePath, ttl);
  return data?.signedUrl || "";
}
