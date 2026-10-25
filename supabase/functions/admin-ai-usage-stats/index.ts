// Admin-only aggregated AI credit usage stats.
// Gated by vip_users membership. Returns last-30-day rollups across all users.
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ANON_SENTINEL = "00000000-0000-0000-0000-000000000000";

const isAnonymousUsageId = (uid: string) => uid === "anonymous" || uid === ANON_SENTINEL;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Auth + VIP gate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !user?.email) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: vip } = await admin
      .from("vip_users")
      .select("id")
      .eq("email", user.email)
      .maybeSingle();
    if (!vip) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Accept `days` from JSON body (POST via supabase.functions.invoke) or querystring.
    let bodyDays: number | undefined;
    if (req.method !== "GET") {
      try {
        const body = await req.json();
        if (body && typeof body.days !== "undefined") bodyDays = Number(body.days);
      } catch {
        // ignore — empty/invalid body is fine
      }
    }
    const url = new URL(req.url);
    const rawDays = bodyDays ?? Number(url.searchParams.get("days") || "30");
    const days = Math.max(1, Math.min(90, Number.isFinite(rawDays) ? rawDays : 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Pull all usage rows in window. With shadow-tracking-only usage this is
    // small; paginate defensively.
    const rows: any[] = [];
    const PAGE = 1000;
    for (let from = 0; from < 50_000; from += PAGE) {
      const { data, error } = await admin
        .from("ai_credit_usage")
        .select("user_id, function_name, credits_used, transcriptions_used, metadata, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      rows.push(...data);
      if (data.length < PAGE) break;
    }

    // Aggregates
    const byFunction: Record<string, { credits: number; calls: number }> = {};
    const byDay: Record<string, number> = {};
    const byUser: Record<string, { credits: number; calls: number }> = {};
    let totalCredits = 0;
    let totalTokensIn = 0;
    let totalTokensOut = 0;
    let totalTranscriptions = 0;

    for (const r of rows) {
      const credits = Number(r.credits_used || 0);
      totalCredits += credits;
      const meta = (r.metadata || {}) as Record<string, any>;
      totalTokensIn += Number(meta.tokens_in || meta.input_tokens || 0);
      totalTokensOut += Number(meta.tokens_out || meta.output_tokens || 0);
      totalTranscriptions += Number(r.transcriptions_used || 0);

      const fn = r.function_name || "unknown";
      byFunction[fn] = byFunction[fn] || { credits: 0, calls: 0 };
      byFunction[fn].credits += credits;
      byFunction[fn].calls += 1;

      const day = (r.created_at as string).slice(0, 10);
      byDay[day] = (byDay[day] || 0) + credits;

      const uid = r.user_id || "anonymous";
      byUser[uid] = byUser[uid] || { credits: 0, calls: 0 };
      byUser[uid].credits += credits;
      byUser[uid].calls += 1;
    }

    // Resolve emails for top users
    const topUserIds = Object.entries(byUser)
      .sort((a, b) => b[1].credits - a[1].credits)
      .slice(0, 20)
      .map(([uid]) => uid)
      .filter((u) => !isAnonymousUsageId(u));

    const userMap: Record<string, string> = {};
    if (topUserIds.length > 0) {
      const { data: profs } = await admin
        .from("professionals")
        .select("user_id, email, full_name")
        .in("user_id", topUserIds);
      for (const p of profs || []) {
        userMap[p.user_id] = p.email || p.full_name || p.user_id;
      }
      // Fallback 1: profiles table (uses user_id, not id)
      let missing = topUserIds.filter((u) => !userMap[u]);
      if (missing.length > 0) {
        const { data: profiles } = await admin
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", missing);
        for (const p of profiles || []) {
          if (p.full_name) userMap[p.user_id] = p.full_name;
        }
      }
      // Fallback 2: auth.users via admin API — guarantees email for every uid
      missing = topUserIds.filter((u) => !userMap[u]);
      for (const uid of missing) {
        try {
          const { data } = await admin.auth.admin.getUserById(uid);
          const email = data?.user?.email;
          const name = (data?.user?.user_metadata as Record<string, unknown> | undefined)?.full_name as string | undefined;
          if (email) userMap[uid] = name ? `${name} <${email}>` : email;
          else if (name) userMap[uid] = name;
        } catch {
          // ignore — will fall back to uid slice below
        }
      }
    }

    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1].credits - a[1].credits)
      .slice(0, 20)
      .map(([uid, v]) => ({
        user_id: uid,
        label: userMap[uid]
          || (isAnonymousUsageId(uid) ? "Sem conta — fluxo gratuito anônimo" : `UID não resolvido: ${uid}`),
        attribution: isAnonymousUsageId(uid) ? "anonymous" : (userMap[uid] ? "account" : "unresolved"),
        credits: Number(v.credits.toFixed(3)),
        calls: v.calls,
      }));

    const functionsRanked = Object.entries(byFunction)
      .map(([name, v]) => ({
        name,
        credits: Number(v.credits.toFixed(3)),
        calls: v.calls,
        avg: v.calls > 0 ? Number((v.credits / v.calls).toFixed(4)) : 0,
      }))
      .sort((a, b) => b.credits - a.credits);

    const daily = Object.entries(byDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, credits]) => ({ day, credits: Number(credits.toFixed(3)) }));

    const uniqueUsers = Object.keys(byUser).filter((u) => !isAnonymousUsageId(u)).length;

    // Estimated USD: assume 1 credit ≈ $0.0008 (Lovable workspace pricing benchmark)
    const estUsd = Number((totalCredits * 0.0008).toFixed(2));

    // Decision support: current-period quota status per active account (read-only simulation).
    const bands = { under50: 0, b50_80: 0, b80_100: 0, grace: 0, over: 0, unlimited: 0 };
    const tierMap: Record<string, { users: number; credits: number; at_risk: number; over: number }> = {};
    const atRisk: { label: string; tier: string; pct: number; used: number; included: number }[] = [];
    const accountIds = Object.keys(byUser).filter((u) => !isAnonymousUsageId(u)).slice(0, 300);
    await Promise.all(accountIds.map(async (uid) => {
      const { data: s } = await admin.rpc("get_user_credit_status", { _user_id: uid });
      if (!s) return;
      const st = s as Record<string, any>;
      const tier = String(st.tier || "unknown");
      const isClinic = tier.startsWith("clinic_");
      const grace = isClinic ? 0.2 : tier.startsWith("pro_") || tier.startsWith("academic_") ? 0.1 : 0;
      const included = Number(st.included || 0);
      const used = Number(st.used || 0);
      const purchased = Number(st.purchased || 0);
      const pct = included > 0 ? (used / included) * 100 : 0;
      tierMap[tier] = tierMap[tier] || { users: 0, credits: 0, at_risk: 0, over: 0 };
      tierMap[tier].users += 1;
      tierMap[tier].credits += byUser[uid].credits;
      if (st.unlimited) { bands.unlimited++; return; }
      const wouldBlock = used >= included * (1 + grace) + purchased;
      if (wouldBlock) { bands.over++; tierMap[tier].over++; }
      else if (pct >= 100) bands.grace++;
      else if (pct >= 80) bands.b80_100++;
      else if (pct >= 50) bands.b50_80++;
      else bands.under50++;
      if (pct >= 80) {
        tierMap[tier].at_risk++;
        atRisk.push({ label: userMap[uid] || uid.slice(0, 8), tier, pct: Number(pct.toFixed(1)), used: Number(used.toFixed(2)), included });
      }
    }));
    const byTier = Object.entries(tierMap)
      .map(([tier, v]) => ({ tier, ...v, credits: Number(v.credits.toFixed(3)), avg: v.users ? Number((v.credits / v.users).toFixed(3)) : 0 }))
      .sort((a, b) => b.credits - a.credits);
    atRisk.sort((a, b) => b.pct - a.pct);


    return new Response(
      JSON.stringify({
        window_days: days,
        total_rows: rows.length,
        total_credits: Number(totalCredits.toFixed(3)),
        total_tokens_in: totalTokensIn,
        total_tokens_out: totalTokensOut,
        total_transcriptions: totalTranscriptions,
        unique_users: uniqueUsers,
        estimated_usd: estUsd,
        functions: functionsRanked,
        daily,
        top_users: topUsers,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("[admin-ai-usage-stats]", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
