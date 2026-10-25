// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';

let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE SCHEMA auth;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'service_role'::text $$;
    CREATE TABLE auth.users(id uuid,email text);
    CREATE TABLE vip_users(email text);
    CREATE TABLE professionals(id int primary key, user_id uuid, crefito text, is_student boolean, is_partner boolean, is_partner_account boolean, approved boolean, subscription_status text, active_profile_mode text, premium_granted boolean);
  `);
  await db.exec(readFileSync('drizzle/migrations/0052_allow_revoking_academic_access_without_crefito.sql','utf8'));
  await db.exec(`CREATE TRIGGER validate BEFORE INSERT OR UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION validate_crefito_format();`);
});
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`TRUNCATE professionals;
    INSERT INTO professionals VALUES (1,NULL,NULL,true,false,true,false,'active','student',true);`);
});
it('allows disabling Academic without inventing CREFITO or removing the partner', async () => {
  await db.exec(`UPDATE professionals SET is_student=false,subscription_status='inactive',approved=false,active_profile_mode='professional' WHERE id=1`);
  expect((await db.query('SELECT * FROM professionals WHERE id=1')).rows[0]).toMatchObject({crefito:null,is_student:false,is_partner:false,is_partner_account:true,subscription_status:'inactive',approved:false});
});
it('allows explicit partner removal without deleting the account record', async () => {
  await db.exec(`UPDATE professionals SET is_partner_account=false,is_partner=false,premium_granted=false,subscription_status='inactive',is_student=false,active_profile_mode='professional',approved=false WHERE id=1`);
  expect((await db.query('SELECT * FROM professionals WHERE id=1')).rows[0]).toMatchObject({id:1,crefito:null,is_student:false,is_partner_account:false,premium_granted:false,subscription_status:'inactive'});
});
it('still rejects professional activation without CREFITO', async () => {
  await expect(db.exec(`UPDATE professionals SET is_student=false,is_partner=true,approved=true,active_profile_mode='professional' WHERE id=1`)).rejects.toThrow('CREFITO is required');
});
it('still rejects new professional registration without CREFITO even if inactive', async () => {
  await expect(db.exec(`INSERT INTO professionals VALUES(2,NULL,NULL,false,false,false,false,'inactive','professional',false)`)).rejects.toThrow('CREFITO is required');
});
it('still rejects removal of a real CREFITO', async () => {
  await db.exec(`INSERT INTO professionals VALUES(2,NULL,'123456-F',false,false,false,false,'inactive','professional',false)`);
  await expect(db.exec(`UPDATE professionals SET crefito=NULL WHERE id=2`)).rejects.toThrow('CREFITO is required');
});