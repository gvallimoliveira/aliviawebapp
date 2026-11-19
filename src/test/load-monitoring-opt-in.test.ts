// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const actor = "11111111-1111-1111-1111-111111111111";
const pro = "22222222-2222-2222-2222-222222222222";
const clinic = "33333333-3333-3333-3333-333333333333";
const patient = "44444444-4444-4444-4444-444444444444";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
    CREATE TABLE professionals(id uuid,user_id uuid,paid boolean);
    CREATE TABLE clinics(id uuid,status text);
    CREATE TABLE clinic_members(clinic_id uuid,user_id uuid,status text,role text);
    CREATE TABLE patients(id uuid PRIMARY KEY,professional_id uuid,clinic_id uuid);
    CREATE FUNCTION has_active_pro_subscription(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT paid FROM professionals WHERE id=$1 $$;
    CREATE FUNCTION is_clinic_clinician(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM clinic_members m JOIN clinics c ON c.id=m.clinic_id WHERE m.user_id=$1 AND m.clinic_id=$2 AND m.status='active' AND m.role IN ('owner','therapist') AND c.status IN ('active','trialing')) $$;
    GRANT USAGE ON SCHEMA public,auth TO authenticated;
    GRANT SELECT,INSERT,UPDATE ON patients TO authenticated;`);
  for (const table of ["periodization_plans", "periodization_sessions", "srpe_entries", "readiness_checkins", "periodization_links", "cardio_functional_tests"]) {
    await db.exec(`CREATE TABLE ${table}(patient_id uuid, payload text);`);
  }
  await db.exec(`INSERT INTO patients VALUES('${patient}',NULL,'${clinic}'); INSERT INTO srpe_entries VALUES('${patient}','original load');`);
  await db.exec(readFileSync("drizzle/migrations/0084_patient_load_monitoring_opt_in.sql", "utf8"));
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`RESET ROLE; TRUNCATE professionals,clinics,clinic_members;
    INSERT INTO professionals VALUES('${pro}','${actor}',true);
    INSERT INTO clinics VALUES('${clinic}','active');
    INSERT INTO clinic_members VALUES('${clinic}','${actor}','active','therapist');
    SELECT set_config('test.uid','${actor}',false);`);
});
const toggle = async (enabled: boolean, scope = `'${clinic}',NULL`) => {
  await db.exec("SET ROLE authenticated");
  return db.query(`SELECT set_patient_load_monitoring('${patient}',${enabled},${scope}) AS enabled;`);
};
describe("patient load monitoring opt-in", () => {
  it("preserves activation for existing recorded load", async () => {
    expect((await db.query(`SELECT load_monitoring_enabled FROM patients WHERE id='${patient}'`)).rows).toEqual([{ load_monitoring_enabled: true }]);
  });
  it("new patients default to disabled", async () => {
    await db.exec(`INSERT INTO patients(id) VALUES('55555555-5555-5555-5555-555555555555');`);
    expect((await db.query(`SELECT load_monitoring_enabled FROM patients WHERE id='55555555-5555-5555-5555-555555555555'`)).rows).toEqual([{ load_monitoring_enabled: false }]);
  });
  it("clinical staff activate without personal PRO and disable/reactivate without deleting load", async () => {
    await db.exec(`UPDATE professionals SET paid=false;`);
    for (const enabled of [false, true]) {
      await toggle(enabled);
      expect((await db.query(`SELECT load_monitoring_enabled FROM patients WHERE id='${patient}'`)).rows).toEqual([{ load_monitoring_enabled: enabled }]);
    }
    await db.exec("RESET ROLE");
    expect((await db.query("SELECT payload FROM srpe_entries")).rows).toEqual([{ payload: "original load" }]);
  });
  it("rejects secretaries", async () => {
    await db.exec(`UPDATE clinic_members SET role='secretary'`);
    await expect(toggle(false)).rejects.toThrow("Sem permissão");
  });
  it("rejects inactive clinics", async () => {
    await db.exec(`UPDATE clinics SET status='canceled'`);
    await expect(toggle(false)).rejects.toThrow("Sem permissão");
  });
  it("rejects using a clinic patient from solo scope", async () => {
    await expect(toggle(false, `NULL,'${pro}'`)).rejects.toThrow("Sem permissão");
  });
  it("rejects other clinics", async () => {
    await expect(toggle(false, `'66666666-6666-6666-6666-666666666666',NULL`)).rejects.toThrow("Sem permissão");
  });
  it("direct updates cannot bypass clinical authorization", async () => {
    await db.exec(`UPDATE clinic_members SET role='secretary'; SET ROLE authenticated;`);
    await expect(db.exec(`UPDATE patients SET load_monitoring_enabled=false WHERE id='${patient}'`)).rejects.toThrow("Sem permissão");
  });
  it("solo owner can toggle their patient but clinic entitlement alone cannot", async () => {
    await db.exec(`UPDATE patients SET clinic_id=NULL, professional_id='${pro}';`);
    await toggle(false, `NULL,'${pro}'`);
    await db.exec(`RESET ROLE; UPDATE professionals SET paid=false;`);
    await expect(toggle(true, `NULL,'${pro}'`)).rejects.toThrow("Sem permissão");
    await db.exec(`RESET ROLE; UPDATE professionals SET paid=true; UPDATE patients SET clinic_id='${clinic}',professional_id=NULL; UPDATE patients SET load_monitoring_enabled=true;`);
  });
});