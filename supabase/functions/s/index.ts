// Public short-link redirector for shared patient files/photos.
// URL: <project>.supabase.co/functions/v1/s/<slug>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // path: /s/<slug>  OR  /functions/v1/s/<slug>
    const parts = url.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];

    if (!slug || slug === "s") {
      return new Response("Not found", { status: 404, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("short_links")
      .select("bucket, file_path, expires_at")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return new Response("Link not found", { status: 404, headers: corsHeaders });
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return new Response("Link expired", { status: 410, headers: corsHeaders });
    }

    const ttl = Math.max(60, Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000));
    const { data: signed, error: signErr } = await supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.file_path, ttl);

    if (signErr || !signed?.signedUrl) {
      return new Response("Could not generate file URL", { status: 500, headers: corsHeaders });
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: signed.signedUrl },
    });
  } catch (e) {
    console.error("short-link error", e);
    return new Response("Internal error", { status: 500, headers: corsHeaders });
  }
});
