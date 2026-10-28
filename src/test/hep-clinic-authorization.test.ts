// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest';

const actor='11111111-1111-1111-1111-111111111111';
const author='22222222-2222-2222-2222-222222222222';
const clinic='33333333-3333-3333-3333-333333333333';
const pro='44444444-4444-4444-4444-444444444444';
const program='55555555-5555-5555-5555-555555555555';
let db: PGlite;
beforeAll(async()=>{
 db=new PGlite();
 await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
 CREATE TABLE professionals(id uuid,user_id uuid,paid boolean);
 CREATE TABLE clinics(id uuid,subscription_status text);
 CREATE TABLE clinic_members(clinic_id uuid,user_id uuid,status text,role text);
 CREATE TABLE exercise_programs(id uuid,professional_id uuid,clinic_id uuid,patient_name text);
 CREATE TABLE exercise_program_items(program_id uuid,sets text);
 CREATE FUNCTION has_active_pro_subscription(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT paid FROM professionals WHERE id=$1 $$;
 CREATE FUNCTION is_clinic_member(uuid,uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT EXISTS(SELECT 1 FROM clinic_members WHERE user_id=$1 AND clinic_id=$2 AND status='active') $$;
 CREATE FUNCTION get_my_active_exercise_programs() RETURNS TABLE(program_id uuid) LANGUAGE sql AS $$ SELECT NULL::uuid WHERE false $$;
 GRANT USAGE ON SCHEMA public,auth TO authenticated;
 GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
 ALTER TABLE exercise_programs ENABLE ROW LEVEL SECURITY;
 ALTER TABLE exercise_program_items ENABLE ROW LEVEL SECURITY;`);
 await db.exec(readFileSync('drizzle/migrations/0056_fix_clinic_hep_authorization.sql','utf8'));
 await db.exec(`CREATE POLICY read_program ON exercise_programs FOR SELECT TO authenticated USING(can_read_exercise_program(id));`);
},30000);
afterAll(async()=>{await db.close();});
beforeEach(async()=>{
 await db.exec(`RESET ROLE; TRUNCATE professionals,clinics,clinic_members,exercise_programs,exercise_program_items;
 INSERT INTO professionals VALUES('${pro}','${author}',false);
 INSERT INTO clinics VALUES('${clinic}','active');
 INSERT INTO clinic_members VALUES('${clinic}','${actor}','active','owner'),('${clinic}','${author}','active','therapist');
 SELECT set_config('test.uid','${actor}',false);`);
});
const create=()=>db.exec(`SET ROLE authenticated; INSERT INTO exercise_programs VALUES('${program}','${pro}','${clinic}','Test');`);
describe('HEP clinic authorization',()=>{
 it('clinic subscription allows creation and item editing without solo PRO',async()=>{
  await create();
  await db.exec(`INSERT INTO exercise_program_items VALUES('${program}','3'); UPDATE exercise_program_items SET sets='4' WHERE program_id='${program}';`);
  expect((await db.query('SELECT sets FROM exercise_program_items')).rows).toEqual([{sets:'4'}]);
 });
 it('allows active therapist creation without solo PRO',async()=>{
  await db.exec(`SELECT set_config('test.uid','${author}',false)`); await create();
  expect((await db.query('SELECT id FROM exercise_programs')).rows).toHaveLength(1);
 });
 it('rejects secretary prescribing',async()=>{
  await db.exec(`UPDATE clinic_members SET role='secretary' WHERE user_id='${actor}'`);
  await expect(create()).rejects.toThrow('row-level security');
 });
 it('rejects inactive clinic membership',async()=>{
  await db.exec(`UPDATE clinic_members SET status='inactive' WHERE user_id='${actor}'`);
  await expect(create()).rejects.toThrow('row-level security');
 });
 it('rejects author belonging only to another clinic',async()=>{
  await db.exec(`DELETE FROM clinic_members WHERE user_id='${author}'`);
  await expect(create()).rejects.toThrow('row-level security');
 });
 it('does not convert clinic payment into solo entitlement',async()=>{
  await db.exec(`SELECT set_config('test.uid','${author}',false); SET ROLE authenticated;`);
  await expect(db.exec(`INSERT INTO exercise_programs VALUES('${program}','${pro}',NULL,'Test')`)).rejects.toThrow('row-level security');
 });
 it('rejects cancelled clinic writes',async()=>{
  await db.exec(`UPDATE clinics SET subscription_status='canceled'`);
  await expect(create()).rejects.toThrow('row-level security');
 });
 it('keeps unrelated solo programs private from clinic teammates',async()=>{
  await db.exec(`INSERT INTO exercise_programs VALUES('${program}','${pro}',NULL,'Test'); SET ROLE authenticated;`);
  expect((await db.query('SELECT id FROM exercise_programs')).rows).toEqual([]);
 });
});