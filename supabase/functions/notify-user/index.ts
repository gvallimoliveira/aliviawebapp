import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-internal-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_ALERT_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Internal notification gateway.
 *
 * Database triggers call this with `x-internal-secret` (the same pattern the
 * working admin-alert flow uses). Calling `send-push-notification` with the
 * project anon key was returning 401, which silently killed every chat and
 * video-call notification. Here we always forward with the service-role key.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const internal = (req.headers.get("x-internal-secret") || "").trim();
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const authorized =
    (!!INTERNAL_SECRET && internal === INTERNAL_SECRET) || token === SERVICE_ROLE_KEY;
  if (!authorized) return json({ error: "Unauthorized" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const userId = payload.user_id ? String(payload.user_id) : "";
  const title = payload.title ? String(payload.title) : "";
  if (!userId || !title) return json({ error: "user_id and title are required" }, 400);

  const ref = payload.ref ? String(payload.ref) : null;
  const category = payload.category ? String(payload.category) : null;
  const kind = payload.kind ? String(payload.kind) : null;

  let status = "failed";
  let detail: string | null = null;
  let devices = 0;
  let sent = 0;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        apikey: SERVICE_ROLE_KEY,
      },
      body: JSON.stringify({
        user_id: userId,
        title,
        body: payload.body ?? "",
        url: payload.url ?? "/",
        kind: kind ?? undefined,
        tag: payload.tag ?? undefined,
        call_id: payload.call_id ?? undefined,
        category: category ?? undefined,
      }),
    });
    const out = await resp.json().catch(() => ({} as Record<string, unknown>));
    devices = Number((out as any)?.devices || 0);
    sent = Number((out as any)?.sent || 0);

    if (!resp.ok) {
      status = "failed";
      detail = `HTTP ${resp.status}: ${JSON.stringify(out).slice(0, 300)}`;
    } else if (sent > 0) {
      status = "sent";
    } else if (devices === 0) {
      status = "no_device";
      detail = "no registered device for this user";
    } else {
      status = "failed";
      detail = JSON.stringify((out as any)?.errors || out).slice(0, 300);
    }
  } catch (e) {
    detail = String(e).slice(0, 300);
  }

  await supabase.from("push_delivery_log").insert({
    user_id: userId,
    category,
    kind,
    title: title.slice(0, 200),
    status,
    devices,
    sent,
    detail,
    ref,
  });

  console.log(
    `[notify-user] user=${userId} kind=${kind ?? "-"} status=${status} devices=${devices} sent=${sent} detail=${detail ?? "-"}`,
  );

  return json({ status, devices, sent, detail });
});
