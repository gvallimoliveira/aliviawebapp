// @vitest-environment node
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, afterAll, beforeEach, expect, it } from 'vitest';

const ADMIN = '00000000-0000-0000-0000-00000000000a';
const PRO = '00000000-0000-0000-0000-00000000000b';
const PATIENT = '00000000-0000-0000-0000-00000000000c';
const PRO_ROW = '10000000-0000-0000-0000-000000000001';

let db: PGlite;
const as = (uid: string | null) => db.exec(`SELECT set_config('test.uid', '${uid ?? ''}', false)`);
const listed = async () =>
  (await db.query<{ id: string }>(`SELECT id FROM search_marketplace_professionals(NULL, NULL)`)).rows.map((r) => r.id);
const hidden = async () =>
  (await db.query<{ marketplace_hidden: boolean }>(`SELECT marketplace_hidden FROM professionals WHERE id='${PRO_ROW}'`)).rows[0].marketplace_hidden;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE auth.users(id uuid, email text);
    CREATE TABLE vip_users(email text);
    CREATE FUNCTION is_admin(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT EXISTS (SELECT 1 FROM vip_users WHERE email = (SELECT email FROM auth.users WHERE id = _user_id)) $$;
    CREATE TABLE professionals(
      id uuid PRIMARY KEY, user_id uuid, full_name text, crefito text, profile_photo_url text, specialties text[],
      bio text, clinic_name text, clinic_address text, social_media text, phone text, email text, city text, state text,
      active boolean NOT NULL DEFAULT true, approved boolean NOT NULL DEFAULT true,
      active_profile_mode text NOT NULL DEFAULT 'professional', subscription_status text NOT NULL DEFAULT 'inactive',
      subscription_stripe_id text, pro_access_expires_at timestamptz, subscription_grace_until timestamptz,
      is_partner boolean NOT NULL DEFAULT false);
    INSERT INTO auth.users VALUES ('${ADMIN}', 'admin@test'), ('${PRO}', 'pro@test'), ('${PATIENT}', 'patient@test');
    INSERT INTO vip_users VALUES ('admin@test');
  `);
  await db.exec(readFileSync('drizzle/migrations/0088_admin_marketplace_visibility.sql', 'utf8'));
});
afterAll(async () => { await db.close(); });
beforeEach(async () => {
  await as(null);
  await db.exec(`TRUNCATE professionals;
    INSERT INTO professionals(id, user_id, full_name, city, state, subscription_status, subscription_stripe_id)
    VALUES ('${PRO_ROW}', '${PRO}', 'Conta Teste', 'Rio de Janeiro', 'RJ', 'active', 'sub_1');`);
});

it('admin oculta: profissional some da vitrine para o paciente', async () => {
  await as(ADMIN);
  await db.query(`SELECT admin_set_professional_marketplace_hidden('${PRO_ROW}', true)`);
  await as(PATIENT);
  expect(await listed()).toEqual([]);
});

it('admin exibe de novo: profissional volta para a vitrine', async () => {
  await as(ADMIN);
  await db.query(`SELECT admin_set_professional_marketplace_hidden('${PRO_ROW}', true)`);
  await db.query(`SELECT admin_set_professional_marketplace_hidden('${PRO_ROW}', false)`);
  await as(PATIENT);
  expect(await listed()).toEqual([PRO_ROW]);
});

it('quem não é admin não consegue ocultar nem exibir pelo atalho', async () => {
  await as(PRO);
  await expect(db.query(`SELECT admin_set_professional_marketplace_hidden('${PRO_ROW}', true)`)).rejects.toThrow('Not authorized');
  await as(null);
  await expect(db.query(`SELECT admin_set_professional_marketplace_hidden('${PRO_ROW}', true)`)).rejects.toThrow('Not authorized');
  expect(await hidden()).toBe(false);
});

it('profissional ocultado não consegue se reexibir editando o próprio cadastro', async () => {
  await as(ADMIN);
  await db.query(`SELECT admin_set_professional_marketplace_hidden('${PRO_ROW}', true)`);
  await as(PRO);
  await db.exec(`UPDATE professionals SET marketplace_hidden=false, bio='nova bio' WHERE id='${PRO_ROW}'`);
  expect(await hidden()).toBe(true);
  expect((await db.query<{ bio: string }>(`SELECT bio FROM professionals WHERE id='${PRO_ROW}'`)).rows[0].bio).toBe('nova bio');
  await as(PATIENT);
  expect(await listed()).toEqual([]);
});

it('profissional não consegue se ocultar sozinho, nem no cadastro novo', async () => {
  await as(PRO);
  await db.exec(`UPDATE professionals SET marketplace_hidden=true WHERE id='${PRO_ROW}'`);
  expect(await hidden()).toBe(false);
  await db.exec(`INSERT INTO professionals(id, user_id, full_name, marketplace_hidden) VALUES ('10000000-0000-0000-0000-000000000002', '${PRO}', 'Outro', true)`);
  expect((await db.query<{ marketplace_hidden: boolean }>(`SELECT marketplace_hidden FROM professionals WHERE full_name='Outro'`)).rows[0].marketplace_hidden).toBe(false);
});
