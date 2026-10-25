import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { provisionClinic, resolveMaxMembers } from "../_shared/clinicProvisioning.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CLINIC_PRODUCT_IDS = [
  "prod_UJMAcItKDx7QuT", "prod_UJMAFHGZBjeVu9",
  "prod_UJMJdKvyBfm52L", "prod_UJMJfh6qgMVQXD",
  "prod_UJMJk7jo3AtXwJ", "prod_UJMKiickrqzXs2",
];

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-CLINIC-SUBSCRIPTION] ${step}${d}`);
};

const TIER_MEMBERS: Record<string, number> = { small: 3, medium: 8, large: 999 };

// deno-lint-ignore no-explicit-any
async function selfHealClinic(admin: any, userId: string, email: string): Promise<string | null> {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return null;
  const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });
  const customers = await stripe.customers.list({ email, limit: 10 });
  for (const c of customers.data) {
    const subs = await stripe.subscriptions.list({ customer: c.id, status: "all", limit: 20 });
    for (const sub of subs.data) {
      if (!["active", "trialing"].includes(sub.status)) continue;
      const productId = sub.items.data[0]?.price?.product;
      if (typeof productId !== "string" || !CLINIC_PRODUCT_IDS.includes(productId)) continue;
      // The subscription must belong to this user (metadata) or to their email customer.
      if (sub.metadata?.user_id && sub.metadata.user_id !== userId) continue;
      let clinicName: string | null = null;
      let maxMembers: number | null = null;
      try {
        const sessions = await stripe.checkout.sessions.list({ subscription: sub.id, limit: 1 });
        const md = sessions.data[0]?.metadata;
        clinicName = md?.clinic_name ?? null;
        maxMembers = md?.max_members ? resolveMaxMembers(md.max_members) : null;
      } catch { /* ignore */ }
      if (!maxMembers && sub.metadata?.tier) maxMembers = TIER_MEMBERS[sub.metadata.tier] ?? null;
      const r = await provisionClinic(admin, { userId, clinicName, maxMembers, subscriptionId: sub.id });
      return r.clinicId;
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    // Check if user is a clinic owner
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let { data: clinics } = await supabaseAdmin
      .from("clinics")
      .select("*")
      .eq("owner_user_id", user.id);

    // Self-heal: paid clinic subscription in Stripe but no clinic row
    // (webhook missed/failed). Provision idempotently from Stripe data.
    if (!clinics || clinics.length === 0) {
      try {
        const healed = await selfHealClinic(supabaseAdmin, user.id, user.email);
        if (healed) {
          logStep("Self-heal provisioned clinic", { clinicId: healed });
          await supabaseAdmin.from("subscription_admin_actions").insert({
            action: "clinic_self_heal_provision",
            target_email: user.email,
            target_user_id: user.id,
            new_status: "active",
            reason: `Clínica criada automaticamente (aviso de pagamento não recebido): ${healed}`,
          }).then(() => {}, () => {});
          ({ data: clinics } = await supabaseAdmin
            .from("clinics").select("*").eq("owner_user_id", user.id));
        }
      } catch (e) {
        logStep("Self-heal failed", { message: e instanceof Error ? e.message : String(e) });
      }
    }

    if (!clinics || clinics.length === 0) {
      // Also check if user is a member of any clinic
      const { data: memberships } = await supabaseAdmin
        .from("clinic_members")
        .select("*, clinics(*)")
        .eq("user_id", user.id)
        .eq("status", "active");

      return new Response(JSON.stringify({
        is_owner: false,
        clinics: memberships?.map((m: any) => ({
          clinic_id: m.clinic_id,
          role: m.role,
          clinic_name: m.clinics?.name,
          subscription_status: m.clinics?.subscription_status,
        })) || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify Stripe subscription for each clinic the user owns
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    let activeClinicSub = false;
    let subscriptionEnd: string | null = null;

    if (customers.data.length > 0) {
      const subs = await stripe.subscriptions.list({
        customer: customers.data[0].id,
        status: "active",
        limit: 10,
      });

      for (const sub of subs.data) {
        const productId = sub.items.data[0]?.price?.product;
        if (typeof productId === "string" && CLINIC_PRODUCT_IDS.includes(productId)) {
          activeClinicSub = true;
          { const pe = (sub as any).current_period_end ?? (sub.items.data[0] as any)?.current_period_end; subscriptionEnd = pe ? new Date(pe * 1000).toISOString() : null; }

          // Update clinic subscription status
          for (const clinic of clinics) {
            if (clinic.subscription_status !== "active") {
              await supabaseAdmin
                .from("clinics")
                .update({ subscription_status: "active", subscription_stripe_id: sub.id })
                .eq("id", clinic.id);
            }
          }
          break;
        }
      }
    }

    if (!activeClinicSub) {
      for (const clinic of clinics) {
        if (clinic.subscription_status === "active") {
          await supabaseAdmin
            .from("clinics")
            .update({ subscription_status: "inactive" })
            .eq("id", clinic.id);
        }
      }
    }

    return new Response(JSON.stringify({
      is_owner: true,
      active: activeClinicSub,
      subscription_end: subscriptionEnd,
      clinics: clinics.map((c: any) => ({
        clinic_id: c.id,
        name: c.name,
        subscription_status: activeClinicSub ? "active" : c.subscription_status,
        max_members: c.max_members,
      })),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
