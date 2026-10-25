// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const uid = "00000000-0000-0000-0000-000000000001";
const pro = "00000000-0000-0000-0000-000000000010";
const clinic = "00000000-0000-0000-0000-000000000020";
const soloMetrics = ["get_patient_churn_risk", "get_discharge_predictions", "get_reactivation_candidates", "get_reassessment_due", "get_patient_adherence_scores"];
const clinicMetrics = ["get_clinic_kpis", "get_clinic_benchmarks", "get_clinic_therapist_stats", "get_clinic_patient_concentration", "get_clinic_funnel", ...soloMetrics];
let db: PGlite;

async function results(scope: string | null) {
  const out: Record<string, unknown[]> = {};
  for (const name of scope ? clinicMetrics : soloMetrics) {
    const args = soloMetrics.includes(name) ? [scope, scope ? null : pro] : [scope];
    const q = `SELECT * FROM public.${name}(${args.map((_, i) => `$${i + 1}::uuid`).join(",")})`;
    out[name] = (await db.query(q, args)).rows;
  }
  return out;
}

describe("compromissos pessoais fora de todos os indicadores do servidor", () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(readFileSync("src/test/fixtures/insight-commitment-baseline.sql", "utf8"));
    const migration = process.env.INSIGHT_COMMITMENT_MIGRATION || resolve("drizzle/migrations/0044_exclude_commitments_from_insights.sql");
    await db.exec(readFileSync(migration, "utf8"));
    await db.exec(`
      SET test.user_id = '${uid}';
      INSERT INTO public.professionals(id,user_id,full_name) VALUES ('${pro}','${uid}','Fisio');
      INSERT INTO public.clinics(id,subscription_status) VALUES ('${clinic}','active');
      INSERT INTO public.clinic_members(clinic_id,user_id,role,status) VALUES ('${clinic}','${uid}','owner','active');
      INSERT INTO public.patients(id,email,full_name,clinic_id,professional_id,is_study_case) VALUES
        ('00000000-0000-0000-0000-000000000101','active@example.test','Ativo','${clinic}','${pro}',false),
        ('00000000-0000-0000-0000-000000000102','old@example.test','Inativo','${clinic}','${pro}',false),
        ('00000000-0000-0000-0000-000000000103','solo@example.test','Solo',null,'${pro}',false);
      INSERT INTO public.professional_appointments(id,patient_email,patient_name,appointment_date,status,service_type,professional_id,clinic_id)
      SELECT ('00000000-0000-0000-0000-'||lpad(i::text,12,'0'))::uuid,'active@example.test','Ativo',CURRENT_DATE,'completed',CASE WHEN i=1 THEN NULL ELSE 'avaliacao' END,'${pro}','${clinic}' FROM generate_series(1,2) i;
      INSERT INTO public.professional_appointments(patient_email,patient_name,appointment_date,status,service_type,professional_id,clinic_id)
      SELECT 'old@example.test','Inativo',CURRENT_DATE-40-i,'completed','fisioterapia','${pro}','${clinic}' FROM generate_series(1,2) i;
      INSERT INTO public.professional_appointments(patient_email,patient_name,appointment_date,status,service_type,professional_id,clinic_id)
      SELECT 'solo@example.test','Solo',CURRENT_DATE-40-i,'completed','fisioterapia','${pro}',null FROM generate_series(1,2) i;
      INSERT INTO public.assessments(patient_email,status,created_at,professional_id,clinic_id) VALUES ('active@example.test','completed',now()-interval '40 days','${pro}','${clinic}');
      INSERT INTO public.session_notes(patient_email,session_date,created_at,professional_id,clinic_id)
      SELECT 'active@example.test',CURRENT_DATE-i,now(),'${pro}','${clinic}' FROM generate_series(0,3) i;
    `);
  }, 30000);

  afterAll(async () => { await db.close(); });

  it("clínica: compromissos não mudam totais, faltas, equipe, benchmark nem sinais clínicos", async () => {
    const before = await results(clinic);
    expect(before.get_clinic_kpis[0]).toMatchObject({ today_count: 2, total_this_month: 2, completed_this_month: 2 });
    expect(before.get_clinic_patient_concentration[0]).toMatchObject({ total_patients: 2, total_sessions: 4 });
    await db.exec(`
      INSERT INTO public.professional_appointments(id,patient_email,patient_name,appointment_date,status,service_type,professional_id,clinic_id)
      SELECT ('00000000-0000-0000-0001-'||lpad(i::text,12,'0'))::uuid,CASE WHEN i=7 THEN 'personal@example.test' WHEN i=6 THEN 'old@example.test' ELSE 'active@example.test' END,'Pessoal',CASE WHEN i=6 THEN CURRENT_DATE+1 ELSE CURRENT_DATE END,
      CASE i WHEN 1 THEN 'completed' WHEN 2 THEN 'no_show' WHEN 3 THEN 'no_show_justified' WHEN 4 THEN 'cancelled' ELSE 'scheduled' END,'compromisso','${pro}','${clinic}' FROM generate_series(1,7) i;
      INSERT INTO public.session_notes(appointment_id,patient_email,session_date,created_at,professional_id,clinic_id)
      SELECT id,patient_email,CURRENT_DATE,now(),professional_id,clinic_id FROM public.professional_appointments WHERE service_type='compromisso' AND clinic_id='${clinic}';
    `);
    expect(await results(clinic)).toEqual(before);
    expect((await db.query("SELECT count(*)::int AS n FROM public.professional_appointments WHERE service_type='compromisso'")).rows).toEqual([{ n: 7 }]);
  });

  it("PRO: compromisso futuro não esconde inatividade nem entra em sessões; clínica permanece isolada", async () => {
    const before = await results(null);
    expect(before.get_reactivation_candidates).toHaveLength(1);
    expect(before.get_reactivation_candidates[0]).toMatchObject({ patient_email: "solo@example.test" });
    await db.exec(`
      INSERT INTO public.professional_appointments(id,patient_email,appointment_date,status,service_type,professional_id,clinic_id) VALUES
        ('00000000-0000-0000-0002-000000000001','solo@example.test',CURRENT_DATE+1,'scheduled','compromisso','${pro}',null),
        ('00000000-0000-0000-0002-000000000002','solo@example.test',CURRENT_DATE,'completed','compromisso','${pro}',null),
        ('00000000-0000-0000-0002-000000000003','solo@example.test',CURRENT_DATE,'no_show','compromisso','${pro}',null);
      INSERT INTO public.session_notes(appointment_id,patient_email,session_date,created_at,professional_id,clinic_id) VALUES
        ('00000000-0000-0000-0002-000000000002','solo@example.test',CURRENT_DATE,now(),'${pro}',null);
    `);
    expect(await results(null)).toEqual(before);
  });

  it("preserva recusa de acesso a clínica e profissional sem autorização", async () => {
    await db.exec("SET test.user_id = '00000000-0000-0000-0000-000000000099'");
    for (const name of clinicMetrics) {
      const args = soloMetrics.includes(name) ? `'${clinic}',null` : `'${clinic}'`;
      await expect(db.query(`SELECT * FROM public.${name}(${args})`)).rejects.toThrow(/Not authorized/);
    }
    for (const name of soloMetrics) {
      await expect(db.query(`SELECT * FROM public.${name}(null,'${pro}')`)).rejects.toThrow(/Not authorized/);
    }
  });
});