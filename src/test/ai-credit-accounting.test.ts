// @vitest-environment node
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
const partner="00000000-0000-0000-0000-000000000001", pro="00000000-0000-0000-0000-000000000002", owner="00000000-0000-0000-0000-000000000003", therapist="00000000-0000-0000-0000-000000000004", secretary="00000000-0000-0000-0000-000000000005", vip="00000000-0000-0000-0000-000000000006", clinic="00000000-0000-0000-0000-000000000020";
let db:PGlite;
async function status(id:string) {return (await db.query<{s:Record<string,any>}>("select public.get_user_credit_status($1::uuid) s",[id])).rows[0].s;}
async function use(id:string,cost:number) {await db.query("insert into public.ai_credit_usage(user_id,credits_used) values ($1::uuid,$2)",[id,cost]);}
describe("compra → saldo → consumo real em ambiente isolado",()=>{
 beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE SCHEMA auth;
   CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$select nullif(current_setting('test.uid',true),'')::uuid$$;
   CREATE TABLE auth.users(id uuid primary key,email text);
   CREATE TABLE vip_users(email text); CREATE FUNCTION is_admin(uuid) RETURNS boolean LANGUAGE sql AS $$select exists(select 1 from auth.users u join vip_users v on v.email=u.email where u.id=$1)$$;
   CREATE TABLE professionals(user_id uuid,is_partner boolean,is_partner_account boolean,is_student boolean,subscription_status text,lifetime_treatment boolean,premium_granted boolean);
   CREATE TABLE clinics(id uuid primary key,max_members int,subscription_status text);
   CREATE TABLE clinic_members(clinic_id uuid,user_id uuid,role text,status text,created_at timestamptz default now());
   CREATE TABLE app_config(key text primary key,value jsonb);
   CREATE FUNCTION credit_period_start() RETURNS timestamptz LANGUAGE sql AS $$select date_trunc('month',now())$$;
   CREATE TABLE ai_credit_usage(id uuid default gen_random_uuid(),user_id uuid,credits_used numeric,was_blocked boolean default false,was_bypassed boolean default false,created_at timestamptz default now());
   CREATE TABLE ai_credit_packages(id uuid primary key default gen_random_uuid(),user_id uuid,clinic_id uuid,package_type text,credits_total int,credits_remaining int,price_paid numeric,stripe_session_id text,stripe_payment_intent_id text,expires_at timestamptz default now()+interval '12 months',created_at timestamptz default now());
   CREATE TABLE ai_credit_transactions(user_id uuid,clinic_id uuid,transaction_type text,product_key text,amount_brl numeric,credits_delta int,stripe_session_id text,notes text);
   INSERT INTO auth.users VALUES ('${partner}','partner@test.invalid'),('${pro}','pro@test.invalid'),('${owner}','owner@test.invalid'),('${therapist}','therapist@test.invalid'),('${secretary}','secretary@test.invalid'),('${vip}','gvallim.fisio@gmail.com');
   INSERT INTO professionals(user_id,is_partner,is_partner_account,subscription_status) VALUES ('${partner}',true,true,'active'),('${pro}',false,false,'active');
   INSERT INTO clinics VALUES ('${clinic}',3,'active');
   INSERT INTO clinic_members VALUES ('${clinic}','${owner}','owner','active',now()),('${clinic}','${therapist}','therapist','active',now()),('${clinic}','${secretary}','secretary','active',now());
   INSERT INTO app_config VALUES ('ai_credits_enforced','true'),('ai_credits_enforced_tiers','[]');`);
  await db.exec(readFileSync('drizzle/migrations/0049_ai_credit_rollout_preparation.sql','utf8'));
 },60000);
 afterAll(async()=>{await db.close();});
 it("parceiro recebe 25, não infinito",async()=>{const s=await status(partner);expect(s.included).toBe(25);expect(s.unlimited).toBe(false);expect(s.can_buy).toBe(true);});
 it("apenas VIP/admin fica ilimitado",async()=>expect((await status(vip)).unlimited).toBe(true));
 it("clínica soma 100 por clínico e 50 por secretária",async()=>{const s=await status(owner);expect(s.included).toBe(250);expect(s.grace_ratio).toBe(1.2);});
 it("equipe não compra, dono compra",async()=>{expect((await status(therapist)).can_buy).toBe(false);expect((await status(owner)).can_buy).toBe(true);});
 it("pacote do parceiro é liberado uma única vez",async()=>{const args=[partner,null,'test-partner',null,'mini',15,29];const sql='select fulfill_ai_credit_package($1::uuid,$2::uuid,$3,$4,$5,$6,$7) ok';expect((await db.query<{ok:boolean}>(sql,args)).rows[0].ok).toBe(true);expect((await db.query<{ok:boolean}>(sql,args)).rows[0].ok).toBe(false);expect((await status(partner)).purchased).toBe(15);});
 it("parceiro consome quota antes do pacote, com débito fracionado",async()=>{await use(partner,25);expect((await status(partner)).purchased).toBe(15);await use(partner,0.05);expect((await status(partner)).purchased).toBe(14.95);});
 it("PRO mantém pacote intacto até 110%",async()=>{await db.query('select fulfill_ai_credit_package($1::uuid,null,$2,null,$3,15,29)',[pro,'test-pro','mini']);await use(pro,66);expect((await status(pro)).purchased).toBe(15);await use(pro,0.3);expect((await status(pro)).purchased).toBe(14.7);});
 it("pacote da clínica é compartilhado com terapeuta e debitado após 120%",async()=>{await db.query('select fulfill_ai_credit_package($1::uuid,$2::uuid,$3,null,$4,15,29)',[owner,clinic,'test-clinic','mini']);await use(therapist,300);expect((await status(therapist)).purchased).toBe(15);await use(therapist,0.3);expect((await status(owner)).purchased).toBe(14.7);expect((await status(owner)).used).toBe(300.3);});
 it("consumo sem saldo não gera dívida no monitoramento",async()=>{await use(partner,100);await db.query('select fulfill_ai_credit_package($1::uuid,null,$2,null,$3,15,29)',[partner,'test-new','mini']);expect((await status(partner)).purchased).toBe(15);});
 it("pacote vencido não fica disponível",async()=>{await db.query("update ai_credit_packages set expires_at=now()-interval '1 day' where user_id=$1::uuid",[partner]);expect((await status(partner)).purchased).toBe(0);});
 it("VIP não consome cota da equipe",async()=>{await db.query("insert into clinic_members values ($1::uuid,$2::uuid,'therapist','active',now())",[clinic,vip]);await use(vip,9);expect((await status(owner)).used).toBe(300.3);});
 it("sem categorias ativadas não há hard",async()=>expect((await status(pro)).hard_enabled).toBe(false));
 it("parceiro não muda a chave do Admin",async()=>{await db.exec(`SET test.uid='${partner}'`);await expect(db.query("select admin_ai_credit_rollout(true,'[\"partner\"]')")).rejects.toThrow('Access denied');await db.exec("RESET test.uid");});
 it("usuário não lê saldo de outro",async()=>{await db.exec(`SET test.uid='${partner}'`);await expect(status(pro)).rejects.toThrow('Access denied');await db.exec("RESET test.uid");});
});
