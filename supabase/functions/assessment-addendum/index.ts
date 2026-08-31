// Public endpoint for assessment addenda ("informações adicionais") sent by the
// patient through a per-assessment link.
//
// POST { action: "load", token }              -> { addendum: { assessment_date, professional_name, status } }
// POST { action: "submit", token, content }   -> persists the text and notifies the professional
//
// The professional side writes addenda directly through RLS; only the public
// patient link goes through this function (service role).

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, token } = body ?? {};

    if (!token || typeof token !== "string" || token.length < 8) {
      return json({ error: "invalid_token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: row, error } = await supabase
      .from("assessment_addenda")
      .select("id, assessment_id, status, content, author_name")
      .eq("token", token)
      .maybeSingle();

    if (error || !row) return json({ error: "not_found" }, 404);

    const { data: assessment } = await supabase
      .from("assessments")
      .select("id, created_at, user_id, professional_id, clinic_id, patient_name")
      .eq("id", row.assessment_id)
      .maybeSingle();

    if (!assessment) return json({ error: "not_found" }, 404);

    let professionalName: string | null = null;
    let proUserId: string | null = null;
    if (assessment.professional_id) {
      const { data: pro } = await supabase
        .from("professionals")
        .select("user_id, full_name")
        .eq("id", assessment.professional_id)
        .maybeSingle();
      professionalName = pro?.full_name ?? null;
      proUserId = pro?.user_id ?? null;
    }
    if (!professionalName && assessment.clinic_id) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("name")
        .eq("id", assessment.clinic_id)
        .maybeSingle();
      professionalName = clinic?.name ?? null;
    }

    if (action === "load") {
      return json({
        addendum: {
          status: row.status,
          content: row.content ?? "",
          assessment_date: assessment.created_at,
          patient_name: assessment.patient_name ?? null,
          professional_name: professionalName,
        },
      });
    }

    if (action === "submit") {
      if (row.status === "submitted" && (row.content ?? "").trim().length > 0) {
        return json({ error: "already_submitted" }, 409);
      }
      const content = typeof body.content === "string" ? body.content.trim() : "";
      if (content.length < 3) return json({ error: "empty_content" }, 400);
      if (content.length > 5000) return json({ error: "too_long" }, 400);

      const { error: upErr } = await supabase
        .from("assessment_addenda")
        .update({
          content,
          status: "submitted",
          author_type: "patient",
          author_name: row.author_name ?? assessment.patient_name ?? null,
        })
        .eq("id", row.id);

      if (upErr) {
        console.error("addendum update error", upErr);
        return json({ error: "update_failed" }, 500);
      }

      // Flag the chart so the clinical impression can be refreshed after a
      // professional decides to reinterpret.
      try {
        await supabase
          .from("assessments")
          .update({ has_new_addendum: true } as any)
          .eq("id", assessment.id);
      } catch (_e) {
        // Column is optional — the addendum row itself is the source of truth.
      }

      try {
        if (proUserId || assessment.clinic_id) {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-push-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              user_id: proUserId ?? undefined,
              clinic_id: assessment.clinic_id ?? undefined,
              title: "🗒️ Novas informações do paciente",
              body: `${assessment.patient_name || "Um paciente"} adicionou informações à avaliação.`,
              url: `/assessment/view/${assessment.id}`,
              tag: `addendum-${row.id}`,
              category: "assessments",
            }),
          });
        }
      } catch (e) {
        console.warn("addendum push failed", e);
      }

      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    console.error("assessment-addendum error:", err);
    return json({ error: String(err) }, 500);
  }
});
