import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { resolveStripeContext } from "../_shared/stripeSubs.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: unknown) =>
  console.log(`[customer-portal] ${step}`, details ? JSON.stringify(details) : "");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_ORIGINS = [
  "https://aliviawebapp.com.br",
  "https://www.aliviawebapp.com.br",
  "https://aliviawebapp.lovable.app",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "no_auth", message: "Sessão expirada. Entre novamente." }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      return json({ error: "invalid_session", message: "Sessão expirada. Entre novamente." }, 401);
    }
    const user = userData.user;

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const requestedPath = typeof (body as any)?.return_path === "string" ? (body as any).return_path : "";

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Vínculo resolvido do mesmo jeito para todos os usuários (PRO, clínica,
    // premium): id salvo no banco -> metadata.user_id -> e-mails conhecidos.
    const ctx = await resolveStripeContext(stripe, supabaseClient, user);
    if (!ctx.primaryCustomerId) {
      log("no customer", { userId: user.id });
      return json({
        error: "no_customer",
        message: "Não encontramos um cadastro de pagamento vinculado à sua conta. Se seu acesso é de cortesia (parceiro, acadêmico ou concedido), não há faturas para gerenciar.",
      }, 404);
    }

    const reqOrigin = req.headers.get("origin") || "";
    const origin = ALLOWED_ORIGINS.includes(reqOrigin) || reqOrigin.startsWith("http://localhost")
      ? reqOrigin
      : ALLOWED_ORIGINS[0];
    const returnPath = requestedPath.startsWith("/") ? requestedPath : "/conta";

    let portalSession;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: ctx.primaryCustomerId,
        return_url: `${origin}${returnPath}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log("portal creation failed", { customerId: ctx.primaryCustomerId, msg });
      return json({
        error: "portal_unavailable",
        message: "O portal de pagamentos está temporariamente indisponível. Tente novamente em instantes ou fale com o suporte.",
        detail: msg,
      }, 502);
    }

    log("portal created", { customerId: ctx.primaryCustomerId, sessionId: portalSession.id });
    return json({ url: portalSession.url, customer_id: ctx.primaryCustomerId });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { msg });
    return json({ error: "unexpected", message: "Não foi possível abrir o portal de pagamentos.", detail: msg }, 500);
  }
});
