// Public short-link redirector for shared patient files/photos.
// URL: <project>.supabase.co/functions/v1/s/<slug>
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorKind = "expired" | "not_found" | "server";

const errorPage = (kind: ErrorKind): string => {
  const variants: Record<ErrorKind, { emoji: string; title: string; message: string; hint: string }> = {
    expired: {
      emoji: "⏰",
      title: "Link expirado",
      message: "Este link de compartilhamento já passou do tempo de validade (1 hora).",
      hint: "Peça à pessoa que compartilhou para gerar um novo link.",
    },
    not_found: {
      emoji: "🔗",
      title: "Link inválido",
      message: "Este link não existe ou foi removido.",
      hint: "Verifique se você copiou a URL completa, ou solicite um novo link.",
    },
    server: {
      emoji: "⚠️",
      title: "Erro inesperado",
      message: "Não foi possível processar este link no momento.",
      hint: "Tente novamente em alguns instantes.",
    },
  };
  const v = variants[kind];
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${v.title} · Aliv.iA</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center; justify-content: center;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, sans-serif;
    background: linear-gradient(135deg, #f4f1ec 0%, #e8efee 100%);
    padding: 24px; color: #1f2937;
  }
  .card {
    max-width: 440px; width: 100%; background: #ffffff;
    border: 1px solid rgba(0,0,0,0.06); border-radius: 20px;
    padding: 36px 28px; text-align: center;
    box-shadow: 0 10px 30px -10px rgba(15,23,42,0.15);
  }
  .emoji { font-size: 56px; line-height: 1; margin-bottom: 12px; }
  h1 { margin: 0 0 12px; font-size: 22px; color: #0f766e; }
  p { margin: 0 0 10px; font-size: 15px; line-height: 1.5; color: #374151; }
  .hint { color: #6b7280; font-size: 14px; }
  .brand { margin-top: 24px; font-size: 12px; color: #94a3b8; letter-spacing: 0.5px; }
  @media (prefers-color-scheme: dark) {
    body { background: linear-gradient(135deg, #0f172a 0%, #134e4a 100%); color: #f1f5f9; }
    .card { background: #1e293b; border-color: rgba(255,255,255,0.08); }
    h1 { color: #5eead4; }
    p { color: #cbd5e1; }
    .hint { color: #94a3b8; }
  }
</style>
</head>
<body>
  <main class="card" role="alert">
    <div class="emoji" aria-hidden="true">${v.emoji}</div>
    <h1>${v.title}</h1>
    <p>${v.message}</p>
    <p class="hint">${v.hint}</p>
    <div class="brand">Aliv.iA</div>
  </main>
</body>
</html>`;
};

const htmlResponse = (kind: ErrorKind, status: number) =>
  new Response(errorPage(kind), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

async function creatorStillHasAccess(supabase: any, createdBy: string | null, filePath: string): Promise<boolean> {
  if (!createdBy) return false;
  let row: { clinic_id: string | null; professional_id: string | null } | null = null;
  for (const table of ["patient_photos", "patient_files"]) {
    const { data } = await supabase.from(table).select("clinic_id, professional_id").eq("file_path", filePath).maybeSingle();
    if (data) { row = data; break; }
  }
  if (!row) return false;
  if (row.clinic_id) {
    const { data: m } = await supabase.from("clinic_members").select("user_id")
      .eq("clinic_id", row.clinic_id).eq("user_id", createdBy).eq("status", "active").maybeSingle();
    if (m) return true;
  }
  if (row.professional_id) {
    const { data: p } = await supabase.from("professionals").select("user_id").eq("id", row.professional_id).maybeSingle();
    if (p?.user_id === createdBy) return true;
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const slug = parts[parts.length - 1];

    if (!slug || slug === "s") {
      return htmlResponse("not_found", 404);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await supabase
      .from("short_links")
      .select("bucket, file_path, target_url, expires_at, created_by")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      return htmlResponse("not_found", 404);
    }

    if (new Date(data.expires_at).getTime() < Date.now()) {
      return htmlResponse("expired", 410);
    }

    // App-URL short link → direct 302 to the long URL
    if (data.target_url) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, Location: data.target_url, "Cache-Control": "no-store" },
      });
    }

    // Storage short link → sign and redirect
    if (!data.bucket || !data.file_path) {
      return htmlResponse("not_found", 404);
    }

    // Re-check, at every open, that the person who shared still has access
    // to this patient file (removed team members' links stop working, and
    // deleted files are no longer served).
    if (!(await creatorStillHasAccess(supabase, data.created_by, data.file_path))) {
      return htmlResponse("not_found", 404);
    }

    const ttl = Math.max(60, Math.floor((new Date(data.expires_at).getTime() - Date.now()) / 1000));
    const { data: signed, error: signErr } = await supabase.storage
      .from(data.bucket)
      .createSignedUrl(data.file_path, ttl);

    if (signErr || !signed?.signedUrl) {
      return htmlResponse("server", 500);
    }

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: signed.signedUrl },
    });
  } catch (e) {
    console.error("short-link error", e);
    return htmlResponse("server", 500);
  }
});
