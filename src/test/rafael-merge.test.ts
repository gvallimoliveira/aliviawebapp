// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
const sql = readFileSync("scripts/merge-rafael-lobianco.sql", "utf8");
const keep = "3a12e64e-4a7d-4cb3-b8a2-2c5cffeb50f6", remove = "c92bcae1-c1ca-4bc0-89f5-c97c13eaab9e", pro = "f67ae246-40d0-4339-ada5-5d718a422224";
const dependencies = ["assessment_voice_notes", "agent_threads", "post_op_profiles", "pre_op_profiles", "patient_health_records", "periodization_plans", "periodization_sessions", "srpe_entries", "readiness_checkins", "periodization_links", "physiotech_reports", "cardio_functional_tests", "pending_questionnaires"];
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE TABLE patients(id uuid primary key,professional_id uuid,clinic_id uuid,full_name text,email text,notes text,updated_at timestamptz,import_batch_id uuid,load_monitoring_enabled boolean);
  CREATE UNIQUE INDEX idx_patients_email_professional ON patients(email,professional_id);
  CREATE TABLE assessments(id uuid,professional_id uuid,clinic_id uuid,patient_name text,patient_email text,diagnosis jsonb);
  CREATE TABLE professional_appointments(id uuid DEFAULT gen_random_uuid(),professional_id uuid,clinic_id uuid,patient_name text,patient_email text);
  CREATE TABLE patient_files(patient_id uuid,patient_email text);
  CREATE TABLE import_changes(record_id uuid);`);
  for (const table of dependencies) await db.exec(`CREATE TABLE ${table}(patient_id uuid)`);
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`TRUNCATE patients,assessments,professional_appointments,patient_files,import_changes,${dependencies.join(",")};
  INSERT INTO patients(id,professional_id,full_name,email,load_monitoring_enabled) VALUES('${keep}','${pro}','Rafael Lobianco',null,true),('${remove}','${pro}','Rafael Lobianco','rafalvamorim@gmail.com',false);
  INSERT INTO periodization_plans VALUES('${keep}'); INSERT INTO periodization_links VALUES('${keep}');
  INSERT INTO assessments VALUES('9f29f7cf-16d6-4c2f-8ad5-fbbc0c8ec187','${pro}',null,'Rafael Lobianco',null,'{"clinicalImpression":"preserved"}');
  INSERT INTO professional_appointments(professional_id,patient_name) VALUES('${pro}','Rafael Lobianco');`);
});
describe("confirmed same-person Rafael consolidation", () => {
  it("keeps the original patient ID, load flag, plan and link while linking assessment and appointment", async () => {
    await db.exec(sql);
    const patients = (await db.query<any>("SELECT * FROM patients")).rows;
    expect(patients).toHaveLength(1); expect(patients[0].id).toBe(keep);
    expect(patients[0].load_monitoring_enabled).toBe(true);
    expect(patients[0].email).toBe("rafalvamorim@gmail.com");
    expect((await db.query<any>("SELECT * FROM periodization_plans")).rows[0].patient_id).toBe(keep);
    expect((await db.query<any>("SELECT * FROM periodization_links")).rows[0].patient_id).toBe(keep);
    expect((await db.query<any>("SELECT * FROM assessments")).rows[0].diagnosis).toEqual({ clinicalImpression: "preserved" });
    expect((await db.query<any>("SELECT * FROM professional_appointments")).rows[0].patient_email).toBe("rafalvamorim@gmail.com");
  });
  it("refuses the entire operation if the duplicate has clinical dependents", async () => {
    await db.exec(`INSERT INTO srpe_entries VALUES('${remove}')`); await db.exec(sql);
    expect((await db.query("SELECT * FROM patients")).rows).toHaveLength(2);
    expect((await db.query<any>(`SELECT email FROM patients WHERE id='${keep}'`)).rows[0].email).toBeNull();
  });
  it("refuses cross-clinic consolidation", async () => {
    await db.exec(`UPDATE patients SET clinic_id=gen_random_uuid() WHERE id='${remove}'`); await db.exec(sql);
    expect((await db.query("SELECT * FROM patients")).rows).toHaveLength(2);
  });
});