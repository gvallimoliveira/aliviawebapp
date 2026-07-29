import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Thin client kept for backwards compatibility.
 * All admin alerting now goes through the central `notify-admin` function,
 * which is also triggered server-side on ticket insert + by a cron sweep.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json().catch(() => ({} as any));

    // Resolve the most recent ticket for this user/subject when no id is given
    let ticketId = payload?.ticket_id as string | undefined;
    if (!ticketId && payload?.subject) {
      const { data } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("subject", String(payload.subject))
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      ticketId = data?.id;
    }

    const resp = await fetch(`${supabaseUrl}/functions/v1/notify-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: ticketId
        ? JSON.stringify({ action: "ticket", ticket_id: ticketId })
        : JSON.stringify({ action: "sweep" }),
    });
    const out = await resp.text();

    return new Response(out, {
      status: resp.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-admin-support] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
