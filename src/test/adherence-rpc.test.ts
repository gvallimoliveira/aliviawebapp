// @vitest-environment node
import { it, expect } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";

it("includes email-less Francisco/Fabio by patient ID and excludes other care scopes", async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
    CREATE FUNCTION public.is_clinic_member(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT false $$;
    CREATE TABLE public.professionals(id uuid,user_id uuid);
    CREATE TABLE public.patients(id uuid,email text,full_name text,professional_id uuid,clinic_id uuid,is_study_case boolean);
    CREATE TABLE public.professional_appointments(patient_email text,patient_name text,appointment_date date,service_type text,status text,professional_id uuid,clinic_id uuid);
    CREATE TABLE public.session_notes(patient_email text,session_date date,professional_id uuid,clinic_id uuid);
    CREATE TABLE public.readiness_checkins(patient_id uuid,checkin_date date);
    CREATE TABLE auth.users(id uuid,email text);
    CREATE TABLE public.exercise_programs(id uuid,professional_id uuid,clinic_id uuid);
    CREATE TABLE public.exercise_completions(user_id uuid,program_id uuid,completed_at timestamptz);
    INSERT INTO public.professionals VALUES ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001');
    INSERT INTO public.patients VALUES
      ('00000000-0000-0000-0000-000000000101',null,'Francisco','00000000-0000-0000-0000-000000000010',null,false),
      ('00000000-0000-0000-0000-000000000102',null,'Fabio','00000000-0000-0000-0000-000000000010',null,false),
      ('00000000-0000-0000-0000-000000000103',null,'Other clinic','00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000020',false);
    INSERT INTO public.readiness_checkins SELECT '00000000-0000-0000-0000-000000000101'::uuid,(now() AT TIME ZONE 'America/Sao_Paulo')::date-i FROM generate_series(0,3) i;
    INSERT INTO public.readiness_checkins SELECT '00000000-0000-0000-0000-000000000102'::uuid,(now() AT TIME ZONE 'America/Sao_Paulo')::date-i FROM generate_series(17,18) i;
    INSERT INTO public.readiness_checkins VALUES ('00000000-0000-0000-0000-000000000103',(now() AT TIME ZONE 'America/Sao_Paulo')::date);
  `);
  await db.exec(readFileSync("drizzle/migrations/0035_adherence_patient_id_scoped_checkins.sql", "utf8"));
  const result = await db.query<{patient_name: string; checkin_pct: number; score: number; exercises_pct: number | null}>("SELECT * FROM public.get_patient_adherence_scores(null,'00000000-0000-0000-0000-000000000010')");
  expect(result.rows.map((r) => r.patient_name).sort()).toEqual(["Fabio", "Francisco"]);
  expect(result.rows.find((r) => r.patient_name === "Francisco")?.checkin_pct).toBe(29);
  expect(result.rows.find((r) => r.patient_name === "Francisco")?.score).toBe(29);
  expect(result.rows.find((r) => r.patient_name === "Francisco")?.exercises_pct).toBeNull();
  expect(result.rows.find((r) => r.patient_name === "Fabio")?.checkin_pct).toBe(0);
  await expect(db.query("SELECT * FROM public.get_patient_adherence_scores(null,'00000000-0000-0000-0000-000000000099')")).rejects.toThrow("Not authorized");
  await db.close();
}, 30000);