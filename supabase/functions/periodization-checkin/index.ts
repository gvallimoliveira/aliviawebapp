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

// Data do dia no fuso do Brasil: depois das 21h (UTC-3) a data UTC já é o dia seguinte
// e o check-in caía na data errada.
const todayISO = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
/** Janela retroativa do sRPE do paciente: hoje e os 7 dias anteriores (horário de Brasília). */
const SRPE_BACKFILL_DAYS = 7;
const isoMinusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
};


// Leitura de print de monitor cardíaco: usada pelo link do paciente e pelo profissional no prontuário.
async function readCardioPrint(body: any): Promise<Response> {
  // Print de monitor cardíaco, relógio, esteira, app de treino ou oxímetro.
  // A IA só lê; o usuário revisa antes de salvar.
  const img = typeof body.image_base64 === "string" ? body.image_base64 : "";
  const mime = typeof body.mime_type === "string" && /^image\/(png|jpe?g|webp)$/.test(body.mime_type) ? body.mime_type : "image/png";
  if (!img) return json({ error: "empty_input" }, 400);
  if (img.length > 7_000_000) return json({ error: "image_too_large" }, 400);
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return json({ error: "ai_not_configured" }, 500);
  const num = { type: ["number", "null"] };
  const schema = {
    type: "object", additionalProperties: false,
    required: ["duration_min", "distance_km", "avg_hr", "max_hr", "hr_1min_after", "avg_power_w", "spo2", "suggested_rpe", "zone_minutes", "summary"],
    properties: { duration_min: num, distance_km: num, avg_hr: num, max_hr: num, hr_1min_after: num, avg_power_w: num, spo2: num, suggested_rpe: num, zone_minutes: { type: ["array", "null"], items: { type: "number" } }, summary: { type: "string" } },
  };
  const instructions = "Você lê prints de monitor cardíaco, relógio, esteira, bicicleta, app de treino ou oxímetro. Extraia apenas o que estiver visível: duração total em minutos, distância em km, FC média e máxima (bpm), FC 1 minuto após o fim do esforço / recuperação (bpm, só se aparecer como valor absoluto), potência média em watts (bicicleta/ergômetro), SpO2 (%) e minutos em cada zona de FC Z1..Z5 (array de 5 números, ou null se não houver zonas visíveis; se o print mostrar mm:ss, converta para minutos decimais, ex.: 12:30 → 12.5). Sugira PSE 0-10 só se houver base (zonas, FC relativa ou esforço informado), senão null. summary: uma frase curta em português sem citar marcas. Nunca invente valores.";
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra", instructions,
      input: [{ role: "user", content: [{ type: "input_text", text: "Leia os dados do treino." }, { type: "input_image", image_url: `data:${mime};base64,${img}` }] }],
      reasoning: { effort: "low" }, store: false, stream: false,
      text: { format: { type: "json_schema", name: "cardio", strict: true, schema } },
    }),
  });
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    console.error("parse_cardio_print ai", resp.status, t.slice(0, 400));
    return json({ error: resp.status === 402 ? "ai_credits" : resp.status === 429 ? "ai_rate_limited" : "ai_failed" }, resp.status === 402 || resp.status === 429 ? resp.status : 502);
  }
  const data = await resp.json();
  let out = typeof data.output_text === "string" ? data.output_text : "";
  if (!out) for (const o of data.output || []) for (const c of o.content || []) if (typeof c.text === "string") out += c.text;
  let r: any;
  try { r = JSON.parse(out); } catch { return json({ error: "ai_unreadable" }, 502); }
  const rng = (v: unknown, lo: number, hi: number) => (typeof v === "number" && v >= lo && v <= hi ? Math.round(v * 10) / 10 : null);
  return json({ reading: {
    duration_min: rng(r.duration_min, 1, 600), distance_km: rng(r.distance_km, 0.1, 400),
    avg_hr: rng(r.avg_hr, 40, 240), max_hr: rng(r.max_hr, 40, 240),
    hr_1min_after: rng(r.hr_1min_after, 30, 240), avg_power_w: rng(r.avg_power_w, 1, 2500), spo2: rng(r.spo2, 70, 100),
    suggested_rpe: rng(r.suggested_rpe, 0, 10),
    zone_minutes: Array.isArray(r.zone_minutes) && r.zone_minutes.length === 5 ? r.zone_minutes.map((m: unknown) => rng(m, 0, 600) ?? 0) : null, summary: String(r.summary || "").slice(0, 200),
  } });
    }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, token } = body ?? {};

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Ação autenticada: o paciente logado recebe (ou cria) o próprio link de
    // check-in, localizado pelo e-mail da conta. Assim a página pessoal dele
    // mostra o mesmo conteúdo do link público, sem precisar do token na URL.
    if (action === "my_link") {
      const authHeader = req.headers.get("Authorization") ?? "";
      const jwt = authHeader.replace(/^Bearer\s+/i, "");
      if (!jwt) return json({ error: "unauthorized" }, 401);
      const { data: userData, error: userErr } = await supabase.auth.getUser(jwt);
      const email = userData?.user?.email?.toLowerCase().trim();
      if (userErr || !email) return json({ error: "unauthorized" }, 401);

      const { data: patientRow } = await supabase
        .from("patients")
        .select("id")
        .ilike("email", email)
        .limit(1)
        .maybeSingle();
      if (!patientRow) return json({ error: "no_patient" }, 404);

      const { data: existing } = await supabase
        .from("periodization_links")
        .select("token")
        .eq("patient_id", patientRow.id)
        .eq("audience", "patient")
        .eq("active", true)
        .limit(1)
        .maybeSingle();
      if (existing?.token) return json({ token: existing.token });

      const newToken = crypto.randomUUID();
      const { error: insertErr } = await supabase
        .from("periodization_links")
        .insert({ patient_id: patientRow.id, plan_id: null, audience: "patient", token: newToken, active: true });
      if (insertErr) return json({ error: "link_create_failed" }, 500);
      return json({ token: newToken });
    }

    // Profissional lança sessão medida com monitor cardíaco pelo prontuário.
    // Valida login e acesso ao paciente antes de gastar crédito de IA.
    if (action === "pro_parse_cardio_print") {
      const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
      if (!jwt) return json({ error: "unauthorized" }, 401);
      const { data: u } = await supabase.auth.getUser(jwt);
      const pid = typeof body.patient_id === "string" ? body.patient_id : "";
      if (!u?.user || !pid) return json({ error: "unauthorized" }, 401);
      const { data: ok } = await supabase.rpc("can_access_patient", { _patient_id: pid, _user_id: u.user.id });
      if (!ok) return json({ error: "forbidden" }, 403);
      return await readCardioPrint(body);
    }

    if (!token || typeof token !== "string" || token.length < 8) {
      return json({ error: "invalid_token" }, 400);
    }

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
    // Pacientes da clínica: a clínica ganha destaque próprio (nome + logo),
    // com o fisioterapeuta responsável como identificação secundária.
    let clinicName: string | null = null;
    let clinicLogo: string | null = null;
    let clinicColor: string | null = null;
    if (patient.clinic_id) {
      const { data: clinic } = await supabase.from("clinics").select("name, logo_url, brand_color").eq("id", patient.clinic_id).maybeSingle();
      clinicName = clinic?.name ?? null;
      clinicLogo = clinic?.logo_url ?? null;
      clinicColor = clinic?.brand_color ?? null;
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
        .select("soreness, sleep, stress, fatigue, readiness, pain, resting_hr, peak_hr, spo2, note")
        .eq("patient_id", patient.id)
        .eq("checkin_date", todayISO())
        .maybeSingle();

      // Sessões já relatadas hoje: evita o paciente registrar a mesma sessão duas vezes.
      const { data: reported } = await supabase
        .from("srpe_entries")
        .select("session_id, track, source, duration_min, rpe, patient_rpe, notes")
        .eq("patient_id", patient.id)
        .eq("session_date", todayISO());
      // Resposta do próprio paciente hoje, por sessão: permite editar no mesmo dia.
      const reportedBySession = new Map<string, Record<string, unknown>>();
      (reported || []).forEach((r: Record<string, unknown>) => {
        if (typeof r.session_id === "string") reportedBySession.set(r.session_id, r);
      });
      const reportedIds = new Set((reported || []).map((r: { session_id: string | null }) => r.session_id).filter(Boolean));

      // Visão do microciclo para o preparador: toda a semana (seg→dom), todas as
      // frentes, somente leitura. O paciente NÃO recebe isso — ver a semana
      // inteira poderia enviesar o sRPE que ele vai relatar.
      // Sessões dos últimos 7 dias ainda sem sRPE (só para o paciente).
      let pendingSessions: Array<Record<string, unknown>> = [];
      if (link.audience !== "coach") {
        const from = isoMinusDays(todayISO(), SRPE_BACKFILL_DAYS);
        const yesterday = isoMinusDays(todayISO(), 1);
        const [{ data: past }, { data: pastEntries }] = await Promise.all([
          supabase.from("periodization_sessions")
            .select("id, session_date, track, planned_duration_min, planned_rpe, title")
            .eq("patient_id", patient.id).gte("session_date", from).lte("session_date", yesterday)
            .order("session_date", { ascending: false }),
          supabase.from("srpe_entries")
            .select("session_id, session_date, track, source, patient_rpe")
            .eq("patient_id", patient.id).gte("session_date", from).lte("session_date", yesterday),
        ]);
        const answered = (s: Record<string, unknown>) => (pastEntries || []).some((e: Record<string, unknown>) =>
          (e.session_id && e.session_id === s.id) ||
          (e.session_date === s.session_date && e.track === s.track &&
            (e.source !== "professional" || e.patient_rpe !== null)));
        pendingSessions = (past || [])
          .filter((s: Record<string, unknown>) => Number(s.planned_duration_min || 0) * Number(s.planned_rpe || 0) > 0)
          .filter((s: Record<string, unknown>) => !answered(s))
          .map((s: Record<string, unknown>) => ({
            id: s.id, session_date: s.session_date, track: s.track,
            planned_duration_min: s.planned_duration_min, title: s.title,
          }));
      }

      let weekSessions: Array<Record<string, unknown>> | undefined;
      if (link.audience === "coach") {
        const now = new Date(`${todayISO()}T12:00:00Z`);
        const dow = (now.getUTCDay() + 6) % 7; // segunda = 0
        const monday = new Date(now.getTime());
        monday.setUTCDate(monday.getUTCDate() - dow);
        const sunday = new Date(monday.getTime());
        sunday.setUTCDate(sunday.getUTCDate() + 6);
        const { data: week } = await supabase
          .from("periodization_sessions")
          .select("session_date, track, planned_duration_min, planned_rpe, title")
          .eq("patient_id", patient.id)
          .gte("session_date", monday.toISOString().slice(0, 10))
          .lte("session_date", sunday.toISOString().slice(0, 10))
          .order("session_date", { ascending: true });
        weekSessions = (week || []) as Array<Record<string, unknown>>;
      }

      // Teto de FC (Fase 2D): perfil definido pelo fisio no plano mais recente.
      const PCT: Record<string, number> = { athletic: 0.9, healthy: 0.85, sedentary: 0.75, hypertensive: 0.7, cardiac: 0.65, pulmonary: 0.7 };
      const { data: cp } = await supabase.from("periodization_plans")
        .select("cardio_profile, hr_ceiling_override").eq("patient_id", patient.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const { data: pb } = await supabase.from("patients").select("birth_date, email").eq("id", patient.id).maybeSingle();
      // Sem perfil salvo: precaução pela saúde mais recente (cardiopatia 65% > hipertensão 70%).
      let profileKey: string = cp?.cardio_profile ?? "healthy";
      if (!cp?.cardio_profile) {
        const conds = new Set<string>();
        const { data: hr } = await supabase.from("patient_health_records").select("health_conditions, recorded_at")
          .eq("patient_id", patient.id).order("recorded_at", { ascending: false }).limit(1).maybeSingle();
        let latest: { at: string; list: unknown } | null = hr ? { at: `${hr.recorded_at}T12:00:00`, list: hr.health_conditions } : null;
        if (pb?.email) {
          const { data: as } = await supabase.from("assessments").select("anamnesis_data, created_at")
            .eq("patient_email", pb.email).order("created_at", { ascending: false }).limit(1).maybeSingle();
          const list = (as?.anamnesis_data as any)?.healthConditions;
          if (as && Array.isArray(list) && (!latest || as.created_at.slice(0, 10) > latest.at.slice(0, 10))) latest = { at: as.created_at, list };
        }
        if (Array.isArray(latest?.list)) (latest!.list as unknown[]).forEach((c) => conds.add(String(c)));
        if (conds.has("heart_disease")) profileKey = "cardiac";
        else if (conds.has("hypertension")) profileKey = "hypertensive";
      }
      let hrCeiling: number | null = cp?.hr_ceiling_override ?? null;
      if (!hrCeiling && pb?.birth_date) {
        const b = new Date(pb.birth_date + "T00:00:00Z"); const n = new Date();
        let age = n.getUTCFullYear() - b.getUTCFullYear();
        if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) age--;
        if (age >= 5 && age <= 110) hrCeiling = Math.round((207 - 0.7 * age) * (PCT[profileKey] ?? 0.85));
      }

      return json({
        info: {
          hr_ceiling: hrCeiling,
          patient_name: patient.full_name ?? null,
          professional_name: professionalName,
          clinic_name: clinicName,
          clinic_logo_url: clinicLogo,
        clinic_brand_color: clinicColor,
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
            reported: (() => {
              const r = reportedBySession.get(s.id as string);
              if (!r) return null;
              const own = r.source !== "professional";
              const rpe = own ? r.rpe : r.patient_rpe;
              if (typeof rpe !== "number") return null;
              return {
                rpe,
                duration_min: own ? r.duration_min : null,
                notes: own && typeof r.notes === "string" ? r.notes : "",
              };
            })(),
          })),
          week_sessions: weekSessions,
          pending_sessions: pendingSessions,
          backfill_from: isoMinusDays(todayISO(), SRPE_BACKFILL_DAYS),
        },
      });
    }


    if (action === "submit_checkin") {
      const v = body.values ?? {};
      // Coração no treino agora é registrado junto da sessão; aqui preservamos
      // o que já existe do dia em vez de apagar com null.
      const { data: existingCheckin } = await supabase
        .from("readiness_checkins")
        .select("peak_hr, spo2")
        .eq("patient_id", patient.id)
        .eq("checkin_date", todayISO())
        .maybeSingle();
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
        resting_hr: (() => {
          const n = Math.round(Number(v.resting_hr));
          return Number.isFinite(n) && n >= 25 && n <= 140 ? n : null;
        })(),
        peak_hr: (() => {
          const n = Math.round(Number(v.peak_hr));
          if (v.peak_hr != null && Number.isFinite(n) && n >= 40 && n <= 240) return n;
          return existingCheckin?.peak_hr ?? null;
        })(),
        spo2: (() => {
          const n = Math.round(Number(v.spo2));
          if (v.spo2 != null && Number.isFinite(n) && n >= 70 && n <= 100) return n;
          return existingCheckin?.spo2 ?? null;
        })(),
        note: typeof v.note === "string" ? v.note.slice(0, 1000) : null,
        source: link.audience === "coach" ? "coach" : "patient",
      };
      const answered = [payload.soreness, payload.sleep, payload.stress, payload.fatigue, payload.readiness, payload.pain, payload.resting_hr, payload.peak_hr, payload.spo2]
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
      // Coração no treino: FC mais alta e SpO₂ medidos durante a sessão.
      const hrMax = (() => {
        if (e.hr_max == null) return null;
        const n = Math.round(Number(e.hr_max));
        return Number.isFinite(n) && n >= 40 && n <= 240 ? n : null;
      })();
      const spo2Min = (() => {
        if (e.spo2_min == null) return null;
        const n = Math.round(Number(e.spo2_min));
        return Number.isFinite(n) && n >= 70 && n <= 100 ? n : null;
      })();
      const monitorData = hrMax !== null || spo2Min !== null;
      let track = ["physio", "gym", "sport", "cardio"].includes(e.track) ? e.track : "physio";
      const sessionDate = typeof e.session_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.session_date)
        ? e.session_date
        : todayISO();
      // Paciente pode informar sessões de hoje e dos 7 dias anteriores; nunca futuro.
      if (sessionDate > todayISO()) return json({ error: "future_date" }, 400);
      if (sessionDate < isoMinusDays(todayISO(), SRPE_BACKFILL_DAYS)) return json({ error: "too_old" }, 400);

      // Vínculo explícito: o paciente confirmou uma sessão planejada do microciclo.
      let linkedId: string | null = null;
      if (typeof e.session_id === "string" && e.session_id.length > 10) {
        const { data: chosen } = await supabase
          .from("periodization_sessions")
          .select("id, track, session_date, patient_id")
          .eq("id", e.session_id)
          .maybeSingle();
        if (chosen && chosen.patient_id === patient.id && String(chosen.session_date).slice(0, 10) === sessionDate) {
          linkedId = chosen.id;
          track = chosen.track; // a frente vem do planejamento, não da escolha manual
        }
      }

      // Sem vínculo explícito, pareia pela sessão prescrita do mesmo dia e frente.
      if (!linkedId) {
        const { data: sameDay } = await supabase
          .from("periodization_sessions")
          .select("id, track")
          .eq("patient_id", patient.id)
          .eq("session_date", sessionDate);
        linkedId = (sameDay || []).find((s: { track: string }) => s.track === track)?.id ?? null;
      }

      // Sessão já lançada pelo profissional com monitor: junta a percepção do
      // paciente na mesma sessão, sem contar duas vezes na carga.
      const { data: proRow } = await supabase.from("srpe_entries")
        .select("id, notes, hr_max, spo2_min, monitor_source").eq("patient_id", patient.id).eq("session_date", sessionDate)
        .eq("track", track).eq("source", "professional").limit(1).maybeSingle();
      if (proRow) {
        const pn = typeof e.notes === "string" && e.notes.trim() ? `Paciente: ${e.notes.slice(0, 900)}` : null;
        await supabase.from("srpe_entries").update({
          patient_rpe: rpe,
          notes: pn ? [proRow.notes, pn].filter(Boolean).join("\n") : proRow.notes,
          hr_max: proRow.hr_max ?? hrMax,
          spo2_min: proRow.spo2_min ?? spo2Min,
          monitor_source: proRow.monitor_source || (monitorData ? "manual" : null),
        }).eq("id", proRow.id);
        await supabase.from("periodization_links").update({ last_used_at: new Date().toISOString() }).eq("id", link.id);
        return json({ ok: true, merged: true });
      }

      // Uma sessão por data e frente: reenvio do paciente atualiza o registro.
      const { data: ownRow } = await supabase.from("srpe_entries")
        .select("id, hr_max, spo2_min, monitor_source").eq("patient_id", patient.id).eq("session_date", sessionDate)
        .eq("track", track).eq("source", "patient").limit(1).maybeSingle();
      if (ownRow) {
        await supabase.from("srpe_entries").update({
          duration_min: Math.round(duration), rpe, session_id: linkedId,
          notes: typeof e.notes === "string" ? e.notes.slice(0, 1000) : null,
          hr_max: hrMax ?? ownRow.hr_max,
          spo2_min: spo2Min ?? ownRow.spo2_min,
          monitor_source: ownRow.monitor_source || (monitorData ? "manual" : null),
        }).eq("id", ownRow.id);
        await supabase.from("periodization_links").update({ last_used_at: new Date().toISOString() }).eq("id", link.id);
        return json({ ok: true, updated: true });
      }

      const { error } = await supabase.from("srpe_entries").insert({
        patient_id: patient.id,
        plan_id: link.plan_id,
        session_id: linkedId,

        session_date: sessionDate,
        track,
        duration_min: Math.round(duration),
        rpe,
        notes: typeof e.notes === "string" ? e.notes.slice(0, 1000) : null,
        hr_max: hrMax,
        spo2_min: spo2Min,
        monitor_source: monitorData ? "manual" : null,
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
      const track = ["physio", "gym", "sport", "cardio"].includes(p.track) ? p.track : "gym";
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

    if (action === "parse_cardio_print") return await readCardioPrint(body);

    if (action === "parse_external_workout") {
      // Treinador traz treino externo (texto e/ou print); IA só extrai a lista.
      // A dose é calculada no cliente pela régua única do HEP (hepLoad.ts).
      if (link.audience !== "coach") return json({ error: "planning_is_coach_only" }, 403);
      const text = typeof body.text === "string" ? body.text.slice(0, 6000).trim() : "";
      const img = typeof body.image_base64 === "string" ? body.image_base64 : "";
      const mime = typeof body.mime_type === "string" && /^image\/(png|jpe?g|webp)$/.test(body.mime_type) ? body.mime_type : "image/png";
      if (!text && !img) return json({ error: "empty_input" }, 400);
      if (img.length > 7_000_000) return json({ error: "image_too_large" }, 400);
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) return json({ error: "ai_not_configured" }, 500);

      const REGIONS = ["hip", "knee", "shoulder", "spine", "core", "ankle", "cervical", "wrist", "elbow", "foot", "general"];
      const CATS = ["strengthening", "stabilization", "proprioception", "mobility", "stretching"];
      const schema = {
        type: "object", additionalProperties: false, required: ["items"],
        properties: {
          items: {
            type: "array",
            items: {
              type: "object", additionalProperties: false,
              required: ["name", "sets", "reps", "region", "category", "load_kg"],
              properties: {
                name: { type: "string" },
                sets: { type: "string" },
                reps: { type: "string", description: "Repetições (ex.: '10' ou '8-12') ou isometria com unidade (ex.: '30s')" },
                region: { type: "string", enum: REGIONS },
                category: { type: "string", enum: CATS },
                load_kg: { type: ["number", "null"] },
              },
            },
          },
        },
      };
      const instructions = `Você extrai exercícios de um treino de academia/campo/fisioterapia. Para cada exercício devolva nome em português, séries, repetições (ou segundos de isometria com 's'), região predominante (core = tronco: pranchas, bird dog, dead bug, abdominais, carregamentos; spine = coluna/costas como remadas e puxadas), categoria (força = strengthening; estabilização; propriocepção; mobilidade; alongamento) e carga em kg se informada. Ignore aquecimento cardiovascular sem séries. Não invente exercícios.`;
      const content: any[] = [];
      if (text) content.push({ type: "input_text", text });
      else content.push({ type: "input_text", text: "Extraia os exercícios da imagem." });
      if (img) content.push({ type: "input_image", image_url: `data:${mime};base64,${img}` });

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          instructions,
          input: [{ role: "user", content }],
          reasoning: { effort: "low" },
          store: false,
          stream: true,
          text: { format: { type: "json_schema", name: "workout", strict: true, schema } },
        }),
      });
      if (!resp.ok || !resp.body) {
        const t = await resp.text().catch(() => "");
        console.error("parse_external_workout ai", resp.status, t.slice(0, 400));
        return json({ error: resp.status === 402 ? "ai_credits" : resp.status === 429 ? "ai_rate_limited" : "ai_failed" }, resp.status === 402 || resp.status === 429 ? resp.status : 502);
      }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      let buf = "", out = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const ln of lines) {
          if (!ln.startsWith("data:")) continue;
          const d = ln.slice(5).trim();
          if (!d || d === "[DONE]") continue;
          try {
            const ev = JSON.parse(d);
            if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") out += ev.delta;
          } catch { /* ignore */ }
        }
      }
      let items: any[] = [];
      try { items = JSON.parse(out).items || []; } catch { return json({ error: "ai_unreadable" }, 502); }

      // Biblioteca tem prioridade na região/objetivo quando o nome bate.
      const { data: lib } = await supabase.from("exercise_library").select("name_pt, body_region, category");
      const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
      const libMap = new Map((lib || []).map((e: any) => [norm(e.name_pt), e]));
      const clean = items.slice(0, 40).map((it: any) => {
        const hit: any = libMap.get(norm(String(it.name || "")));
        return {
          name: String(it.name || "").slice(0, 120),
          sets: String(it.sets || "").slice(0, 20),
          reps: String(it.reps || "").slice(0, 20),
          region: hit?.body_region || (REGIONS.includes(it.region) ? it.region : "general"),
          category: hit?.category || (CATS.includes(it.category) ? it.category : "strengthening"),
          load_kg: typeof it.load_kg === "number" && it.load_kg > 0 && it.load_kg < 1000 ? it.load_kg : null,
        };
      }).filter((it) => it.name);
      return json({ items: clean });
    }

    if (action === "submit_planned_batch") {
      if (link.audience !== "coach") return json({ error: "planning_is_coach_only" }, 403);
      const list = Array.isArray(body.sessions) ? body.sessions.slice(0, 14) : [];
      const rows = [];
      for (const p of list) {
        const duration = Number(p.planned_duration_min);
        const rpe = Number(p.planned_rpe);
        if (!Number.isFinite(duration) || duration <= 0 || duration > 600) return json({ error: "invalid_duration" }, 400);
        if (!Number.isFinite(rpe) || rpe < 0 || rpe > 10) return json({ error: "invalid_rpe" }, 400);
        if (typeof p.session_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(p.session_date)) return json({ error: "invalid_date" }, 400);
        rows.push({
          patient_id: patient.id,
          plan_id: link.plan_id,
          session_date: p.session_date,
          track: ["physio", "gym", "sport", "cardio"].includes(p.track) ? p.track : "gym",
          planned_load: ["low", "moderate", "high"].includes(p.planned_load) ? p.planned_load : "moderate",
          planned_duration_min: Math.round(duration),
          planned_rpe: rpe,
          title: typeof p.title === "string" ? p.title.slice(0, 200) : null,
          notes: typeof p.notes === "string" ? p.notes.slice(0, 2000) : null,
          created_source: "coach",
        });
      }
      if (!rows.length) return json({ error: "empty" }, 400);
      const { error } = await supabase.from("periodization_sessions").insert(rows);
      if (error) { console.error("batch insert failed", error); return json({ error: "save_failed" }, 500); }
      await supabase.from("periodization_links").update({ last_used_at: new Date().toISOString() }).eq("id", link.id);
      return json({ ok: true, count: rows.length });
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

    // Dose planejada x percebida NÃO gera notificação (decisão do usuário):
    // fica só no prontuário, onde sessões sem resposta e futuras ficam à parte.

    // Alertas cardiovasculares NÃO vão para o celular (decisão do usuário): só leitura no prontuário.
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
