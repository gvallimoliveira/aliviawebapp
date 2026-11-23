// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

const seed = readFileSync("scripts/seed-marina-duarte.sql", "utf8");
const patient = "a0f8170b-77d6-48aa-a650-b121bf34fcef";
const pro = "f67ae246-40d0-4339-ada5-5d718a422224";
const assessment = "f7a22ae3-52cd-4c0d-9f4d-4d76729ec239";
const plan = "ea161f8d-350e-41c0-996c-1e0254cb6e6b";
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE TABLE patients(id uuid primary key,professional_id uuid,clinic_id uuid,full_name text,occupation text,email text,is_study_case boolean,notes text,load_monitoring_enabled boolean);
    CREATE TABLE assessments(id uuid primary key,user_id uuid,type text,status text,professional_id uuid,clinic_id uuid,patient_name text,patient_email text,pain_regions text[],pain_score integer,anamnesis_data jsonb,test_results jsonb,diagnosis jsonb,red_flags jsonb,created_at timestamptz,reviewed_at timestamptz,needs_reimpression boolean);
    CREATE TABLE periodization_plans(id uuid primary key,patient_id uuid,clinic_id uuid,sport text,title text,start_date date,notes text);
    CREATE TABLE periodization_cycles(id uuid primary key,plan_id uuid,level text,name text,goal text,start_date date,end_date date,sort_order integer,is_current boolean);
    CREATE TABLE periodization_sessions(id uuid primary key,patient_id uuid,plan_id uuid,session_date date,track text,planned_load text,title text,planned_duration_min integer,planned_rpe numeric,notes text,created_source text);
    CREATE TABLE srpe_entries(id uuid primary key,patient_id uuid,plan_id uuid,session_id uuid REFERENCES periodization_sessions(id),session_date date,track text,duration_min integer,rpe numeric,source text,notes text,training_load numeric GENERATED ALWAYS AS (duration_min*rpe) STORED);
    CREATE TABLE readiness_checkins(id uuid DEFAULT gen_random_uuid(),patient_id uuid,plan_id uuid,checkin_date date,soreness numeric,sleep numeric,stress numeric,fatigue numeric,readiness numeric,pain numeric,note text,source text,UNIQUE(patient_id,checkin_date));
    CREATE TABLE session_notes(id uuid primary key,professional_id uuid,clinic_id uuid,patient_email text,session_date date,content text,observation text);
  `);
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`TRUNCATE srpe_entries,periodization_sessions,periodization_cycles,readiness_checkins,session_notes,periodization_plans,assessments,patients;
    INSERT INTO patients VALUES('${patient}','${pro}',null,'Marina Duarte','Dentista','fake-marina',false,null,true);
    INSERT INTO assessments(id,type,status,professional_id,patient_email,patient_name,pain_regions,pain_score,anamnesis_data,diagnosis,red_flags) VALUES('${assessment}','professional','completed','${pro}','fake-marina','Marina Duarte',ARRAY['lower_back','right_shoulder'],7,'{"painScoresPerRegion":{"anamnesis.complaint.back_pain":7,"anamnesis.complaint.shoulder_pain":6}}','{"hypothesis":"Original hypothesis","clinicalImpression":{"overview":"Original saved text"}}','{"screening":"original"}');
    INSERT INTO periodization_plans(id,patient_id) VALUES('${plan}','${patient}');
    INSERT INTO periodization_cycles(id,plan_id,level,is_current) VALUES('8950413c-7da2-4693-8d68-7e0d6e66bf67','${plan}','macro',true),('317bbefa-32cc-4d8f-9fe1-20097c8c8f17','${plan}','macro',false),('d6a9163a-d9ec-4ef9-b2b1-50dc395acd16','${plan}','macro',false),('5262bd14-077c-4a3d-8503-774a68d3046b','${plan}','macro',false);`);
});

describe("authorized Marina simulation", () => {
  it("creates dated evolution, measurements, planned and recorded load without future results", async () => {
    await db.exec(seed);
    const totals = await db.query<{ planned: number; loads: number; checkins: number; notes: number }>(`SELECT (SELECT count(*)::int FROM periodization_sessions) planned,(SELECT count(*)::int FROM srpe_entries) loads,(SELECT count(*)::int FROM readiness_checkins) checkins,(SELECT count(*)::int FROM session_notes) notes`);
    expect(totals.rows[0]).toEqual({ planned: 25, loads: 20, checkins: 28, notes: 5 });
    expect((await db.query("SELECT * FROM srpe_entries WHERE session_date>'2026-11-22' OR training_load<>duration_min*rpe")).rows).toHaveLength(0);
    expect((await db.query("SELECT * FROM srpe_entries GROUP BY id HAVING count(*)>1")).rows).toHaveLength(0);
  });
  it("preserves current symptoms, hypothesis, safety and original saved impression", async () => {
    await db.exec(seed);
    const row = (await db.query<{ pain_score: number; diagnosis: any; red_flags: any; anamnesis_data: any }>(`SELECT * FROM assessments WHERE id='${assessment}'`)).rows[0];
    expect(row.pain_score).toBe(7);
    expect(row.anamnesis_data.painScoresPerRegion["anamnesis.complaint.shoulder_pain"]).toBe(6);
    expect(row.diagnosis.hypothesis).toBe("Original hypothesis");
    expect(row.diagnosis.clinicalImpression.overview.startsWith("Original saved text")).toBe(true);
    expect(row.red_flags).toEqual({ screening: "original" });
    expect(row.anamnesis_data.strengthTable[0].rightValue).toBe("7.2");
    expect(row.anamnesis_data.romTable[0].rightValue).toBe("160°");
  });
  it("can be repeated without duplicating dates, loads or assessment history", async () => {
    await db.exec(seed); await db.exec(seed);
    expect((await db.query("SELECT * FROM assessments")).rows).toHaveLength(4);
    expect((await db.query("SELECT * FROM srpe_entries")).rows).toHaveLength(20);
    expect((await db.query("SELECT * FROM readiness_checkins")).rows).toHaveLength(28);
    expect((await db.query("SELECT * FROM session_notes")).rows).toHaveLength(5);
  });
  it("uses the five real STEPS phases with discharge terminal, preserving the pain-control current phase", async () => {
    await db.exec(seed);
    const rows = (await db.query<{ name: string; is_current: boolean }>("SELECT name,is_current FROM periodization_cycles ORDER BY sort_order")).rows;
    expect(rows.map(r => r.name)).toEqual(["Controle de dor e inflamação", "Reparo tecidual", "Mobilidade", "Força geral", "Força específica"]);
    expect(rows.filter(r => r.is_current).map(r => r.name)).toEqual(["Controle de dor e inflamação"]);
  });
  it("writes nothing if the patient belongs to a clinic instead of this solo scope", async () => {
    await db.exec(`UPDATE patients SET clinic_id='11111111-1111-1111-1111-111111111111'`);
    await db.exec(seed);
    expect((await db.query("SELECT * FROM assessments")).rows).toHaveLength(1);
    expect((await db.query("SELECT * FROM periodization_sessions")).rows).toHaveLength(0);
    expect((await db.query("SELECT * FROM session_notes")).rows).toHaveLength(0);
  });
});