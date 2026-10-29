import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { isInternalCall } from "../_shared/caller-auth.ts";
import { trialRetentionStage, trialPurgeDate } from "../_shared/clinicTrialRetention.ts";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { "Content-Type": "application/json" } });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });
  if (!isInternalCall(req)) return json({ error: "Forbidden" }, 403);

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const db = createClient(url, key, { auth: { persistSession: false } });

  const push = (userId: string, title: string, body: string) =>
    fetch(`${url}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ user_id: userId, title, body, url: "/dashboard?tab=clinic" }),
    }).catch((e) => console.error("[trial-retention] push failed", e));

  try {
    const { data: clinics, error } = await db.from("clinics")
      .select("id, owner_user_id, trial_started_at, created_at")
      .eq("subscription_status", "trialing").is("subscription_stripe_id", null);
    if (error) throw error;

    const now = Date.now();
    const result = { reminded: 0, ended: 0, purged: 0 };
    for (const c of clinics ?? []) {
      const start = new Date(c.trial_started_at ?? c.created_at).getTime();
      const stage = trialRetentionStage(start, now);
      if (!stage) continue;
      const { data: isAdmin } = await db.rpc("is_admin", { _user_id: c.owner_user_id });
      if (isAdmin) continue;
      const purgeOn = trialPurgeDate(start).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      if (stage === "reminder_day14") {
        await push(c.owner_user_id, "⏳ Último dia do teste amanhã", `Sem assinatura, os dados da clínica serão excluídos em ${purgeOn}.`);
        result.reminded++;
      } else if (stage === "ended") {
        await push(c.owner_user_id, "Teste da clínica encerrado", `Assine até ${purgeOn} para manter os dados; depois disso eles serão excluídos.`);
        result.ended++;
      } else {
        // Remove stored files first, then the database purge re-validates every condition.
        for (const [table, bucket] of [["patient_files", "patient-files"], ["patient_photos", "patient-photos"]] as const) {
          const { data: files } = await db.from(table).select("file_path").eq("clinic_id", c.id);
          const paths = (files ?? []).map((f: any) => f.file_path).filter(Boolean);
          for (let i = 0; i < paths.length; i += 100) await db.storage.from(bucket).remove(paths.slice(i, i + 100));
        }
        const { data: ok, error: pErr } = await db.rpc("purge_expired_clinic_trial", { _clinic_id: c.id });
        if (pErr) { console.error("[trial-retention] purge failed", c.id, pErr.message); continue; }
        if (ok) result.purged++;
      }
    }
    console.log("[trial-retention]", result);
    return json(result);
  } catch (e) {
    console.error("[trial-retention] error", e);
    return json({ error: String(e) }, 500);
  }
});
