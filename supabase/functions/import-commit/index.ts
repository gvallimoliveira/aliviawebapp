// Cria registros nativos no Aliv.iA a partir de linhas já mapeadas pelo client.
// O client envia: entity, rows (já com chaves nativas), dedup strategy, escopo (professional/clinic).
// Esta função:
//  - valida sessão JWT do chamador
//  - cria um import_batches row
//  - insere por entidade, vinculando professional_id/clinic_id
//  - retorna relatório { created, updated, skipped, errors }
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Entity = "patients" | "assessments" | "session_notes" | "pain_diary" | "appointments";
type Dedup = "create" | "merge" | "skip";

interface Body {
  entity: Entity;
  rows: Array<Record<string, any>>;
  externalRows?: Array<Record<string, any>>; // same length, dados externos por linha
  dedup: Dedup;
  professionalId?: string;
  clinicId?: string;
  sourceFilename: string;
  sourceFormat?: string;
}

function ok(json: unknown, status = 200) {
  return new Response(JSON.stringify(json), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return ok({ error: "unauthenticated" }, 401);

    const userClient = createClient(SUPABASE_URL, SERVICE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return ok({ error: "unauthenticated" }, 401);

    const body = (await req.json()) as Body;
    if (!body?.entity || !Array.isArray(body.rows)) return ok({ error: "invalid_body" }, 400);
    if (body.rows.length === 0) return ok({ error: "no_rows" }, 400);
    if (body.rows.length > 5000) return ok({ error: "too_many_rows" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Authorization: only clinic owner/admin/therapist; or own professional profile
    if (body.clinicId) {
      const { data: mem } = await admin
        .from("clinic_members")
        .select("role,status")
        .eq("clinic_id", body.clinicId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (!mem || !["owner", "admin", "therapist"].includes(mem.role as string)) {
        return ok({ error: "forbidden" }, 403);
      }
    } else if (body.professionalId) {
      const { data: pro } = await admin
        .from("professionals")
        .select("id")
        .eq("id", body.professionalId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (!pro) return ok({ error: "forbidden" }, 403);
    } else {
      return ok({ error: "scope_required" }, 400);
    }

    // Create batch
    const { data: batch, error: batchErr } = await admin
      .from("import_batches")
      .insert({
        user_id: user.id,
        clinic_id: body.clinicId ?? null,
        professional_id: body.professionalId ?? null,
        source_filename: body.sourceFilename,
        source_format: body.sourceFormat ?? null,
        status: "running",
        summary: { entity: body.entity, total: body.rows.length },
      })
      .select()
      .single();
    if (batchErr || !batch) return ok({ error: "batch_create_failed", detail: batchErr?.message }, 500);

    let created = 0, updated = 0, skipped = 0;
    const errors: Array<{ index: number; error: string }> = [];

    // Helper: resolve patient by email within scope
    async function resolvePatient(email?: string | null, name?: string | null) {
      if (!email && !name) return null;
      let q = admin.from("patients").select("id,full_name,email");
      if (body.clinicId) q = q.eq("clinic_id", body.clinicId);
      else if (body.professionalId) q = q.eq("professional_id", body.professionalId);
      if (email) q = q.ilike("email", email);
      const { data } = await q.limit(1);
      if (data && data.length) return data[0];
      if (name) {
        let q2 = admin.from("patients").select("id,full_name,email").ilike("full_name", name);
        if (body.clinicId) q2 = q2.eq("clinic_id", body.clinicId);
        else if (body.professionalId) q2 = q2.eq("professional_id", body.professionalId);
        const { data: d2 } = await q2.limit(1);
        if (d2 && d2.length) return d2[0];
      }
      return null;
    }

    for (let i = 0; i < body.rows.length; i++) {
      const row = body.rows[i] ?? {};
      const ext = body.externalRows?.[i] ?? null;
      try {
        if (body.entity === "patients") {
          const email = (row.email ?? "").toString().trim() || null;
          const name = (row.full_name ?? "").toString().trim();
          if (!name) { errors.push({ index: i, error: "missing_full_name" }); continue; }

          if (email && body.dedup !== "create") {
            const existing = await resolvePatient(email, null);
            if (existing) {
              if (body.dedup === "skip") { skipped++; continue; }
              if (body.dedup === "merge") {
                const { error: upErr } = await admin
                  .from("patients")
                  .update({
                    full_name: name,
                    phone: row.phone ?? undefined,
                    cpf: row.cpf ?? undefined,
                    birth_date: row.birth_date ?? undefined,
                    sex: row.sex ?? undefined,
                    occupation: row.occupation ?? undefined,
                    address: row.address ?? undefined,
                    notes: row.notes ?? undefined,
                    external_import_data: ext,
                    import_batch_id: batch.id,
                  })
                  .eq("id", existing.id);
                if (upErr) errors.push({ index: i, error: upErr.message });
                else updated++;
                continue;
              }
            }
          }
          const { error: insErr } = await admin.from("patients").insert({
            full_name: name,
            email,
            phone: row.phone ?? null,
            cpf: row.cpf ?? null,
            birth_date: row.birth_date ?? null,
            sex: row.sex ?? null,
            occupation: row.occupation ?? null,
            address: row.address ?? null,
            notes: row.notes ?? null,
            professional_id: body.professionalId ?? null,
            clinic_id: body.clinicId ?? null,
            external_import_data: ext,
            import_batch_id: batch.id,
          });
          if (insErr) errors.push({ index: i, error: insErr.message });
          else created++;
        } else if (body.entity === "assessments") {
          const patientName = row.patient_name ?? "Paciente importado";
          const patientEmail = row.patient_email ?? null;
          const assessmentData = {
            chiefComplaint: row.chief_complaint ?? "",
            history: row.history ?? "",
            duration: row.duration ?? "",
            onset: row.onset ?? "",
            aggravatingFactors: row.aggravating_factors ?? "",
            relievingFactors: row.relieving_factors ?? "",
            medications: row.medications ?? "",
            previousSurgeries: row.previous_surgeries ?? "",
            comorbidities: row.comorbidities ?? "",
            occupation: row.occupation ?? "",
            complementaryExams: row.complementary_exams ?? "",
            painScore: row.pain_score ?? null,
            painType: row.pain_type ?? "",
            functionalTests: row.functional_tests ?? "",
            clinicalImpression: row.clinical_impression ?? "",
            diagnosis: row.diagnosis_text
              ? { hypothesis: row.diagnosis_text, summary: row.diagnosis_text }
              : null,
            additionalExternalInfo: ext ? JSON.stringify(ext, null, 2) : undefined,
          };
          const { error: insErr } = await admin.from("assessments").insert({
            type: "professional",
            status: "completed",
            patient_name: patientName,
            patient_email: patientEmail,
            assessment_data: assessmentData,
            professional_id: body.professionalId ?? null,
            clinic_id: body.clinicId ?? null,
            external_import_data: ext,
            import_batch_id: batch.id,
          });
          if (insErr) errors.push({ index: i, error: insErr.message });
          else created++;
        } else if (body.entity === "session_notes") {
          const p = await resolvePatient(row.patient_email, row.patient_name);
          if (!p) { errors.push({ index: i, error: "patient_not_found" }); continue; }
          const content = row.content || [row.subjective, row.objective, row.assessment, row.plan]
            .filter(Boolean).join("\n\n");
          const { error: insErr } = await admin.from("session_notes").insert({
            patient_id: p.id,
            professional_id: body.professionalId ?? null,
            content,
            note_date: row.note_date ?? new Date().toISOString().slice(0, 10),
            external_import_data: ext,
            import_batch_id: batch.id,
          });
          if (insErr) errors.push({ index: i, error: insErr.message });
          else created++;
        } else if (body.entity === "pain_diary") {
          // pain_diary lives on user_id; we need to resolve user by email
          const email = (row.patient_email ?? "").toString().trim();
          if (!email) { errors.push({ index: i, error: "missing_patient_email" }); continue; }
          const { data: u } = await admin.rpc("get_user_id_by_email" as any, { _email: email }).maybeSingle?.() ?? { data: null };
          // Fallback: skip if helper not available
          if (!u) { errors.push({ index: i, error: "patient_user_not_found" }); continue; }
          const { error: insErr } = await admin.from("pain_diary_entries").insert({
            user_id: (u as any).id ?? u,
            pain_score: Number(row.pain_score ?? 0),
            note: row.note ?? null,
            logged_at: row.logged_at ?? new Date().toISOString(),
            external_import_data: ext,
            import_batch_id: batch.id,
          });
          if (insErr) errors.push({ index: i, error: insErr.message });
          else created++;
        } else if (body.entity === "appointments") {
          const { error: insErr } = await admin.from("professional_appointments").insert({
            professional_id: body.professionalId ?? null,
            clinic_id: body.clinicId ?? null,
            patient_name: row.patient_name ?? "Paciente importado",
            patient_email: row.patient_email ?? null,
            patient_phone: row.patient_phone ?? null,
            appointment_date: row.appointment_date,
            appointment_time: row.appointment_time ?? null,
            duration_minutes: row.duration_minutes ?? 60,
            status: row.status ?? "scheduled",
            notes: row.notes ?? null,
            external_import_data: ext,
            import_batch_id: batch.id,
          });
          if (insErr) errors.push({ index: i, error: insErr.message });
          else created++;
        }
      } catch (e) {
        errors.push({ index: i, error: String(e) });
      }
    }

    const summary = { entity: body.entity, total: body.rows.length, created, updated, skipped, errors: errors.length };
    await admin.from("import_batches").update({
      status: "completed",
      summary,
    }).eq("id", batch.id);

    return ok({ batchId: batch.id, ...summary, errorsDetail: errors.slice(0, 50) });
  } catch (e) {
    return ok({ error: String(e) }, 500);
  }
});
