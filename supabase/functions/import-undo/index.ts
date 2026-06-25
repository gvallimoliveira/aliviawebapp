// Apaga registros criados por um import_batch, enquanto a janela de undo ainda está válida.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const TABLES = ["patients", "assessments", "session_notes", "pain_diary_entries", "professional_appointments"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes } = await admin.auth.getUser(authHeader.replace(/^Bearer\s+/i, ""));
    const user = userRes?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { batchId } = await req.json();
    if (!batchId) return new Response(JSON.stringify({ error: "batchId required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: batch } = await admin.from("import_batches").select("*").eq("id", batchId).maybeSingle();
    if (!batch) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (batch.user_id !== user.id) {
      // allow clinic admin
      if (batch.clinic_id) {
        const { data: m } = await admin.from("clinic_members").select("role").eq("clinic_id", batch.clinic_id).eq("user_id", user.id).eq("status", "active").maybeSingle();
        if (!m || !["owner", "admin"].includes(m.role as string)) {
          return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } else {
        return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (new Date(batch.expires_undo_at) < new Date()) {
      return new Response(JSON.stringify({ error: "undo_window_expired" }), { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (batch.undone_at) {
      return new Response(JSON.stringify({ error: "already_undone" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const deleted: Record<string, number> = {};
    for (const t of TABLES) {
      const { error, count } = await admin.from(t).delete({ count: "exact" }).eq("import_batch_id", batchId);
      deleted[t] = count ?? 0;
      if (error) console.error(`undo ${t}`, error);
    }

    await admin.from("import_batches").update({ status: "undone", undone_at: new Date().toISOString() }).eq("id", batchId);

    return new Response(JSON.stringify({ batchId, deleted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
