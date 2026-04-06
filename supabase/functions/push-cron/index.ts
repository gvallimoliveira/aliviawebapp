import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const results = {
      diary_reminders: 0,
      premium_reminders: 0,
      basic_invites: 0,
      referral_coupons_applied: 0,
      abandoned_reminders: 0,
      boleto_expiry_reminders: 0,
      exercise_reminders: 0,
      pain_spike_alerts: 0,
      inactivity_alerts: 0,
      errors: [] as string[],
    };

    // Helper: send push to a user
    async function notifyUser(userId: string, title: string, body: string, url: string) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint")
        .eq("user_id", userId);
      if (!subs || subs.length === 0) return false;

      // Call send-push-notification edge function
      const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ user_id: userId, title, body, url }),
      });
      return res.ok;
    }

    const today = new Date().toISOString().split("T")[0];

    // 1. DIARY REMINDERS — users with push subscription who haven't logged today
    const { data: allSubs } = await supabase
      .from("push_subscriptions")
      .select("user_id");

    if (allSubs && allSubs.length > 0) {
      const userIds = [...new Set(allSubs.map((s: any) => s.user_id))];

      // Get today's diary entries
      const { data: todayEntries } = await supabase
        .from("pain_diary_entries")
        .select("user_id")
        .eq("logged_at", today)
        .in("user_id", userIds);

      const loggedUserIds = new Set((todayEntries || []).map((e: any) => e.user_id));
      const needsReminder = userIds.filter((id) => !loggedUserIds.has(id));

      for (const userId of needsReminder) {
        try {
          const sent = await notifyUser(
            userId,
            "📝 Diário de Dor",
            "Como está sua dor hoje? Registre no diário para acompanhar sua evolução.",
            "/dashboard"
          );
          if (sent) results.diary_reminders++;
        } catch (e) {
          results.errors.push(`diary ${userId}: ${e}`);
        }
      }
    }

    // 2. PREMIUM REMINDERS — users with paid premium who have unused assessments
    // Check users with active premium (paid_at within 7 days, assessments_used < max)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentPremium } = await supabase
      .from("assessments")
      .select("user_id, type, status, paid_at")
      .eq("type", "premium")
      .not("user_id", "is", null)
      .gte("paid_at", sevenDaysAgo.toISOString());

    if (recentPremium) {
      // Group by user_id, check if they have completed < 2 assessments
      const userAssessments = new Map<string, { total: number; completed: number }>();
      for (const a of recentPremium) {
        if (!a.user_id) continue;
        const curr = userAssessments.get(a.user_id) || { total: 0, completed: 0 };
        curr.total++;
        if (a.status === "completed") curr.completed++;
        userAssessments.set(a.user_id, curr);
      }

      for (const [userId, counts] of userAssessments) {
        if (counts.completed < 2 && counts.total < 2) {
          try {
            const sent = await notifyUser(
              userId,
              "⭐ Avaliação Premium disponível",
              "Você ainda tem avaliações premium para realizar. Aproveite!",
              "/assessment/premium"
            );
            if (sent) results.premium_reminders++;
          } catch (e) {
            results.errors.push(`premium ${userId}: ${e}`);
          }
        }
      }
    }

    // 3. BASIC INVITE — users who have push but never did any assessment (biweekly check)
    const dayOfMonth = new Date().getDate();
    if (dayOfMonth === 1 || dayOfMonth === 15) {
      if (allSubs && allSubs.length > 0) {
        const userIds = [...new Set(allSubs.map((s: any) => s.user_id))];

        const { data: usersWithAssessments } = await supabase
          .from("assessments")
          .select("user_id")
          .in("user_id", userIds)
          .not("user_id", "is", null);

        const hasAssessment = new Set((usersWithAssessments || []).map((a: any) => a.user_id));
        const noAssessment = userIds.filter((id) => !hasAssessment.has(id));

        for (const userId of noAssessment) {
          try {
            const sent = await notifyUser(
              userId,
              "🩺 Avaliação Gratuita",
              "Descubra o que pode estar causando sua dor. Faça uma avaliação gratuita agora.",
              "/assessment/basic"
            );
            if (sent) results.basic_invites++;
          } catch (e) {
            results.errors.push(`basic ${userId}: ${e}`);
          }
        }
      }
    }

    // 4. SAFETY NET — apply pending referral coupons to active subscribers
    try {
      const { data: pendingRewards } = await supabase
        .from("referral_rewards")
        .select("id, referrer_user_id, stripe_coupon_id")
        .eq("status", "rewarded")
        .not("stripe_coupon_id", "is", null);

      if (pendingRewards && pendingRewards.length > 0) {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        if (stripeKey) {
          const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

          for (const reward of pendingRewards) {
            try {
              // Get referrer email
              const { data: referrerAuth } = await supabase.auth.admin.getUserById(reward.referrer_user_id);
              if (!referrerAuth?.user?.email) continue;

              const customers = await stripe.customers.list({ email: referrerAuth.user.email, limit: 1 });
              if (customers.data.length === 0) continue;

              const subs = await stripe.subscriptions.list({
                customer: customers.data[0].id,
                status: "active",
                limit: 1,
              });

              if (subs.data.length > 0) {
                await stripe.subscriptions.update(subs.data[0].id, {
                  coupon: reward.stripe_coupon_id,
                });
                await supabase
                  .from("referral_rewards")
                  .update({ status: "used" })
                  .eq("id", reward.id);
                results.referral_coupons_applied++;
                console.log(`[push-cron] Applied coupon ${reward.stripe_coupon_id} to subscriber ${reward.referrer_user_id}`);
              }
            } catch (e) {
              results.errors.push(`referral_coupon ${reward.id}: ${e}`);
            }
          }
        }
      }
    } catch (e) {
      results.errors.push(`referral_safety_net: ${e}`);
    }

    // 5. ABANDONED ASSESSMENT REMINDERS — users with in_progress assessments older than 1h
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const sevenDaysAgoStr = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const { data: abandoned } = await supabase
        .from("assessments")
        .select("id, user_id, type, updated_at")
        .eq("status", "in_progress")
        .not("user_id", "is", null)
        .lt("updated_at", oneHourAgo)
        .gte("created_at", sevenDaysAgoStr);

      if (abandoned && abandoned.length > 0) {
        // Only remind users who have push subscriptions
        const abandonedUserIds = [...new Set(abandoned.map((a: any) => a.user_id).filter(Boolean))];
        const usersWithPush = allSubs
          ? new Set(allSubs.map((s: any) => s.user_id))
          : new Set<string>();

        const todayStr = new Date().toISOString().split("T")[0];

        for (const a of abandoned) {
          if (!a.user_id || !usersWithPush.has(a.user_id)) continue;
          // Limit: 1 reminder per assessment per day (check updated_at date)
          const lastUpdate = a.updated_at ? a.updated_at.split("T")[0] : "";
          if (lastUpdate === todayStr) continue;

          try {
            const sent = await notifyUser(
              a.user_id,
              "📋 Avaliação incompleta",
              "Sua avaliação está quase pronta! Continue de onde parou.",
              `/assessment/${a.type || "basic"}`
            );
            if (sent) results.abandoned_reminders++;
          } catch (e) {
            results.errors.push(`abandoned ${a.id}: ${e}`);
          }
        }
      }
    } catch (e) {
      results.errors.push(`abandoned_reminders: ${e}`);
    }

    // 6. BOLETO EXPIRY REMINDERS — notify users 2 days before boleto expires (1 day after creation)
    try {
      // Boletos expire in 3 business days. We notify ~1 day after creation (2 days before expiry).
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

      const { data: pendingBoletos } = await supabase
        .from("assessments")
        .select("id, user_id, created_at")
        .eq("payment_status", "awaiting_payment")
        .not("user_id", "is", null)
        .lt("created_at", oneDayAgo.toISOString())
        .gte("created_at", twoDaysAgo.toISOString());

      if (pendingBoletos && pendingBoletos.length > 0) {
        const usersWithPush = allSubs
          ? new Set(allSubs.map((s: any) => s.user_id))
          : new Set<string>();

        for (const assessment of pendingBoletos) {
          if (!assessment.user_id || !usersWithPush.has(assessment.user_id)) continue;
          try {
            const sent = await notifyUser(
              assessment.user_id,
              "⏰ Boleto expirando em breve",
              "Seu boleto expira em 2 dias. Caso não tenha pago, gere um novo para não perder seus dados da avaliação.",
              "/dashboard"
            );
            if (sent) results.boleto_expiry_reminders++;
          } catch (e) {
            results.errors.push(`boleto_expiry ${assessment.id}: ${e}`);
          }
        }
      }
    } catch (e) {
      results.errors.push(`boleto_expiry_reminders: ${e}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        timestamp: new Date().toISOString(),
        ...results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
