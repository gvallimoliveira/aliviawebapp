// @vitest-environment node
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, expect, it } from "vitest";

const pro = "11111111-1111-1111-1111-111111111111";
const clinic = "22222222-2222-2222-2222-222222222222";
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE SCHEMA auth;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '${pro}'::uuid $$;
    CREATE FUNCTION public.is_clinic_member(uuid, uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $2 = '${clinic}'::uuid $$;
    CREATE TABLE professionals(id uuid, user_id uuid);
    INSERT INTO professionals VALUES ('${pro}', '${pro}');
    CREATE TABLE patients(id uuid DEFAULT gen_random_uuid(), full_name text, clinic_id uuid, professional_id uuid);
    CREATE TABLE periodization_plans(id uuid DEFAULT gen_random_uuid(), patient_id uuid, title text DEFAULT 'Plano', status text DEFAULT 'active', clinic_id uuid, professional_id uuid);
    CREATE TABLE periodization_cycles(id uuid DEFAULT gen_random_uuid(), plan_id uuid, level text, name text, goal text, sort_order int, is_current boolean DEFAULT false, marked_current_at timestamptz, created_at timestamptz DEFAULT now());
  `);
  await db.exec(readFileSync("drizzle/migrations/0029_steps_phase_overview_plan_id.sql", "utf8"));
}, 30000);

afterAll(async () => { await db.close(); });

async function reset() {
  await db.exec("TRUNCATE patients, periodization_plans, periodization_cycles");
  await db.exec(`INSERT INTO patients(id, full_name, professional_id) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Ana', '${pro}')`);
}

async function seedPlan(opts: { status?: string; weeksAgo?: number } = {}) {
  const { rows } = await db.query(
    `INSERT INTO periodization_plans(patient_id, professional_id, status) VALUES ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '${pro}', $1) RETURNING id`,
    [opts.status ?? "active"],
  );
  const planId = (rows[0] as any).id;
  await db.exec(`
    INSERT INTO periodization_cycles(plan_id, level, name, sort_order, is_current, marked_current_at) VALUES
      ('${planId}', 'macro', 'Cicatrização tecidual', 0, false, NULL),
      ('${planId}', 'macro', 'Hipertrofia e força', 1, true, now() - interval '${opts.weeksAgo ?? 2} weeks');
  `);
  return planId;
}

describe("get_steps_phase_overview", () => {
  it("returns the plan id so insights can act on the phase without opening the record", async () => {
    await reset();
    const planId = await seedPlan({ weeksAgo: 5 });
    const { rows } = await db.query(`SELECT * FROM get_steps_phase_overview(NULL, '${pro}')`);
    expect(rows).toHaveLength(1);
    expect((rows[0] as any).plan_id).toBe(planId);
    expect((rows[0] as any).phase_name).toBe("Hipertrofia e força");
    expect((rows[0] as any).weeks_in_phase).toBe(5);
  });

  it("stops counting stalled weeks once the plan is discharged (status completed)", async () => {
    await reset();
    await seedPlan({ status: "completed", weeksAgo: 9 });
    const { rows } = await db.query(`SELECT * FROM get_steps_phase_overview(NULL, '${pro}')`);
    expect(rows).toHaveLength(0);
  });
});
