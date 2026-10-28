import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isInternalCall } from "../_shared/caller-auth.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Scheduled job only: reject anything without the internal secret / service key.
  if (!isInternalCall(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
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
      reassessment_suggestions: 0,
      streak_milestones: 0,
      subscription_expiring: 0,
      errors: [] as string[],
    };

    // Helper: send push to a single user
    async function notifyUser(userId: string, title: string, body: string, url: string, category?: string) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint")
        .eq("user_id", userId);
      if (!subs || subs.length === 0) return false;

      const res = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({ user_id: userId, title, body, url, category }),
      });
      return res.ok;
    }

    // Helper: send push to clinic owner + secretary (therapists stay out)
    async function notifyClinicStaff(clinicId: string, title: string, body: string, url: string) {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("user_id")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .in("role", ["owner", "secretary"]);
      let count = 0;
      for (const m of members || []) {
        if (await notifyUser(m.user_id, title, body, url)) count++;
      }
      return count;
    }

    // Resolve a patient (by user_id or email) → clinic_id if they belong to a clinic
    async function resolveClinicForPatient(userId: string | null, email: string | null) {
      if (userId) {
        const { data } = await supabase
          .from("assessments")
          .select("clinic_id")
          .eq("user_id", userId)
          .not("clinic_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (data?.clinic_id) return data.clinic_id as string;
      }
      if (email) {
        const { data } = await supabase
          .from("patients")
          .select("clinic_id")
          .ilike("email", email)
          .not("clinic_id", "is", null)
          .limit(1)
          .maybeSingle();
        if (data?.clinic_id) return data.clinic_id as string;
      }
      return null;
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
            "/dashboard",
            "care_plan",
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
              "/assessment/premium",
              "payments",
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
              "/assessment/basic",
              "my_assessment",
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
              `/assessment/${a.type || "basic"}`,
              "my_assessment",
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
              "/dashboard",
              "payments",
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

    // 7. EXERCISE REMINDERS — users with active exercise programs who haven't completed today
    try {
      const { data: activePrograms } = await supabase
        .from("exercise_programs")
        .select("id, patient_name, assessment_id")
        .gt("expires_at", new Date().toISOString());

      if (activePrograms && activePrograms.length > 0) {
        const assessmentIds = activePrograms.map((p: any) => p.assessment_id).filter(Boolean);
        if (assessmentIds.length > 0) {
          const { data: assessmentUsers } = await supabase
            .from("assessments")
            .select("id, user_id")
            .in("id", assessmentIds)
            .not("user_id", "is", null);

          const assessmentToUser = new Map(
            (assessmentUsers || []).map((a: any) => [a.id, a.user_id])
          );
          const usersWithPush = allSubs ? new Set(allSubs.map((s: any) => s.user_id)) : new Set<string>();

          const { data: todayCompletions } = await supabase
            .from("exercise_completions")
            .select("user_id")
            .eq("completed_at", today);

          const usersCompletedToday = new Set((todayCompletions || []).map((c: any) => c.user_id));
          const notifiedUsers = new Set<string>();

          for (const prog of activePrograms) {
            if (!prog.assessment_id) continue;
            const userId = assessmentToUser.get(prog.assessment_id);
            if (!userId || notifiedUsers.has(userId) || !usersWithPush.has(userId) || usersCompletedToday.has(userId)) continue;

            try {
              const sent = await notifyUser(userId, "💪 Hora dos exercícios!", "Seus exercícios de hoje estão te esperando. Marque cada um ao concluir!", "/dashboard", "care_plan");
              if (sent) { results.exercise_reminders++; notifiedUsers.add(userId); }
            } catch (e) { results.errors.push(`exercise_reminder ${userId}: ${e}`); }
          }
        }
      }
    } catch (e) { results.errors.push(`exercise_reminders: ${e}`); }

    // 8. SMART ALERTS — notify professionals on pain spikes or patient inactivity
    try {
      // 8a. Pain spike: latest diary entry 2+ above patient's average
      const { data: recentDiary } = await supabase
        .from("pain_diary_entries")
        .select("user_id, pain_score, logged_at")
        .gte("logged_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0])
        .order("logged_at", { ascending: false });

      if (recentDiary && recentDiary.length > 0) {
        const userEntries = new Map<string, { scores: number[]; latest: number; latestDate: string }>();
        for (const entry of recentDiary) {
          if (!entry.user_id) continue;
          const existing = userEntries.get(entry.user_id);
          if (!existing) {
            userEntries.set(entry.user_id, { scores: [entry.pain_score], latest: entry.pain_score, latestDate: entry.logged_at });
          } else { existing.scores.push(entry.pain_score); }
        }

        const threeDaysAgoStr = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const spikeUsers: string[] = [];
        for (const [userId, data] of userEntries) {
          if (data.scores.length < 3) continue;
          const avg = data.scores.slice(1).reduce((a, b) => a + b, 0) / (data.scores.length - 1);
          if (data.latest >= avg + 2 && data.latestDate >= threeDaysAgoStr) spikeUsers.push(userId);
        }

        if (spikeUsers.length > 0) {
          const { data: refs } = await supabase.from("professional_referrals").select("professional_id, patient_user_id").in("patient_user_id", spikeUsers).in("status", ["pending", "accepted"]);
          if (refs && refs.length > 0) {
            const proIds = [...new Set(refs.map((r: any) => r.professional_id))];
            const { data: pros } = await supabase.from("professionals").select("id, user_id").in("id", proIds);
            const proUserMap = new Map((pros || []).map((p: any) => [p.id, p.user_id]));

            const notifiedClinics = new Set<string>();
            for (const ref of refs) {
              const proUserId = proUserMap.get(ref.professional_id);
              const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", ref.patient_user_id).maybeSingle();
              const name = profile?.full_name || "Paciente";
              const title = "⚠️ Alerta: Piora de dor";
              const body = `${name} registrou aumento significativo de dor. Considere entrar em contato.`;
              const url = "/dashboard?tab=professional";
              try {
                if (proUserId) {
                  const sent = await notifyUser(proUserId, title, body, url);
                  if (sent) results.pain_spike_alerts++;
                }
                // Also route to clinic owner+secretary if patient is clinic-linked
                const { data: au } = await supabase.auth.admin.getUserById(ref.patient_user_id);
                const clinicId = await resolveClinicForPatient(ref.patient_user_id, au?.user?.email || null);
                if (clinicId && !notifiedClinics.has(clinicId)) {
                  const fanned = await notifyClinicStaff(clinicId, title, body, "/dashboard?tab=clinic");
                  results.pain_spike_alerts += fanned;
                  notifiedClinics.add(clinicId);
                }
              } catch (e) { results.errors.push(`pain_spike ${ref.patient_user_id}: ${e}`); }
            }
          }
        }
      }

      // 8b. Inactivity: patient hasn't logged diary for 7+ days (weekly check)
      if (dayOfMonth % 7 === 0) {
        const sevenDaysAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const { data: allRefs } = await supabase.from("professional_referrals").select("professional_id, patient_user_id").in("status", ["pending", "accepted"]);
        if (allRefs && allRefs.length > 0) {
          const patientIds = [...new Set(allRefs.map((r: any) => r.patient_user_id))];
          const { data: lastEntries } = await supabase.from("pain_diary_entries").select("user_id, logged_at").in("user_id", patientIds).order("logged_at", { ascending: false });
          const lastEntryMap = new Map<string, string>();
          for (const entry of (lastEntries || [])) { if (!lastEntryMap.has(entry.user_id)) lastEntryMap.set(entry.user_id, entry.logged_at); }
          const inactivePatients = patientIds.filter((id) => { const last = lastEntryMap.get(id); return !last || last < sevenDaysAgoDate; });

          if (inactivePatients.length > 0) {
            const proIds = [...new Set(allRefs.filter((r: any) => inactivePatients.includes(r.patient_user_id)).map((r: any) => r.professional_id))];
            const { data: pros } = await supabase.from("professionals").select("id, user_id").in("id", proIds);
            const proUserMap = new Map((pros || []).map((p: any) => [p.id, p.user_id]));
            const notifiedPros = new Set<string>();

            for (const proId of proIds) {
              const proUserId = proUserMap.get(proId);
              if (!proUserId || notifiedPros.has(proUserId)) continue;
              const count = allRefs.filter((r: any) => r.professional_id === proId && inactivePatients.includes(r.patient_user_id)).length;
              try {
                const sent = await notifyUser(proUserId, "📊 Pacientes inativos", `${count} paciente(s) não registram dados há mais de 7 dias.`, "/dashboard?tab=professional");
                if (sent) { results.inactivity_alerts++; notifiedPros.add(proUserId); }
              } catch (e) { results.errors.push(`inactivity ${proUserId}: ${e}`); }
            }
          }
        }
      }
    } catch (e) { results.errors.push(`smart_alerts: ${e}`); }

    // 9. REASSESSMENT SUGGESTIONS — weekly nudge if last completed assessment > 30 days
    try {
      const dayOfWeek = new Date().getUTCDay(); // 1 = Monday
      if (dayOfWeek === 1 && allSubs && allSubs.length > 0) {
        const userIds = [...new Set(allSubs.map((s: any) => s.user_id))];
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: completed } = await supabase
          .from("assessments")
          .select("user_id, created_at")
          .eq("status", "completed")
          .in("user_id", userIds)
          .order("created_at", { ascending: false });
        const lastByUser = new Map<string, string>();
        for (const a of completed || []) {
          if (!a.user_id) continue;
          if (!lastByUser.has(a.user_id)) lastByUser.set(a.user_id, a.created_at);
        }
        for (const userId of userIds) {
          const last = lastByUser.get(userId);
          if (!last || last < thirtyDaysAgo) {
            try {
              const sent = await notifyUser(
                userId,
                "📊 Que tal uma reavaliação?",
                "Já se passaram 30+ dias. Refaça a avaliação para acompanhar sua evolução.",
                "/dashboard",
                "my_assessment",
              );
              if (sent) results.reassessment_suggestions++;
            } catch (e) { results.errors.push(`reassessment ${userId}: ${e}`); }
          }
        }
      }
    } catch (e) { results.errors.push(`reassessment_block: ${e}`); }

    // 10. STREAK MILESTONES — celebrate 7/14/30/60/100-day pain-diary streaks
    try {
      if (allSubs && allSubs.length > 0) {
        const userIds = [...new Set(allSubs.map((s: any) => s.user_id))];
        const sinceStr = new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const { data: entries } = await supabase
          .from("pain_diary_entries")
          .select("user_id, logged_at")
          .in("user_id", userIds)
          .gte("logged_at", sinceStr)
          .order("logged_at", { ascending: false });

        const byUser = new Map<string, Set<string>>();
        for (const e of entries || []) {
          if (!byUser.has(e.user_id)) byUser.set(e.user_id, new Set());
          byUser.get(e.user_id)!.add(e.logged_at);
        }

        const milestones = [7, 14, 30, 60, 100];
        const todayDate = new Date();
        for (const [userId, days] of byUser) {
          // Compute current streak (consecutive days ending today)
          if (!days.has(today)) continue; // only celebrate on the milestone day itself
          let streak = 0;
          for (let i = 0; i < 110; i++) {
            const d = new Date(todayDate);
            d.setUTCDate(todayDate.getUTCDate() - i);
            const key = d.toISOString().split("T")[0];
            if (days.has(key)) streak++; else break;
          }
          if (!milestones.includes(streak)) continue;
          try {
            const sent = await notifyUser(
              userId,
              `🏆 ${streak} dias seguidos!`,
              `Você completou ${streak} dias de diário. Continue assim — a consistência é a chave da recuperação.`,
              "/dashboard",
              "care_plan",
            );
            if (sent) results.streak_milestones++;
          } catch (e) { results.errors.push(`streak ${userId}: ${e}`); }
        }
      }
    } catch (e) { results.errors.push(`streak_block: ${e}`); }

    // 11. SUBSCRIPTION EXPIRING — warn the subscriber 3 days before access ends
    try {
      const in3 = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const nowIso = new Date().toISOString();
      const { data: expiring } = await supabase
        .from("professionals")
        .select("user_id, pro_access_expires_at")
        .not("pro_access_expires_at", "is", null)
        .gte("pro_access_expires_at", nowIso)
        .lte("pro_access_expires_at", in3);
      for (const p of expiring || []) {
        try {
          const sent = await notifyUser(
            p.user_id,
            "⏳ Seu plano está para vencer",
            "Renove para manter o acesso PRO sem interrupção.",
            "/dashboard",
            "billing",
          );
          if (sent) results.subscription_expiring++;
        } catch (e) { results.errors.push(`expiring ${p.user_id}: ${e}`); }
      }
    } catch (e) { results.errors.push(`expiring_block: ${e}`); }


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
