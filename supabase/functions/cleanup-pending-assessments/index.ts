import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { isInternalCall } from "../_shared/caller-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  // Scheduled job only: reject anything without the internal secret / service key.
  if (!isInternalCall(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("assessments")
      .delete()
      .eq("payment_status", "awaiting_payment")
      .lt("created_at", sevenDaysAgo.toISOString())
      .select("id");

    if (error) throw error;

    const count = data?.length ?? 0;
    console.log(`[cleanup-pending] Deleted ${count} expired pending assessments`);

    return new Response(JSON.stringify({ deleted: count }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[cleanup-pending] Error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
