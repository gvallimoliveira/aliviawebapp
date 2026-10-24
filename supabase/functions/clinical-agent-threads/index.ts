import { canUseAgentScope } from "../_shared/agent-care-scope.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: vip }, { data: cfg }] = await Promise.all([
      adminClient.from("vip_users").select("id").eq("email", (user.email || "").toLowerCase().trim()).maybeSingle(),
      adminClient.from("app_config").select("value").eq("key", "clinical_agent_enabled").maybeSingle(),
    ]);
    const allowed = !!vip || cfg?.value === true;
    if (!allowed) {
      return new Response(JSON.stringify({ error: "not_available" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const action = body?.action;

    if (action === "access_status") {
      return new Response(JSON.stringify({
        hasAccess: allowed,
        isVip: !!vip,
        globalEnabled: cfg?.value === true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clinicId = body.clinic_id || null;
    const forbidden = (error: string) => new Response(JSON.stringify({ error }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    if (!(await canUseAgentScope(adminClient, user.id, clinicId))) return forbidden("clinic_forbidden");
    let threadClinicId: string | null = clinicId;
    if (action !== "create") {
      const { data: thread, error } = await adminClient.from("agent_threads")
        .select("id, clinic_id").eq("id", body.thread_id).eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!thread || (thread.clinic_id || null) !== clinicId) return forbidden("thread_scope_forbidden");
      threadClinicId = thread.clinic_id || null;
    }

    if (action === "create") {
      const { patient_id, clinic_id, title } = body;
      if (patient_id && !(await canUseAgentScope(adminClient, user.id, threadClinicId, patient_id))) {
        return new Response(JSON.stringify({ error: "patient_forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await adminClient.from("agent_threads").insert({
        user_id: user.id,
        patient_id: patient_id || null,
        clinic_id: clinic_id || null,
        title: title || "Nova conversa",
      }).select().single();
      if (error) throw error;
      return new Response(JSON.stringify({ thread: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_mentor_mode") {
      const { thread_id, mentor_mode } = body;
      const { error } = await adminClient.from("agent_threads")
        .update({ mentor_mode: !!mentor_mode })
        .eq("id", thread_id).eq("user_id", user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, mentor_mode: !!mentor_mode }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rename") {
      const { thread_id, title } = body;
      const { error } = await adminClient.from("agent_threads")
        .update({ title: String(title).slice(0, 120) })
        .eq("id", thread_id).eq("user_id", user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "archive") {
      const { thread_id, archived } = body;
      const { error } = await adminClient.from("agent_threads")
        .update({ archived: !!archived })
        .eq("id", thread_id).eq("user_id", user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { thread_id } = body;
      const { error } = await adminClient.from("agent_threads")
        .delete().eq("id", thread_id).eq("user_id", user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "attach_patient") {
      const { thread_id, patient_id } = body;
      if (patient_id && !(await canUseAgentScope(adminClient, user.id, threadClinicId, patient_id))) {
        return new Response(JSON.stringify({ error: "patient_forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.from("agent_threads")
        .update({ patient_id: patient_id || null })
        .eq("id", thread_id).eq("user_id", user.id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown_action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("[clinical-agent-threads] error", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
