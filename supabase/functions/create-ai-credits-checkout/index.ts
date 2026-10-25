// Create a Stripe Checkout session for an AI credits pack (one-off).
// Webhook (`stripe-webhook` → fulfillOrder) credits the user upon "paid".
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

import { AI_CREDIT_PACKAGES, safeCreditReturnOrigin } from "../_shared/ai-credit-catalog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const htmlHeaders = { "Content-Type": "text/html; charset=utf-8" };

function redirectToApp(origin: string, status: "error" | "canceled") {
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${origin}/dashboard?tab=insights&ai_credits=${status}`,
    },
  });
}

function htmlError(message: string, status = 400) {
  return new Response(
    `<!doctype html><html><body><p>${message}</p><script>history.length > 1 && history.back()</script></body></html>`,
    { status, headers: htmlHeaders },
  );
}

// Server-side catalog — never trust client to set prices or credit amounts.
// 2026-07 reescala: pacotes avulsos são um EXTRA da assinatura (60 cr/mês),
// não um substituto. Escala pequena e preço por crédito crescente para
// desincentivar a compra do pacote maior no lugar da assinatura.
const PACKAGES = AI_CREDIT_PACKAGES;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const isFormPost = contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data");

    let token = req.headers.get("Authorization")?.replace("Bearer ", "") || "";
    let packageKey = "";
    let shouldRedirect = false;
    let returnOrigin = "";

    if (isFormPost) {
      const form = await req.formData();
      token = String(form.get("access_token") || token);
      packageKey = String(form.get("package") || "").toLowerCase();
      shouldRedirect = String(form.get("redirect") || "") === "1";
      returnOrigin = String(form.get("return_origin") || "");
    } else {
      const body = await req.json().catch(() => ({}));
      packageKey = String(body?.package || "").toLowerCase();
      shouldRedirect = body?.redirect === true;
      returnOrigin = String(body?.return_origin || "");
    }

    const origin = safeCreditReturnOrigin(returnOrigin || req.headers.get("origin") || "");

    if (!token) {
      if (shouldRedirect) return redirectToApp(origin, "error");
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { data: userData, error: userErr } =
      await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    if (userErr || !user?.id || !user.email) {
      if (shouldRedirect) return redirectToApp(origin, "error");
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pkg = PACKAGES[packageKey];
    if (!pkg) {
      if (shouldRedirect) return redirectToApp(origin, "error");
      return new Response(JSON.stringify({ error: "Invalid package" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: creditStatus, error: statusError } = await admin.rpc("get_user_credit_status", { _user_id: user.id });
    if (statusError || !creditStatus) throw new Error("Unable to resolve credit account");
    if (!creditStatus.can_buy) {
      if (shouldRedirect) return redirectToApp(origin, "error");
      return new Response(JSON.stringify({ error: "Only the clinic manager can buy credit packs" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Reuse customer when possible
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });
    const customerId = customers.data[0]?.id;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [{ price: pkg.price_id, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/dashboard?tab=insights&ai_credits=success`,
      cancel_url: `${origin}/dashboard?tab=insights&ai_credits=canceled`,
      metadata: {
        type: "ai_credits",
        clinic_id: creditStatus.clinic_id ?? "",
        user_id: user.id,
        package_key: packageKey,
        credits: String(pkg.credits),
        price_brl: String(pkg.price_brl),
      },
    });

    if (shouldRedirect) {
      if (!session.url) return redirectToApp(origin, "error");
      return new Response(null, {
        status: 303,
        headers: { Location: session.url },
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: any) {
    console.error("[create-ai-credits-checkout]", err);
    const acceptsHtml = req.headers.get("accept")?.includes("text/html");
    if (acceptsHtml) return htmlError("Não foi possível iniciar o pagamento.", 500);
    return new Response(JSON.stringify({ error: err.message || "Internal" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
