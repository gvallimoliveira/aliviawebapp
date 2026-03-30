import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { subject } = await req.json();

    // Get all admin emails from vip_users
    const { data: vipUsers } = await supabase
      .from("vip_users")
      .select("email");

    if (!vipUsers || vipUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No admin users found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find auth user IDs for admin emails
    let sent = 0;
    for (const vip of vipUsers) {
      const { data: authData } = await supabase.auth.admin.listUsers();
      const adminUser = authData?.users?.find((u: any) => u.email === vip.email);
      if (!adminUser) continue;

      // Get push subscriptions for this admin
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", adminUser.id);

      if (!subs || subs.length === 0) continue;

      // Send push to each subscription via the existing edge function
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          user_id: adminUser.id,
          title: "📩 Nova solicitação de suporte",
          body: subject || "Um usuário enviou uma mensagem de suporte.",
          url: "/admin",
        }),
      });

      if (response.ok) sent++;
    }

    return new Response(
      JSON.stringify({ sent }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[notify-admin-support] Error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
