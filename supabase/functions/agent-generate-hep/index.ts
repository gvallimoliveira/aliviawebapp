import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { callAiWithFallback } from "../_shared/ai-fallback.ts";
import { canaryCredits } from "../_shared/ai-credits.ts";
import { getCachedAiResponse, setCachedAiResponse, AI_CACHE_TTL_30D } from "../_shared/ai-cache.ts";
import { mechanismContextBlock, mechanismHepRules, resolveStoredMechanism } from "../_shared/pain-mechanism.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  try {
    // Fase 5.3 (canário): decisão de crédito em modo shadow — nunca bloqueia.
    const creditDecision = await canaryCredits(req, "agent-generate-hep");
    void creditDecision;
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { thread_id, patient_id, forceRefresh, challenge_level } = await req.json();
    if (!thread_id || !patient_id) {
      return new Response(JSON.stringify({ error: "missing_params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate thread ownership
    const { data: thread } = await adminClient
      .from("agent_threads").select("id, user_id, patient_id")
      .eq("id", thread_id).maybeSingle();
    if (!thread || thread.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "thread_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find professional record of the user (required for exercise_programs.professional_id)
    const { data: pro } = await adminClient
      .from("professionals").select("id, full_name").eq("user_id", user.id).maybeSingle();
    if (!pro) {
      return new Response(JSON.stringify({ error: "no_professional" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load patient + last assessment
    const { data: patient, error: patientErr } = await adminClient
      .from("patients").select("id, full_name, birth_date, email, professional_id, clinic_id")
      .eq("id", patient_id).maybeSingle();
    if (patientErr) console.error("[agent-hep] patient query", patientErr);
    if (!patient) {
      return new Response(JSON.stringify({ error: "patient_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Match assessments by email (preferred) or name, scoped to professional/clinic
    let assessmentQuery = adminClient
      .from("assessments")
      .select("id, anamnesis_data, diagnosis, final_hypothesis, pain_score, pain_regions, pain_mechanism, pain_extent")
      .order("created_at", { ascending: false })
      .limit(1);

    if (patient.email) {
      assessmentQuery = assessmentQuery.eq("patient_email", patient.email);
    } else {
      assessmentQuery = assessmentQuery.eq("patient_name", patient.full_name);
    }
    if (patient.clinic_id) {
      assessmentQuery = assessmentQuery.eq("clinic_id", patient.clinic_id);
    } else if (patient.professional_id) {
      assessmentQuery = assessmentQuery.eq("professional_id", patient.professional_id);
    }

    const { data: assessment, error: assessErr } = await assessmentQuery.maybeSingle();
    if (assessErr) console.error("[agent-hep] assessment query", assessErr);
    if (!assessment) {
      return new Response(JSON.stringify({ error: "no_assessment" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load exercise library (compact)
    const { data: library } = await adminClient
      .from("exercise_library")
      .select("id, name_pt, body_region, category, difficulty");

    const lib = library || [];
    if (lib.length === 0) {
      return new Response(JSON.stringify({ error: "library_empty" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Recent conversation context (last 10 messages)
    const { data: history } = await adminClient
      .from("agent_messages").select("role, parts")
      .eq("thread_id", thread_id)
      .order("created_at", { ascending: false }).limit(10);
    const convo = (history || []).reverse().map((m: any) => {
      const text = Array.isArray(m.parts)
        ? m.parts.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ")
        : "";
      return `[${m.role}] ${text.slice(0, 400)}`;
    }).join("\n");

    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "ai_not_configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hypothesis = (assessment as any).final_hypothesis || (assessment.diagnosis as any)?.hypothesis || "Não definida";
    const anamnesis: any = assessment.anamnesis_data || {};
    const chiefComplaint = anamnesis.chiefComplaint || "";
    const painRegions = assessment.pain_regions || [];
    const activityLevel = anamnesis.activityLevel || anamnesis.activity_level || "não informado";
    const symptomDuration = anamnesis.symptomDuration || anamnesis.duration || anamnesis.painDuration || "não informado";
    const onset = anamnesis.onset || anamnesis.painOnset || "não informado";
    const previousTreatments = anamnesis.previousTreatments || anamnesis.treatments || "";

    // Passo D4 — mecanismo de dor: diagnosis.pain_mechanism (refinado pela IA
    // no D1) tem prioridade sobre a triagem crua salva na avaliação.
    const painMechanism = resolveStoredMechanism((assessment.diagnosis as any)?.pain_mechanism)
      || resolveStoredMechanism((assessment as any).pain_mechanism);
    const painExtent = typeof (assessment as any).pain_extent === "number"
      ? (assessment as any).pain_extent
      : null;
    const mechanismBlock = mechanismContextBlock(painMechanism, painExtent);
    const mechanismRules = mechanismHepRules(painMechanism, painExtent);

    const LEVELS = ["beginner", "intermediate", "advanced"];
    const requestedLevel = LEVELS.includes(String(challenge_level)) ? String(challenge_level) : "auto";

    // Availability per difficulty so the AI knows what it can actually pick.
    const availability = LEVELS.map((d) => {
      const n = lib.filter((e: any) => e.difficulty === d).length;
      return `${d}: ${n}`;
    }).join(" | ");

    const libIndex = lib.map((e: any) =>
      `${e.id}|${e.name_pt}|${e.body_region}|${e.category}|${e.difficulty}`
    ).join("\n");

    const levelInstruction = requestedLevel === "auto"
      ? `O NÍVEL DE DESAFIO NÃO FOI FIXADO PELO PROFISSIONAL — determine-o você a partir do raciocínio clínico:
- Capacidade basal / histórico de atividade física (atleta ou praticante regular → tolera mais desafio; sedentário → começar básico);
- Estágio da lesão (agudo → conservador; subagudo → intermediário; crônico estável → intermediário/avançado);
- Dor atual (EVA ≥ 7 → básico; 4-6 → básico/intermediário; ≤ 3 → intermediário/avançado);
- Sinais de alerta / cirurgias recentes reduzem o nível.
Se houver conflito, prevalece o critério mais conservador entre dor aguda e capacidade basal, mas NÃO subestime pacientes ativos e com dor baixa: nesses casos escolha intermediate ou advanced.`
      : `O PROFISSIONAL FIXOU O NÍVEL DE DESAFIO: "${requestedLevel}". Respeite-o e selecione exercícios coerentes com esse nível (a menos que haja risco clínico evidente — nesse caso explique em level_rationale).`;

    const prompt = `Você é fisioterapeuta. Selecione de 5 a 10 exercícios da BIBLIOTECA abaixo para compor um HEP (programa de exercícios domiciliares) para o paciente, considerando hipótese, queixa, regiões de dor, capacidade basal e a conversa recente entre o profissional e o agente. Programas de nível mais alto tendem a ter mais exercícios (8-10); os básicos podem ter menos (5-6).

PACIENTE: ${patient.full_name}
HIPÓTESE: ${hypothesis}
QUEIXA PRINCIPAL: ${chiefComplaint}
REGIÕES DE DOR: ${JSON.stringify(painRegions)}
DOR (EVA): ${assessment.pain_score ?? "—"}
NÍVEL DE ATIVIDADE FÍSICA / CAPACIDADE BASAL: ${activityLevel}
TEMPO DE SINTOMAS: ${symptomDuration}
INÍCIO/MECANISMO: ${onset}
TRATAMENTOS PRÉVIOS: ${previousTreatments || "—"}
${mechanismBlock || "MECANISMO DE DOR: sem triagem registrada — siga o raciocínio padrão."}

CONVERSA RECENTE (pode conter decisões do fisioterapeuta sobre o nível desejado):
${convo || "(sem histórico)"}

${levelInstruction}

BIBLIOTECA DE EXERCÍCIOS (id|nome|região|categoria|dificuldade):
${libIndex}

DISPONIBILIDADE POR DIFICULDADE: ${availability}

REGRAS:
- Use APENAS ids existentes na biblioteca.
- PRINCÍPIO DE COMPOSIÇÃO (não use números fixos, use o bom senso clínico): o nível define o CENTRO DE GRAVIDADE do programa, não a exclusividade. Todo HEP deve ser uma pirâmide: alguns exercícios de mobilidade/ativação mais fáceis servindo de aquecimento e preparo, o núcleo do estímulo no nível escolhido, e opcionalmente 1 exercício acima do nível como desafio/progressão.
  * beginner → núcleo em "beginner"; pode haver 1 "intermediate" como progressão final.
  * intermediate → núcleo em "intermediate"; 1-2 "beginner" como aquecimento e eventualmente 1 "advanced" como desafio.
  * advanced → a MAIORIA em "advanced", complementada por alguns "intermediate" e 1-2 "beginner" apenas como aquecimento/mobilidade preparatória (ex.: em 10 exercícios, algo próximo de 6 avançados, 2 intermediários e 2 básicos — proporção ilustrativa, ajuste ao caso).
- Deixe claro nas observações quais exercícios são aquecimento/preparo e quais são o estímulo principal.
- Se a região da queixa não tiver exercícios suficientes no nível escolhido, complete com exercícios de região adjacente/geral no mesmo nível e AUMENTE a dose (séries/reps/carga descrita nas observações) em vez de rebaixar o programa.
- Cubra mobilidade → ativação → fortalecimento progressivo.
- EVITE exercícios em superfície instável (bosu, disco, almofada). Prefira estabilidade em solo firme com perturbações por carga, elásticos ou mudança do centro de gravidade, e redução da base de apoio (ponta de pé, apoio em anilhas para demanda de foot core).
- TRIAGEM ERGONÔMICA / POSICIONAL (obrigatória, vale também para mobilidade e alongamento): avalie a POSIÇÃO exigida pelo exercício, não apenas carga e intensidade. Uma carga leve numa posição provocativa continua sendo provocativa.
  * Dor anterior de joelho (condropatia patelar/DFP, tendinopatia patelar ou quadricipital, hoffite), irritabilidade alta ou restrição de flexão de joelho → selecione APENAS exercícios amigáveis ao joelho: NÃO use posições ajoelhada ou semi-ajoelhada (ex.: alongamento de flexores de quadril ajoelhado), agachamento/afundo em amplitude final, flexão profunda sob carga ou pressão direta sobre a patela/gordura infrapatelar.
  * Prefira variações em pé, decúbito dorsal/ventral, lateral ou sentado: alongamento de flexores de quadril em pé ou em decúbito (posição de Thomas na maca/cama), alongamento de quadríceps em prono, extensão de quadril em pé com elástico, isometrias em amplitude indolor.
  * Mesma lógica em outras regiões: evite posições overhead/ABER em ombro irritável, flexão lombar carregada em amplitude final na dor discal aguda, extensão cervical prolongada em cervical irritável.
  * Nas observações, deixe claro por que a posição escolhida é segura para este paciente.
- Ajuste dose ao nível: básico (2-3 séries, cargas leves), intermediário (3 séries, tempo sob tensão maior), avançado (3-4 séries, progressão de carga/velocidade/unilateral).
${mechanismRules ? mechanismRules + "\n" : ""}- Observações curtas (máx 120 caracteres) explicando o objetivo e a progressão.

Responda APENAS em JSON válido no formato:
{
  "level": "beginner" | "intermediate" | "advanced",
  "level_rationale": "1-2 frases justificando o nível (dor, estágio, capacidade basal).",
  "items": [
    { "exercise_id": "uuid", "sets": "3", "reps": "12", "frequency": "3x/semana", "observations": "..." }
  ],
  "notes": "Orientação geral curta para o paciente (3-5 frases)."
}`;

    // Cache key = clinical case snapshot (not the conversation), so identical
    // cases don't re-burn credits. Any change in hypothesis/complaint/pain/
    // anamnesis, no nível pedido ou na biblioteca produz uma nova chave.
    const cachePayload = {
      assessment_id: assessment.id,
      hypothesis,
      chiefComplaint,
      painRegions,
      pain_score: assessment.pain_score ?? null,
      anamnesis: assessment.anamnesis_data ?? null,
      requested_level: requestedLevel,
      pain_mechanism: painMechanism,
      pain_extent: painExtent,
      library: lib.map((e: any) => e.id).sort(),
    };


    let parsed: any = null;
    if (!forceRefresh) {
      const cached = await getCachedAiResponse<any>(adminClient, "agent-generate-hep", cachePayload);
      if (cached && Array.isArray(cached.items) && cached.items.length > 0) {
        parsed = cached;
        console.log("[agent-hep] cache hit");
      }
    }

    if (!parsed) {
      const aiResp = await callAiWithFallback(LOVABLE_API_KEY, {
        messages: [
          { role: "system", content: "Você é fisioterapeuta. Responda apenas JSON válido." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }, undefined, { functionName: "agent-generate-hep", maxTokens: 2000 });

      if (!aiResp.ok) {
        const errText = await aiResp.text();
        console.error("[agent-hep] AI error", aiResp.status, errText);
        return new Response(JSON.stringify({ error: "ai_error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const aiJson = await aiResp.json();
      try {
        parsed = JSON.parse(aiJson.choices?.[0]?.message?.content || "{}");
      } catch {
        parsed = {};
      }

      if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
        await setCachedAiResponse(
          adminClient, "agent-generate-hep", cachePayload,
          { items: parsed.items, notes: parsed.notes ?? null, level: parsed.level ?? null, level_rationale: parsed.level_rationale ?? null },
          AI_CACHE_TTL_30D,
        );
      }
    }


    const validIds = new Set(lib.map((e: any) => e.id));
    const items = (parsed.items || [])
      .filter((it: any) => it?.exercise_id && validIds.has(it.exercise_id))
      .slice(0, 10);

    if (items.length === 0) {
      return new Response(JSON.stringify({ error: "ai_no_items" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const effectiveLevel = requestedLevel !== "auto"
      ? requestedLevel
      : (LEVELS.includes(parsed?.level) ? parsed.level : "beginner");
    const LEVEL_PT: Record<string, string> = {
      beginner: "Básico", intermediate: "Intermediário", advanced: "Avançado",
    };
    const diffById = new Map(lib.map((e: any) => [e.id, e.difficulty]));
    const mix = items.reduce((acc: Record<string, number>, it: any) => {
      const d = String(diffById.get(it.exercise_id) || "beginner");
      acc[d] = (acc[d] || 0) + 1;
      return acc;
    }, {});
    const mixLabel = LEVELS
      .filter((d) => mix[d])
      .map((d) => `${mix[d]} ${LEVEL_PT[d].toLowerCase()}`)
      .join(" · ");


    // Create the program
    const { data: program, error: progErr } = await adminClient
      .from("exercise_programs")
      .insert({
        professional_id: pro.id,
        clinic_id: patient.clinic_id || null,
        assessment_id: assessment.id,
        patient_name: patient.full_name,
        notes: [
          `Nível de desafio: ${LEVEL_PT[effectiveLevel]}${parsed.level_rationale ? ` — ${parsed.level_rationale}` : ""}`,
          parsed.notes || null,
        ].filter(Boolean).join("\n\n"),
      })
      .select("id, token")
      .single();
    if (progErr || !program) {
      console.error("[agent-hep] program insert", progErr);
      return new Response(JSON.stringify({ error: "program_failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const regionById = new Map(lib.map((e: any) => [e.id, e.body_region || "general"]));
    const categoryById = new Map(lib.map((e: any) => [e.id, String(e.category || "strengthening")]));
    const itemsToInsert = items.map((it: any, idx: number) => ({
      program_id: program.id,
      exercise_id: it.exercise_id,
      sets: String(it.sets || "3"),
      reps: String(it.reps || "10"),
      frequency: String(it.frequency || "3x/semana"),
      observations: it.observations ? String(it.observations).slice(0, 240) : null,
      sort_order: idx,
      body_region: String(regionById.get(it.exercise_id) || "general"),
      load_type: "bodyweight",
    }));
    await adminClient.from("exercise_program_items").insert(itemsToInsert);

    // Dose planejada automática no microciclo (mesma regra determinística do modal manual)
    try {
      const numOf = (v: string) => {
        const nums = (v || "").replace(",", ".").match(/\d+(\.\d+)?/g)?.map(Number) || [];
        if (!nums.length) return null;
        return nums.length >= 2 ? (nums[0] + nums[1]) / 2 : nums[0];
      };
      const parseFreq = (v: string) => {
        const s = (v || "").toLowerCase();
        if (/di[aá]ri|todos os dias|daily|7x/.test(s)) return 7;
        const n = numOf(s);
        if (n == null) return 3;
        return Math.max(1, Math.min(7, Math.round(n)));
      };
      const REST: Record<string, number> = { high: 120, moderate: 60, light: 45 };
      let setsByInt: Record<string, number> = { light: 0, moderate: 0, high: 0 };
      let sessionsPerWeek = 0;
      let totalMin = 0;
      for (const it of itemsToInsert) {
        const setsN = Math.max(0, Math.round(numOf(it.sets) || 0));
        if (!setsN) continue;
        const cat = (categoryById.get(it.exercise_id) || "").toLowerCase();
        const weight = /mobil|stretch|flexib/.test(cat) ? 0 : /stabil|propriocep/.test(cat) ? 0.5 : 1;
        const s = it.reps.toLowerCase();
        const n = numOf(s);
        const hold = n != null && /min/.test(s) ? n * 60 : n != null && /(\d\s*s\b|seg|sec|''|")/.test(s) ? n : null;
        const reps = hold == null ? n : null;
        const intensity = hold != null ? (hold <= 6 ? "high" : hold <= 15 ? "moderate" : "light")
          : reps != null ? (reps <= 4 ? "high" : reps <= 12 ? "moderate" : "light") : null;
        if (intensity) setsByInt[intensity] += setsN * weight;
        const work = reps != null ? setsN * reps * 3 : setsN * (hold || 0);
        const rest = intensity ? Math.max(0, setsN - 1) * REST[intensity] : 0;
        totalMin += (work + rest) / 60;
        sessionsPerWeek = Math.max(sessionsPerWeek, parseFreq(it.frequency));
      }
      const totalSets = setsByInt.light + setsByInt.moderate + setsByInt.high;
      if (totalSets > 0 && sessionsPerWeek > 0) {
        const targetRpe = Math.min(9, Math.max(5, Math.round(((setsByInt.light * 5.5 + setsByInt.moderate * 7 + setsByInt.high * 8.5) / totalSets) * 2) / 2));
        const durationMin = Math.max(5, Math.round(totalMin + 5));
        const level = targetRpe <= 6 ? "low" : targetRpe <= 7.5 ? "moderate" : "high";
        const { data: plan } = await adminClient
          .from("periodization_plans").select("id")
          .eq("patient_id", patient.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        const today = new Date();
        const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        await adminClient.from("periodization_sessions").delete()
          .eq("exercise_program_id", program.id).gte("session_date", iso(today));
        const k = Math.max(0, Math.min(7, sessionsPerWeek));
        const rows = Array.from({ length: k }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + Math.floor((i * 7) / k));
          return {
            patient_id: patient.id,
            plan_id: plan?.id ?? null,
            session_date: iso(d),
            track: "physio",
            planned_load: level,
            planned_duration_min: durationMin,
            planned_rpe: targetRpe,
            exercise_program_id: program.id,
            title: "Programa de exercícios (HEP)",
            created_source: "hep",
          };
        });
        if (rows.length) await adminClient.from("periodization_sessions").insert(rows);
      }
    } catch (doseErr) {
      console.error("[agent-hep] planned dose sync", doseErr);
    }

    const hepUrl = `/hep/${program.token}`;

    // Post assistant message in the thread with the link
    const message = `✅ **HEP gerado com sucesso** com ${items.length} exercícios baseados na última avaliação de ${patient.full_name}.

**Nível de desafio:** ${LEVEL_PT[effectiveLevel]}${requestedLevel === "auto" ? " (definido pela IA)" : " (definido por você)"}${mixLabel ? ` · composição: ${mixLabel}` : ""}
${parsed.level_rationale ? `**Por quê:** ${parsed.level_rationale}` : ""}

[👉 Abrir HEP](${hepUrl})

${parsed.notes ? `**Orientação:** ${parsed.notes}` : ""}

Você pode editar o HEP a partir do prontuário do paciente.`;

    await adminClient.from("agent_messages").insert({
      thread_id, role: "assistant",
      parts: [{ type: "text", text: message }],
    });
    await adminClient.from("agent_threads")
      .update({ updated_at: new Date().toISOString() }).eq("id", thread_id);

    return new Response(JSON.stringify({
      url: hepUrl, token: program.token, items_count: items.length,
      level: effectiveLevel, level_rationale: parsed.level_rationale ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });


  } catch (err: any) {
    console.error("[agent-generate-hep] fatal", err);
    return new Response(JSON.stringify({ error: err?.message || "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
