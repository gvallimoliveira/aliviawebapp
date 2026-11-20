// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, expect, it } from 'vitest';

const patient = '11111111-1111-1111-1111-111111111111';
const stranger = '22222222-2222-2222-2222-222222222222';
const pro = '33333333-3333-3333-3333-333333333333';
const clinic = '44444444-4444-4444-4444-444444444444';
const otherClinic = '55555555-5555-5555-5555-555555555555';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE TABLE auth.users(id uuid, email text);
    CREATE TABLE public.assessments(id uuid, user_id uuid, patient_email text);
    CREATE TABLE public.patients(id uuid, full_name text, professional_id uuid, clinic_id uuid, email text);
    CREATE TABLE public.professionals(id uuid, full_name text);
    CREATE TABLE public.exercise_programs(id uuid, professional_id uuid, clinic_id uuid, patient_name text, notes text, expires_at timestamptz, created_at timestamptz, assessment_id uuid);
    ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE exercise_programs ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public,auth TO authenticated,anon;`);
  await db.exec(readFileSync('drizzle/migrations/0087_scope_patient_active_exercise_programs.sql', 'utf8'));
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`RESET ROLE; TRUNCATE auth.users,assessments,patients,professionals,exercise_programs;
    INSERT INTO auth.users VALUES('${patient}','patient@example.com'),('${stranger}','other@example.com');
    INSERT INTO professionals VALUES('${pro}','Therapist');
    INSERT INTO patients VALUES('${patient}','Same Name','${pro}','${clinic}','PATIENT@example.com');
    SELECT set_config('test.uid','${patient}',false);`);
});
async function program(id: number, scope: string | null, assessment: string | null = null, expired = false) {
  await db.exec(`INSERT INTO exercise_programs VALUES('00000000-0000-0000-0000-${String(id).padStart(12,'0')}','${pro}',
    ${scope ? `'${scope}'` : 'NULL'},'Same Name','Prescribed exercises',now() ${expired ? '-' : '+'} interval '1 day',now(),${assessment ? `'${assessment}'` : 'NULL'});`);
}
async function list() {
  await db.exec('SET ROLE authenticated');
  return (await db.query('SELECT * FROM public.get_my_active_exercise_programs()')).rows;
}
describe('patient active exercises access', () => {
  it('returns the signed-in patient program in the matching clinic', async () => {
    await program(1, clinic);
    expect(await list()).toHaveLength(1);
  });
  it('never matches another clinic or solo program by shared name', async () => {
    await program(1, clinic); await program(2, otherClinic); await program(3, null);
    expect(await list()).toHaveLength(1);
  });
  it('supports solo records only with a solo-scoped match', async () => {
    await db.exec('UPDATE patients SET clinic_id = NULL');
    await program(1, null); await program(2, clinic);
    expect(await list()).toHaveLength(1);
  });
  it('does not let a same-name match override another patient assessment', async () => {
    await db.exec(`INSERT INTO assessments VALUES('${stranger}','${stranger}','other@example.com')`);
    await program(1, clinic, stranger);
    expect(await list()).toHaveLength(0);
  });
  it('keeps direct account-linked and email-linked assessment programs', async () => {
    await db.exec(`INSERT INTO assessments VALUES('${patient}','${patient}',NULL),('${stranger}',NULL,'PATIENT@example.com')`);
    await program(1, clinic, patient); await program(2, clinic, stranger);
    expect(await list()).toHaveLength(2);
  });
  it('returns nothing for an unrelated signed-in user', async () => {
    await program(1, clinic);
    await db.exec(`SELECT set_config('test.uid','${stranger}',false)`);
    expect(await list()).toHaveLength(0);
  });
  it('returns nothing with missing caller identity', async () => {
    await program(1, clinic);
    await db.exec(`SELECT set_config('test.uid','',false)`);
    expect(await list()).toHaveLength(0);
  });
  it('denies anonymous execution and excludes expired programs', async () => {
    await program(1, clinic, null, true);
    expect(await list()).toHaveLength(0);
    await db.exec('RESET ROLE; SET ROLE anon');
    await expect(db.query('SELECT * FROM public.get_my_active_exercise_programs()')).rejects.toThrow('permission denied');
  });
});