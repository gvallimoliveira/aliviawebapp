import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clinic_id, service_type, patient_name } = await req.json();

    if (!clinic_id) {
      return new Response(
        JSON.stringify({ error: "clinic_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    webpush.setVapidDetails(
      "mailto:contato@aliviawebapp.com.br",
      vapidPublicKey,
      vapidPrivateKey
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get clinic owner + secretaries
    const { data: members } = await supabase
      .from("clinic_members")
      .select("user_id, role")
      .eq("clinic_id", clinic_id)
      .eq("status", "active")
      .in("role", ["owner", "secretary"]);

    if (!members || members.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userIds = members.map((m) => m.user_id);

    // Get push subscriptions for these users
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", userIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceLabel = service_type || "serviço";
    const title = "📋 Novo feedback recebido";
    const body = patient_name
      ? `${patient_name} enviou um feedback sobre ${serviceLabel}`
      : `Novo feedback sobre ${serviceLabel} recebido`;

    let sent = 0;
    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title,
            body,
            url: "/dashboard",
          })
        );
        sent++;
      } catch (pushError: any) {
        if (pushError.statusCode === 410 || pushError.statusCode === 404) {
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ sent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
