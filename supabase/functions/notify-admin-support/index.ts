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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { subject, message, userEmail, userName } = await req.json();

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

    const adminEmails = vipUsers.map((v: any) => v.email).filter(Boolean);

    let sentPush = 0;
    let sentEmail = 0;

    // Push notifications (existing flow)
    const { data: authData } = await supabase.auth.admin.listUsers();
    for (const email of adminEmails) {
      const adminUser = authData?.users?.find((u: any) => u.email === email);
      if (!adminUser) continue;

      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", adminUser.id);

      if (subs && subs.length > 0) {
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
            url: "/admin?tab=support",
          }),
        });
        if (response.ok) sentPush++;
      }
    }

    // Email notifications via Resend
    if (RESEND_API_KEY && adminEmails.length > 0) {
      const safe = (s: string) =>
        String(s ?? "").replace(/[&<>"']/g, (c) =>
          ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)
        );
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
          <h2 style="color:#0f766e;margin:0 0 12px">📩 Nova solicitação de suporte</h2>
          <p style="margin:0 0 8px"><strong>De:</strong> ${safe(userName || "—")} ${userEmail ? `&lt;${safe(userEmail)}&gt;` : ""}</p>
          <p style="margin:0 0 8px"><strong>Assunto:</strong> ${safe(subject || "—")}</p>
          ${message ? `<div style="margin:12px 0;padding:12px;background:#f5f5f5;border-radius:8px;white-space:pre-wrap">${safe(message)}</div>` : ""}
          <p style="margin:16px 0 0">
            <a href="https://aliviawebapp.com.br/admin?tab=support" style="display:inline-block;background:#0f766e;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Abrir painel de suporte</a>
          </p>
        </div>
      `;

      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Aliv.iA Suporte <onboarding@resend.dev>",
          to: adminEmails,
          reply_to: userEmail || undefined,
          subject: `[Suporte Aliv.iA] ${subject || "Nova solicitação"}`,
          html,
        }),
      });
      if (resp.ok) sentEmail = adminEmails.length;
      else console.error("[notify-admin-support] resend error", await resp.text());
    }

    return new Response(
      JSON.stringify({ sentPush, sentEmail }),
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
