// Single sign-on bridge Aliv.iA -> PhysioTech (VIP beta).
// action "issue"  (signed-in VIP): returns a 2-minute signed ticket with the
//   professional identity and, optionally, a patient the caller can read.
// action "verify" (called by PhysioTech's server): checks the signature/expiry
//   and returns the payload. No shared secret needs to leave Aliv.iA.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
import { getPhysioTechEntitlement, PHYSIOTECH_ALLOWLIST } from "../_shared/physiotechEntitlement.ts";
// Beta gate: only the manual allowlist may open PhysioTech for now.
// Partners are NOT automatic. Remove this gate at general launch.
const VIP = PHYSIOTECH_ALLOWLIST;
const TTL_MS = 2 * 60 * 1000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const b64u = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(Deno.env.get("PHYSIOTECH_SSO_SECRET")!),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  return b64u(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
}

// Latest readiness check-in of the patient (raw 0-10 scales, as stored).
async function latestCheckin(client: any, patientId: string) {
  const { data } = await client.from("readiness_checkins")
    .select("checkin_date, readiness, fatigue, sleep, soreness, pain, stress, note")
    .eq("patient_id", patientId).order("checkin_date", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;
  return {
    checkinDate: data.checkin_date, readiness: data.readiness, fatigue: data.fatigue, sleep: data.sleep,
    soreness: data.soreness, pain: data.pain, stress: data.stress, note: data.note,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));

    if (body.action === "verify") {
      const [p, sig] = String(body.ticket || "").split(".");
      if (!p || !sig || (await hmac(p)) !== sig) return json({ error: "invalid" }, 401);
      const payload = JSON.parse(fromB64u(p));
      if (Date.now() > payload.exp) return json({ error: "expired" }, 401);
      return json({ ok: true, payload });
    }

    // "checkin" (PhysioTech server, "Atualizar check-in"): reportToken → latest check-in.
    if (body.action === "checkin") {
      const [p, sig] = String(body.reportToken || "").split(".");
      if (!p || !sig || (await hmac(p)) !== sig) return json({ error: "invalid token" }, 401);
      const tok = JSON.parse(fromB64u(p));
      if (tok.t !== "report" || Date.now() > tok.exp) return json({ error: "expired token" }, 401);
      const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      return json({ ok: true, aliviaPatientId: tok.pid, checkin: await latestCheckin(admin, tok.pid) });
    }

    // issue
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    const email = u?.user?.email?.toLowerCase();
    if (!email) return json({ error: "unauthorized" }, 401);
    if (!VIP.includes(email)) return json({ error: "forbidden" }, 403);

    let patient: Record<string, unknown> | null = null;
    if (body.patientId) {
      if (!UUID_RE.test(body.patientId)) return json({ error: "bad patient" }, 400);
      // RLS-scoped read: only patients this professional can already see.
      const { data } = await userClient.from("patients")
        .select("id, full_name, email, birth_date").eq("id", body.patientId).maybeSingle();
      if (!data) return json({ error: "patient not accessible" }, 403);
      // Long-lived (180d) token bound to this professional + patient; PhysioTech
      // stores it with the patient and sends it back with each report.
      const rp = b64u(new TextEncoder().encode(JSON.stringify({
        t: "report", sub: u!.user!.id, pid: data.id, exp: Date.now() + 180 * 86400000,
      })));
      patient = {
        aliviaPatientId: data.id, name: data.full_name, email: data.email ?? null, birthDate: data.birth_date ?? null,
        reportToken: `${rp}.${await hmac(rp)}`,
        checkin: await latestCheckin(userClient, data.id),
      };
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ent = await getPhysioTechEntitlement(admin, u!.user!.id, email);

    // Professional identity + signature (own record only; never another member's).
    let professional: Record<string, unknown> | null = null;
    const { data: prof } = await admin.from("professionals")
      .select("full_name, crefito, signature_image_url").eq("user_id", u!.user!.id).maybeSingle();
    if (prof) {
      let signatureUrl: string | null = null;
      if (prof.signature_image_url) {
        const { data: s } = await admin.storage.from("signatures").createSignedUrl(prof.signature_image_url, 3600);
        signatureUrl = s?.signedUrl ?? null;
      }
      professional = {
        name: prof.full_name ?? null,
        councilType: prof.crefito ? "CREFITO" : null,
        councilNumber: prof.crefito ?? null,
        signatureUrl, // PNG transparente, válido por 1h — PhysioTech deve copiar para o próprio storage
      };
    }

    const payload = {
      iss: "alivia", sub: u!.user!.id, email, professional,
      plan: ent.plan, entitlement: { kind: ent.kind, limit: ent.limit, used: ent.used, remaining: ent.remaining },
      name: (professional?.name as string) ?? (u!.user!.user_metadata as any)?.full_name ?? null,
      patient, nonce: crypto.randomUUID(), exp: Date.now() + TTL_MS,
    };
    const p = b64u(new TextEncoder().encode(JSON.stringify(payload)));
    return json({ ticket: `${p}.${await hmac(p)}`, entitlement: ent });
  } catch (e) {
    console.error("physiotech-sso", e);
    return json({ error: "internal" }, 500);
  }
});
