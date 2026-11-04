import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAuthUserId } from "../_shared/caller-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Thin client kept for backwards compatibility.
 * Admin alerting goes through `notify-admin` (DB trigger + cron sweep).
 * Callers must be signed in and may only re-notify their own ticket.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const userId = await getAuthUserId(req);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json().catch(() => ({} as any));
    let query = supabase
      .from("support_tickets")
      .select("id")
      .eq("user_id", userId)
      .is("notified_at", null);
    if (typeof payload?.ticket_id === "string" && UUID_RE.test(payload.ticket_id)) {
      query = query.eq("id", payload.ticket_id);
    } else if (payload?.subject) {
      query = query.eq("subject", String(payload.subject).slice(0, 300));
    }
    const { data } = await query.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data?.id) return json({ ok: true, skipped: true });

    const resp = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
      body: JSON.stringify({ action: "ticket", ticket_id: data.id }),
    });
    await resp.text();
    return json({ ok: resp.ok }, resp.ok ? 200 : 502);
  } catch (err) {
    console.error("[notify-admin-support] Error:", err);
    return json({ error: "Internal error" }, 500);
  }
});
