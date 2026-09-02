// Endpoint público do módulo de Periodização e Carga.
// Paciente ou treinador acessam por token, sem login (mesmo padrão do adendo).
//
// POST { action: "load", token }
//   -> { info: { patient_name, professional_name, audience, today, today_checkin, plan_title, restrictions } }
// POST { action: "submit_checkin", token, values: { soreness, sleep, stress, fatigue, readiness, pain, note } }
// POST { action: "submit_srpe", token, entry: { session_date, track, duration_min, rpe, notes } }  (só paciente)
// POST { action: "submit_planned_session", token, session: { session_date, track, planned_duration_min, planned_rpe, title } }  (só treinador)

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const clampScale = (v: unknown): number | null => {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(10, Math.max(1, Math.round(n)));
};

const todayISO = () => new Date().toISOString().slice(0, 10);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, token } = body ?? {};
    if (!token || typeof token !== "string" || token.length < 8) {
      return json({ error: "invalid_token" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: link } = await supabase
      .from("periodization_links")
      .select("id, patient_id, plan_id, audience, label, active")
      .eq("token", token)
      .maybeSingle();

    if (!link || !link.active) return json({ error: "not_found" }, 404);

    const { data: patient } = await supabase
      .from("patients")
      .select("id, full_name, professional_id, clinic_id")
      .eq("id", link.patient_id)
      .maybeSingle();
    if (!patient) return json({ error: "not_found" }, 404);

    let professionalName: string | null = null;
    let proUserId: string | null = null;
    if (patient.professional_id) {
      const { data: pro } = await supabase
        .from("professionals")
        .select("user_id, full_name")
        .eq("id", patient.professional_id)
        .maybeSingle();
      professionalName = pro?.full_name ?? null;
      proUserId = pro?.user_id ?? null;
    }
    if (!professionalName && patient.clinic_id) {
      const { data: clinic } = await supabase.from("clinics").select("name").eq("id", patient.clinic_id).maybeSingle();
      professionalName = clinic?.name ?? null;
    }

    let planTitle: string | null = null;
    let restrictions: Array<{ kind: string; text: string }> = [];
    if (link.plan_id) {
      const { data: plan } = await supabase
        .from("periodization_plans")
        .select("title")
        .eq("id", link.plan_id)
        .maybeSingle();
      planTitle = plan?.title ?? null;
      const { data: rest } = await supabase
        .from("plan_restrictions")
        .select("kind, text")
        .eq("plan_id", link.plan_id);
      restrictions = (rest || []) as Array<{ kind: string; text: string }>;
    }

    // Dose planejada para hoje (e, para o treinador, o histórico recente da prescrição).
    const { data: todaySessions } = await supabase
      .from("periodization_sessions")
      .select("id, session_date, track, planned_duration_min, planned_rpe, title")
      .eq("patient_id", patient.id)
      .eq("session_date", todayISO());

    if (action === "load") {
      const { data: existing } = await supabase
        .from("readiness_checkins")
        .select("soreness, sleep, stress, fatigue, readiness, pain, note")
        .eq("patient_id", patient.id)
        .eq("checkin_date", todayISO())
        .maybeSingle();

      // Sessões já relatadas hoje: evita o paciente registrar a mesma sessão duas vezes.
      const { data: reported } = await supabase
        .from("srpe_entries")
        .select("session_id")
        .eq("patient_id", patient.id)
        .eq("session_date", todayISO());
      const reportedIds = new Set((reported || []).map((r: { session_id: string | null }) => r.session_id).filter(Boolean));

      return json({
        info: {
          patient_name: patient.full_name ?? null,
          professional_name: professionalName,
          audience: link.audience,
          label: link.label,
          plan_title: planTitle,
          today: todayISO(),
          today_checkin: existing ?? null,
          restrictions,
          // O paciente vê duração e esforço alvo, nunca o número de carga
          // (revelar a carga alvo enviesaria o sRPE que ele vai relatar).
          today_targets: (todaySessions || []).map((s: Record<string, unknown>) => ({
            id: s.id,
            track: s.track,
            planned_duration_min: s.planned_duration_min,
            planned_rpe: s.planned_rpe,
            title: s.title,
            already_reported: reportedIds.has(s.id as string),
          })),
        },
      });
    }


    if (action === "submit_checkin") {
      const v = body.values ?? {};
      const payload = {
        patient_id: patient.id,
        plan_id: link.plan_id,
        checkin_date: todayISO(),
        soreness: clampScale(v.soreness),
        sleep: clampScale(v.sleep),
        stress: clampScale(v.stress),
        fatigue: clampScale(v.fatigue),
        readiness: clampScale(v.readiness),
        pain: clampScale(v.pain),
        note: typeof v.note === "string" ? v.note.slice(0, 1000) : null,
        source: link.audience === "coach" ? "coach" : "patient",
      };
      const answered = [payload.soreness, payload.sleep, payload.stress, payload.fatigue, payload.readiness, payload.pain]
        .filter((x) => x !== null).length;
      if (answered === 0) return json({ error: "empty_checkin" }, 400);

      const { error } = await supabase
        .from("readiness_checkins")
        .upsert(payload, { onConflict: "patient_id,checkin_date" });
      if (error) {
        console.error("checkin upsert failed", error);
        return json({ error: "save_failed" }, 500);
      }

      await maybeAlert(supabase, {
        patientId: patient.id,
        patientName: patient.full_name ?? "Paciente",
        clinicId: patient.clinic_id,
        proUserId,
      });

      await supabase.from("periodization_links").update({ last_used_at: new Date().toISOString() }).eq("id", link.id);
      return json({ ok: true });
    }

    if (action === "submit_srpe") {
      // sRPE é dado subjetivo do paciente: o link do treinador não responde por ele.
      if (link.audience === "coach") return json({ error: "srpe_is_patient_only" }, 403);
      const e = body.entry ?? {};
      const duration = Number(e.duration_min);
      const rpe = Number(e.rpe);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 600) return json({ error: "invalid_duration" }, 400);
      if (!Number.isFinite(rpe) || rpe < 0 || rpe > 10) return json({ error: "invalid_rpe" }, 400);
      const track = ["physio", "gym", "sport"].includes(e.track) ? e.track : "physio";
      const sessionDate = typeof e.session_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.session_date)
        ? e.session_date
        : todayISO();

      // Pareia com a sessão prescrita do mesmo dia e frente, quando existir.
      const { data: sameDay } = await supabase
        .from("periodization_sessions")
        .select("id, track")
        .eq("patient_id", patient.id)
        .eq("session_date", sessionDate);
      const matched = (sameDay || []).find((s: { track: string }) => s.track === track);

      const { error } = await supabase.from("srpe_entries").insert({
        patient_id: patient.id,
        plan_id: link.plan_id,
        session_id: matched?.id ?? null,
        session_date: sessionDate,
        track,
        duration_min: Math.round(duration),
        rpe,
        notes: typeof e.notes === "string" ? e.notes.slice(0, 1000) : null,
        source: "patient",
      });
      if (error) {
        console.error("srpe insert failed", error);
        return json({ error: "save_failed" }, 500);
      }

      await maybeAlert(supabase, {
        patientId: patient.id,
        patientName: patient.full_name ?? "Paciente",
        clinicId: patient.clinic_id,
        proUserId,
      });

      await supabase.from("periodization_links").update({ last_used_at: new Date().toISOString() }).eq("id", link.id);
      return json({ ok: true });
    }

    if (action === "submit_planned_session") {
      // Papel do treinador/preparador: prescrever a dose esperada da sessão.
      if (link.audience !== "coach") return json({ error: "planning_is_coach_only" }, 403);
      const p = body.session ?? {};
      const duration = Number(p.planned_duration_min);
      const rpe = Number(p.planned_rpe);
      if (!Number.isFinite(duration) || duration <= 0 || duration > 600) return json({ error: "invalid_duration" }, 400);
      if (!Number.isFinite(rpe) || rpe < 0 || rpe > 10) return json({ error: "invalid_rpe" }, 400);
      const track = ["physio", "gym", "sport"].includes(p.track) ? p.track : "gym";
      const sessionDate = typeof p.session_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.session_date)
        ? p.session_date
        : todayISO();

      const { error } = await supabase.from("periodization_sessions").insert({
        patient_id: patient.id,
        plan_id: link.plan_id,
        session_date: sessionDate,
        track,
        planned_load: "moderate",
        planned_duration_min: Math.round(duration),
        planned_rpe: rpe,
        title: typeof p.title === "string" ? p.title.slice(0, 200) : null,
        created_source: "coach",
      });
      if (error) {
        console.error("planned session insert failed", error);
        return json({ error: "save_failed" }, 500);
      }

      await supabase.from("periodization_links").update({ last_used_at: new Date().toISOString() }).eq("id", link.id);
      return json({ ok: true });
    }

    return json({ error: "unknown_action" }, 400);
  } catch (err) {
    console.error("periodization-checkin error:", err);
    return json({ error: String(err) }, 500);
  }
});

