import { supabase } from "@/integrations/supabase/client";

/**
 * Force a real download (not "open in new tab") by fetching the file as a blob
 * and triggering an <a download> click. Works on desktop and mobile/PWA where
 * window.open(signedUrl) often opens the file inline instead of saving it.
 */
export async function downloadStorageFile(opts: {
  bucket: string;
  filePath: string;
  fileName: string;
}): Promise<void> {
  const { data: signed, error } = await supabase.storage
    .from(opts.bucket)
    .createSignedUrl(opts.filePath, 60, { download: opts.fileName });

  if (error || !signed?.signedUrl) {
    throw new Error(error?.message || "Could not generate download URL");
  }

  try {
    const res = await fetch(signed.signedUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = opts.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    // Fallback: open the signed URL with ?download param
    window.open(signed.signedUrl, "_blank");
  }
}
