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
