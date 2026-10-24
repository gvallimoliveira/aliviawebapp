import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const pro = "11111111-1111-1111-1111-111111111111";
const clinic = "22222222-2222-2222-2222-222222222222";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${pro}'::uuid $$;
    CREATE FUNCTION public.is_clinic_member(uuid, uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $2 = '${clinic}'::uuid $$;
    CREATE TABLE professionals(id uuid, user_id uuid);
    INSERT INTO professionals VALUES ('${pro}', '${pro}');
    CREATE TABLE assessments(id uuid DEFAULT gen_random_uuid(), patient_email text, created_at timestamptz DEFAULT now()-interval '2 days', status text DEFAULT 'completed', clinic_id uuid, professional_id uuid);
    CREATE TABLE professional_appointments(patient_email text, appointment_date date DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date, service_type text DEFAULT 'fisioterapia', status text DEFAULT 'scheduled', clinic_id uuid, professional_id uuid, assessment_id uuid);
  `);
  await db.exec(readFileSync("drizzle/migrations/0026_assessment_agenda_conversion.sql", "utf8"));
}, 30000);
afterAll(async () => { await db.close(); });
async function reset() { await db.exec("TRUNCATE assessments, professional_appointments"); }
async function result() {
  const r = await db.query(`SELECT * FROM get_assessment_agenda_conversion(NULL, '${pro}')`);
  return r.rows[0];
}
describe("assessment to agenda conversion SQL", () => {
  it("counts patients with and without agenda appointments and completed attendance", async () => {
    await reset();
    await db.exec(`INSERT INTO assessments(patient_email,professional_id) VALUES ('one@test.invalid','${pro}'),('two@test.invalid','${pro}');
      INSERT INTO professional_appointments(patient_email,professional_id,status) VALUES ('one@test.invalid','${pro}','completed');`);
    expect(await result()).toEqual({assessed_count:2,scheduled_count:1,unscheduled_count:1,attended_count:1});
  });
  it("never converts a solo assessment with a clinic appointment or includes clinic assessments", async () => {
    await reset();
    await db.exec(`INSERT INTO assessments(patient_email,professional_id,clinic_id) VALUES ('one@test.invalid','${pro}',NULL),('two@test.invalid','${pro}','${clinic}');
      INSERT INTO professional_appointments(patient_email,professional_id,clinic_id) VALUES ('one@test.invalid','${pro}','${clinic}');`);
    expect(await result()).toEqual({assessed_count:1,scheduled_count:0,unscheduled_count:1,attended_count:0});
  });
  it("excludes cancelled, missed, assessment and personal appointments and appointments before assessment", async () => {
    await reset();
    await db.exec(`INSERT INTO assessments(patient_email,professional_id) VALUES ('one@test.invalid','${pro}');
      INSERT INTO professional_appointments(patient_email,professional_id,status,service_type,appointment_date) VALUES
      ('one@test.invalid','${pro}','cancelled','fisioterapia',CURRENT_DATE),
      ('one@test.invalid','${pro}','no_show','fisioterapia',CURRENT_DATE),
      ('one@test.invalid','${pro}','scheduled','avaliacao',CURRENT_DATE),
      ('one@test.invalid','${pro}','scheduled','compromisso',CURRENT_DATE),
      ('one@test.invalid','${pro}','completed','fisioterapia',CURRENT_DATE-10);`);
    expect(await result()).toEqual({assessed_count:1,scheduled_count:0,unscheduled_count:1,attended_count:0});
  });
  it("does not inflate new assessments with reassessments of an old patient", async () => {
    await reset();
    await db.exec(`INSERT INTO assessments(patient_email,professional_id,created_at) VALUES
      ('old@test.invalid','${pro}',now()-interval '100 days'),('old@test.invalid','${pro}',now()),
      (' NEW@test.invalid ','${pro}',now()-interval '1 day'),('new@test.invalid','${pro}',now());`);
    expect(await result()).toEqual({assessed_count:1,scheduled_count:0,unscheduled_count:1,attended_count:0});
  });
  it("matches an explicit assessment link without an email", async () => {
    await reset();
    await db.exec(`INSERT INTO assessments(id,professional_id) VALUES ('33333333-3333-3333-3333-333333333333','${pro}');
      INSERT INTO professional_appointments(assessment_id,professional_id) VALUES ('33333333-3333-3333-3333-333333333333','${pro}');`);
    expect(await result()).toEqual({assessed_count:1,scheduled_count:1,unscheduled_count:0,attended_count:0});
  });
  it("rejects another professional, unauthorized clinics and mixed scopes", async () => {
    await expect(db.query(`SELECT * FROM get_assessment_agenda_conversion(NULL,'${clinic}')`)).rejects.toThrow("Not authorized");
    await expect(db.query(`SELECT * FROM get_assessment_agenda_conversion('${pro}',NULL)`)).rejects.toThrow("Not authorized");
    await expect(db.query(`SELECT * FROM get_assessment_agenda_conversion('${clinic}','${pro}')`)).rejects.toThrow("Exactly one");
  });
  it("clinic conversion ignores solo appointments for the same patient", async () => {
    await reset();
    await db.exec(`INSERT INTO assessments(patient_email,professional_id,clinic_id) VALUES ('one@test.invalid','${pro}','${clinic}');
      INSERT INTO professional_appointments(patient_email,professional_id) VALUES ('one@test.invalid','${pro}');`);
    const r=await db.query(`SELECT * FROM get_assessment_agenda_conversion('${clinic}',NULL)`);
    expect(r.rows[0]).toEqual({assessed_count:1,scheduled_count:0,unscheduled_count:1,attended_count:0});
  });
});