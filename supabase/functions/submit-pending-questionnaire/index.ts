// Public endpoint to load and submit a pending questionnaire via share_token.
// Used by the patient when receiving a link from the professional.
//
// POST { action: "load", token }   -> returns { questionnaire }
// POST { action: "submit", token, answers, score } -> persists and marks completed

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, token } = body;

    if (!token || typeof token !== "string" || token.length < 8) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: pending, error } = await supabase
      .from("pending_questionnaires")
      .select("id, questionnaire_id, domain, status, suggested_reason, professional_id, clinic_id, assessment_id")
      .eq("share_token", token)
      .maybeSingle();

    if (error || !pending) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "load") {
      return new Response(JSON.stringify({ pending }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "submit") {
      if (pending.status === "completed") {
        return new Response(JSON.stringify({ error: "already_completed" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { answers, score } = body;
      const { error: upErr } = await supabase
        .from("pending_questionnaires")
        .update({
          status: "completed",
          answers: answers ?? {},
          score: score ?? null,
          completed_at: new Date().toISOString(),
          completed_via: "patient_link",
        })
        .eq("id", pending.id);

      if (upErr) {
        console.error("submit update error", upErr);
        return new Response(JSON.stringify({ error: "update_failed" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-pending-questionnaire error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
