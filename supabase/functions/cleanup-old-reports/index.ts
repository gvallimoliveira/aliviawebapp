import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { isInternalCall } from "../_shared/caller-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Scheduled job only: reject anything without the internal secret / service key.
  if (!isInternalCall(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;
    const cutoffDate = new Date(Date.now() - SIX_MONTHS_MS);

    // List all files in the bucket
    const { data: files, error: listError } = await supabase.storage
      .from("assessment-reports")
      .list("", { limit: 1000, sortBy: { column: "created_at", order: "asc" } });

    if (listError) {
      console.error("Error listing files:", listError);
      return new Response(
        JSON.stringify({ error: listError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!files || files.length === 0) {
      console.log("No files found in assessment-reports bucket.");
      return new Response(
        JSON.stringify({ deleted: 0, message: "No files to clean up" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter files older than 6 months
    const oldFiles = files.filter((f) => {
      if (!f.created_at) return false;
      return new Date(f.created_at) < cutoffDate;
    });

    if (oldFiles.length === 0) {
      console.log("No files older than 6 months found.");
      return new Response(
        JSON.stringify({ deleted: 0, message: "No old files to clean up" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete in batches of 100
    let totalDeleted = 0;
    const batchSize = 100;
    const filePaths = oldFiles.map((f) => f.name);

    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize);
      const { error: deleteError } = await supabase.storage
        .from("assessment-reports")
        .remove(batch);

      if (deleteError) {
        console.error(`Error deleting batch starting at ${i}:`, deleteError);
      } else {
        totalDeleted += batch.length;
      }
    }

    console.log(`Cleanup complete: deleted ${totalDeleted} of ${oldFiles.length} old files.`);

    return new Response(
      JSON.stringify({
        deleted: totalDeleted,
        total_old: oldFiles.length,
        cutoff_date: cutoffDate.toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
