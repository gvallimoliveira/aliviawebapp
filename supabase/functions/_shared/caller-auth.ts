// Shared caller verification for edge functions.
// - requireUser: a real signed-in session (the public key alone is rejected).
// - requireUserOrAssessment: signed-in user, OR an anonymous patient filling a
//   recent assessment link, proven by the assessment id (same capability the
//   database policies use via the x-assessment-id header).
// - isInternalCall: scheduled jobs / server-to-server (internal secret or service key).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ANON_WINDOW_MS = 48 * 60 * 60 * 1000;

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

function bearer(req: Request): string {
  return (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
}

export function isInternalCall(req: Request): boolean {
  const secret = Deno.env.get("INTERNAL_ALERT_SECRET") || "";
  const internal = (req.headers.get("x-internal-secret") || "").trim();
  if (secret && internal === secret) return true;
  const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  return !!svc && bearer(req) === svc;
}

export async function getAuthUserId(req: Request): Promise<string | null> {
  const token = bearer(req);
  if (!token) return null;
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (token === anon || token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return null;
  try {
    const { data, error } = await serviceClient().auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/** True when the id is an anonymous (user_id IS NULL) assessment created in the last 48h. */
export async function isOpenAnonAssessment(assessmentId: unknown): Promise<boolean> {
  if (typeof assessmentId !== "string" || !UUID_RE.test(assessmentId)) return false;
  const { data } = await serviceClient()
    .from("assessments")
    .select("id, user_id, created_at")
    .eq("id", assessmentId)
    .maybeSingle();
  if (!data || data.user_id) return false;
  return Date.now() - new Date(data.created_at).getTime() < ANON_WINDOW_MS;
}

/** Can this signed-in user see the assessment under normal access rules? */
export async function userCanAccessAssessment(req: Request, assessmentId: string): Promise<boolean> {
  if (!UUID_RE.test(assessmentId)) return false;
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") || "" } },
    auth: { persistSession: false },
  });
  const { data } = await client.from("assessments").select("id").eq("id", assessmentId).maybeSingle();
  return !!data;
}

function unauthorized(cors: Record<string, string>) {
  return new Response(JSON.stringify({ error: "Autenticação necessária." }), {
    status: 401,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

export async function requireUser(req: Request, cors: Record<string, string>): Promise<{ userId: string } | Response> {
  const userId = await getAuthUserId(req);
  return userId ? { userId } : unauthorized(cors);
}

export async function requireUserOrAssessment(
  req: Request,
  cors: Record<string, string>,
  assessmentId: unknown,
): Promise<{ userId: string | null; anonAssessment: boolean } | Response> {
  const userId = await getAuthUserId(req);
  if (userId) return { userId, anonAssessment: false };
  if (await isOpenAnonAssessment(assessmentId)) return { userId: null, anonAssessment: true };
  return unauthorized(cors);
}

export async function requireAdmin(req: Request, cors: Record<string, string>): Promise<{ userId: string } | Response> {
  const userId = await getAuthUserId(req);
  if (!userId) return unauthorized(cors);
  const { data } = await serviceClient().rpc("is_admin", { _user_id: userId });
  if (data === true) return { userId };
  return new Response(JSON.stringify({ error: "Acesso restrito." }), {
    status: 403,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const ALLOWED_ORIGINS = [
  "https://aliviawebapp.com.br",
  "https://www.aliviawebapp.com.br",
  "https://aliviawebapp.lovable.app",
];
const DEFAULT_ORIGIN = "https://aliviawebapp.com.br";

/** Only return-to origins we own; anything else falls back to the main site. */
export function safeOrigin(candidate: string | null | undefined): string {
  if (!candidate) return DEFAULT_ORIGIN;
  try {
    const u = new URL(candidate);
    const o = u.origin;
    if (ALLOWED_ORIGINS.includes(o)) return o;
    if (u.protocol === "https:" && /\.lovable\.app$/.test(u.hostname) && u.hostname.includes("9a266497-f7cd-4496-81f6-84dc1ea4edfb")) return o;
    if (u.protocol === "https:" && /^[a-z0-9-]+--9a266497-f7cd-4496-81f6-84dc1ea4edfb\.lovable\.app$/.test(u.hostname)) return o;
    if (u.hostname === "localhost") return o;
  } catch { /* invalid */ }
  return DEFAULT_ORIGIN;
}
