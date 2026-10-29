// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';
import { clinicTrialTiming, CLINIC_TRIAL_MS } from '@/lib/clinicTrial';

const owner = 'e428f8ef-4c84-4c6a-8fd3-7bf97ee74997';
const clinic = '313d8038-7e53-435a-8254-832424fb4ae3';
const other = '11111111-1111-1111-1111-111111111111';
let db: PGlite;
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`CREATE ROLE authenticated; CREATE ROLE anon; CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('test.uid',true),'')::uuid $$;
    CREATE FUNCTION public.is_admin(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT coalesce(current_setting('test.admin',true),'false')::boolean $$;
    CREATE TABLE clinics(id uuid, owner_user_id uuid, subscription_status text, subscription_stripe_id text, created_at timestamptz, updated_at timestamptz);`);
  await db.exec(readFileSync('drizzle/migrations/0060_admin_clinic_trial_renewal.sql', 'utf8'));
  await db.exec(readFileSync('drizzle/migrations/0061_pause_gv_clinic_trial_renewal_for_review.sql', 'utf8'));
  await db.exec(readFileSync('drizzle/migrations/0062_restore_gv_admin_trial_renewal.sql', 'utf8'));
}, 30000);
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await db.exec(`RESET ROLE; TRUNCATE clinics;
    INSERT INTO clinics VALUES('${clinic}','${owner}','trialing',null,now()-interval '16 days',now(),now()-interval '16 days');
    SELECT set_config('test.uid','${owner}',false), set_config('test.admin','true',false);`);
});
const renew = async () => (await db.query<{renewed:boolean}>('SELECT renew_my_admin_clinic_trial() AS renewed')).rows[0].renewed;
it('renews the approved expired trial for exactly 15 days without changing creation history', async () => {
  expect(await renew()).toBe(true);
  const row = (await db.query<{days:number; history:boolean}>(`SELECT extract(epoch from (trial_started_at + interval '15 days' - now()))/86400 AS days, created_at < now()-interval '15 days' AS history FROM clinics`)).rows[0];
  expect(Number(row.days)).toBeCloseTo(15, 3);
  expect(row.history).toBe(true);
  expect(await renew()).toBe(false);
});
it('never renews for another admin', async () => {
  await db.exec(`SELECT set_config('test.uid','${other}',false)`);
  expect(await renew()).toBe(false);
});
it('requires server admin authority even for the approved owner', async () => {
  await db.exec(`SELECT set_config('test.admin','false',false)`);
  expect(await renew()).toBe(false);
});
it('does not extend other clinics owned by the approved admin', async () => {
  await db.exec(`UPDATE clinics SET id='${other}'`);
  expect(await renew()).toBe(false);
});
it('does not change paid or canceled subscriptions', async () => {
  for (const status of ['active','canceled']) {
    await db.exec(`UPDATE clinics SET subscription_status='${status}'`);
    expect(await renew()).toBe(false);
  }
});
it('denies anonymous execution', async () => {
  await db.exec('SET ROLE anon');
  await expect(renew()).rejects.toThrow('permission denied');
});
it('counts a renewed 15-day period from its own anchor', () => {
  const start = '2026-10-29T15:00:00Z';
  const now = Date.parse(start);
  expect(clinicTrialTiming(start, now).daysLeft).toBe(15);
  expect(clinicTrialTiming(start, now + CLINIC_TRIAL_MS).daysLeft).toBe(0);
});