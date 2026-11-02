// @vitest-environment node
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
let db: PGlite;
const insert = (email: string, type = 'basic') => db.query("insert into assessments(type,patient_email) values ($1,$2) returning id", [type,email]);
describe('public basic quota: two per email per rolling 30 days', () => {
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create function auth.role() returns text language sql as $$select 'anon'::text$$;
      create table assessments(id uuid primary key default gen_random_uuid(),type text,patient_email text,created_at timestamptz default now(),professional_id uuid,clinic_id uuid);
      create function pg_advisory_xact_lock(bigint) returns void language plpgsql as $$begin return; end$$;`);
    await db.exec(readFileSync('drizzle/migrations/0071_public_basic_assessment_quota.sql','utf8'));
  },60000);
  afterAll(async () => { await db.close(); });
  it('permits two and rejects a third, normalizing case and whitespace', async () => {
    await insert('quota@test.invalid'); await insert(' QUOTA@test.invalid ');
    await expect(insert('quota@test.invalid')).rejects.toThrow('free_assessment_limit');
    expect((await db.query('select * from public_basic_assessment_usage')).rows).toHaveLength(2);
  });
  it('deletion does not restore a slot', async () => {
    await db.exec("delete from assessments where patient_email='quota@test.invalid'");
    await expect(insert('quota@test.invalid')).rejects.toThrow('free_assessment_limit');
  });
  it('an assessment exactly 30 days old is outside the window', async () => {
    await db.exec("update public_basic_assessment_usage set used_at=now()-interval '30 days' where assessment_id=(select assessment_id from public_basic_assessment_usage limit 1)");
    await insert('quota@test.invalid');
    await expect(insert('quota@test.invalid')).rejects.toThrow('free_assessment_limit');
  });
  it('does not count professional and premium assessments', async () => {
    await insert('other@test.invalid','professional'); await insert('other@test.invalid','premium');
    await insert('other@test.invalid'); await insert('other@test.invalid');
    await expect(insert('other@test.invalid')).rejects.toThrow('free_assessment_limit');
  });
  it('rejects blank email', async () => { await expect(insert('')).rejects.toThrow('basic_assessment_email_required'); });
  it('accepts only two of three simultaneous creation requests', async () => {
    const results = await Promise.allSettled([insert('parallel@test.invalid'), insert('parallel@test.invalid'), insert('parallel@test.invalid')]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(2);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  });
  it('does not trust supplied creation dates', async () => {
    const r = await db.query<{fresh:boolean}>("insert into assessments(type,patient_email,created_at) values ('basic','date@test.invalid',now()-interval '60 days') returning created_at > now()-interval '1 minute' as fresh");
    expect(r.rows[0].fresh).toBe(true);
  });
});