/** Avisa o profissional quando a carga ou a prontidão saem da faixa segura. */
async function maybeAlert(
  supabase: ReturnType<typeof createClient>,
  ctx: { patientId: string; patientName: string; clinicId: string | null; proUserId: string | null },
) {
  try {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - 27);
    const sinceISO = since.toISOString().slice(0, 10);

    const { data: entries } = await supabase
      .from("srpe_entries")
      .select("session_date, training_load, track")
      .eq("patient_id", ctx.patientId)
      .gte("session_date", sinceISO);

    const now = Date.now();
    let acute = 0;
    let chronic = 0;
    let sessions = 0;
    let oldestDiff = 0;
    (entries || []).forEach((e: { session_date: string; training_load: number }) => {
      const diff = Math.round((now - new Date(`${e.session_date}T12:00:00Z`).getTime()) / 86400000);
      const load = Number(e.training_load) || 0;
      if (diff >= 0 && diff < 28) {
        chronic += load;
        if (load > 0) {
          sessions += 1;
          if (diff > oldestDiff) oldestDiff = diff;
        }
      }
      if (diff >= 0 && diff < 7) acute += load;
    });
    // Sem histórico mínimo (4 sessões / 14 dias) a média de 28 dias é artificial
    // e geraria alerta de risco falso já na primeira sessão registrada.
    const baselineReady = sessions >= 4 && oldestDiff >= 14;
    const chronicWeekly = chronic / 4;
    const ratio = baselineReady && chronicWeekly > 0 ? acute / chronicWeekly : null;


    const { data: checkins } = await supabase
      .from("readiness_checkins")
      .select("checkin_date, soreness, sleep, stress, fatigue, readiness, pain")
      .eq("patient_id", ctx.patientId)
      .gte("checkin_date", sinceISO)
      .order("checkin_date", { ascending: true });

    const score = (c: Record<string, number | null>): number | null => {
      const values: number[] = [];
      [c.readiness, c.sleep].forEach((v) => { if (typeof v === "number") values.push(v); });
      [c.soreness, c.stress, c.fatigue, c.pain].forEach((v) => { if (typeof v === "number") values.push(11 - v); });
      if (!values.length) return null;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      return Math.round(((avg - 1) / 9) * 100);
    };
    const scores = (checkins || []).map((c) => score(c as Record<string, number | null>)).filter((s): s is number => s !== null);
    const current = scores[scores.length - 1] ?? null;
    const prev = scores.slice(Math.max(0, scores.length - 8), scores.length - 1);
    const baseline = prev.length ? Math.round(prev.reduce((a, b) => a + b, 0) / prev.length) : null;

    const reasons: string[] = [];
    if (ratio !== null && ratio > 1.5) reasons.push(`ACWR ${ratio.toFixed(2)}`);
    else if (ratio !== null && ratio > 1.3) reasons.push(`ACWR em atenção (${ratio.toFixed(2)})`);
    if (current !== null && baseline !== null && baseline - current >= 20) {
      reasons.push(`queda de prontidão (${baseline} → ${current})`);
    }
    if (current !== null && current < 40) reasons.push(`prontidão baixa (${current}/100)`);

    // Dose planejada x percebida nos últimos 7 dias, por frente.
    const weekAgo = new Date();
    weekAgo.setUTCDate(weekAgo.getUTCDate() - 6);
    const weekISO = weekAgo.toISOString().slice(0, 10);
    const { data: planned } = await supabase
      .from("periodization_sessions")
      .select("session_date, track, planned_duration_min, planned_rpe")
      .eq("patient_id", ctx.patientId)
      .gte("session_date", weekISO);
    const TRACK_PT: Record<string, string> = { physio: "fisioterapia", gym: "academia", sport: "campo/esporte" };
    const plannedByTrack: Record<string, number> = {};
    (planned || []).forEach((s: { track: string; planned_duration_min: number | null; planned_rpe: number | null }) => {
      const load = Number(s.planned_duration_min || 0) * Number(s.planned_rpe || 0);
      if (load > 0) plannedByTrack[s.track] = (plannedByTrack[s.track] || 0) + load;
    });
    const realByTrack: Record<string, number> = {};
    (entries || []).forEach((e: { session_date: string; training_load: number; track?: string }) => {
      if (e.session_date < weekISO) return;
      const t = e.track || "physio";
      realByTrack[t] = (realByTrack[t] || 0) + (Number(e.training_load) || 0);
    });
    Object.entries(plannedByTrack).forEach(([t, target]) => {
      const ratio = (realByTrack[t] || 0) / target;
      if (ratio < 0.85) reasons.push(`${TRACK_PT[t] || t} subdosada (${ratio.toFixed(2)} do planejado)`);
      else if (ratio > 1.15) reasons.push(`${TRACK_PT[t] || t} superdosada (${ratio.toFixed(2)} do planejado)`);
    });

    if (!reasons.length) return;

    // Destinatários: profissional responsável + equipe ativa da clínica.
    const recipients = new Set<string>();
    if (ctx.proUserId) recipients.add(ctx.proUserId);
    if (ctx.clinicId) {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("user_id, status")
        .eq("clinic_id", ctx.clinicId)
        .eq("status", "active");
      (members || []).forEach((m: { user_id: string | null }) => {
        if (m.user_id) recipients.add(m.user_id);
      });
    }
    if (!recipients.size) return;

    // Um alerta por paciente por dia, por destinatário (evita spam de push).
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { data: alreadySent } = await supabase
      .from("push_delivery_log")
      .select("user_id")
      .eq("kind", "load_alert")
      .eq("ref", ctx.patientId)
      .gte("created_at", dayStart.toISOString());
    const sentToday = new Set((alreadySent || []).map((r: { user_id: string }) => r.user_id));

    const internalSecret = Deno.env.get("INTERNAL_ALERT_SECRET") || "";
    const title = "⚠️ Alerta de carga e prontidão";
    const bodyText = `${ctx.patientName}: ${reasons.join(" · ")}. Considere ajustar a carga.`;

    await Promise.all(
      Array.from(recipients)
        .filter((uid) => !sentToday.has(uid))
        .map((uid) =>
          fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-user`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-internal-secret": internalSecret,
              Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            },
            body: JSON.stringify({
              user_id: uid,
              title,
              body: bodyText,
              url: "/dashboard?tab=insights",
              tag: `load-alert-${ctx.patientId}`,
              kind: "load_alert",
              category: "load_alerts",
              ref: ctx.patientId,
            }),
          }).catch((e) => console.warn("notify-user failed", uid, String(e))),
        ),
    );
  } catch (e) {
    console.warn("maybeAlert failed", e);
  }
}
