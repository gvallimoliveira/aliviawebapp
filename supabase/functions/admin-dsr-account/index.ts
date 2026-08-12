import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Not authenticated" }, 401);
    const caller = userData.user;

    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.id });
    if (!isAdmin) return json({ error: "Acesso restrito a administradores." }, 403);

    const body = await req.json().catch(() => ({}));
    const action: string = body?.action ?? "inspect";
    const userId: string | undefined = body?.user_id;
    const requestId: string | undefined = body?.request_id;
    const reason: string | undefined = body?.reason;
    if (!userId) return json({ error: "user_id é obrigatório" }, 400);

    // ---- Auth account origin
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const au: any = authUser?.user ?? null;
    const email: string | null = au?.email ?? null;

    const account = au
      ? {
          email,
          created_at: au.created_at,
          last_sign_in_at: au.last_sign_in_at,
          email_confirmed_at: au.email_confirmed_at ?? au.confirmed_at ?? null,
          phone: au.phone || null,
          providers: au.app_metadata?.providers ?? (au.app_metadata?.provider ? [au.app_metadata.provider] : []),
          full_name: au.user_metadata?.full_name ?? au.user_metadata?.name ?? null,
          banned: !!au.banned_until,
        }
      : null;

    // ---- App-side classification
    const [profileRes, proRes, memberRes, grantedRes, patientRes, assessmentRes] = await Promise.all([
      admin.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("professionals").select("*").eq("user_id", userId).maybeSingle(),
      admin.from("clinic_members").select("id, clinic_id, role, status").eq("user_id", userId),
      email ? admin.from("granted_premium_users").select("*").ilike("email", email) : Promise.resolve({ data: [] }),
      email ? admin.from("patients").select("id, professional_id, clinic_id").ilike("email", email) : Promise.resolve({ data: [] }),
      admin.from("assessments").select("id, status, created_at, professional_id, clinic_id").eq("user_id", userId),
    ]);

    const profile: any = profileRes?.data ?? null;
    const pro: any = proRes?.data ?? null;
    const members: any[] = (memberRes as any)?.data ?? [];
    const assessments: any[] = (assessmentRes as any)?.data ?? [];

    const isStudent = !!pro && (pro.is_student || pro.student_access || pro.account_type === "student");
    const accountType = pro
      ? isStudent
        ? "student"
        : "professional"
      : members.length > 0
        ? "clinic_staff"
        : "patient";

    const classification = {
      account_type: accountType,
      signup_origin: profile?.signup_origin ?? null,
      occupation: profile?.occupation ?? null,
      preferred_language: profile?.preferred_language ?? null,
      has_professional_record: !!pro,
      professional_approved: pro?.approved ?? null,
      professional_crefito: pro?.crefito ?? null,
      subscription_status: pro?.subscription_status ?? null,
      subscription_stripe_id: pro?.subscription_stripe_id ?? null,
      clinic_memberships: members,
      granted_premium: ((grantedRes as any)?.data ?? []).length > 0,
      assessments_total: assessments.length,
      assessments_completed: assessments.filter((a) => a.status === "completed").length,
      assessments_via_professional: assessments.filter((a) => a.professional_id || a.clinic_id).length,
      patient_records_as_email: ((patientRes as any)?.data ?? []).length,
      first_activity: assessments.length
        ? assessments.map((a) => a.created_at).sort()[0]
        : (profile?.created_at ?? null),
    };

    if (action === "inspect") {
      const { data: inventory, error: invErr } = await admin.rpc("admin_user_data_inventory", {
        _user_id: userId,
        _email: email,
      });
      if (invErr) return json({ error: invErr.message }, 400);
      return json({ account, classification, inventory: inventory ?? [] });
    }

    if (action === "purge") {
      if (!reason || reason.trim().length < 5) {
        return json({ error: "Informe o motivo/justificativa da exclusão." }, 400);
      }

      const { data: report, error: purgeErr } = await admin.rpc("admin_purge_user_data", {
        _user_id: userId,
        _email: email,
      });
      if (purgeErr) return json({ error: purgeErr.message }, 400);

      // Delete the login itself
      const { error: delErr } = await admin.auth.admin.deleteUser(userId);

      // Audit trail on the DSR record (kept on purpose as legal proof)
      if (requestId) {
        const { data: current } = await admin
          .from("data_subject_requests")
          .select("details")
          .eq("id", requestId)
          .maybeSingle();
        const stamp = new Date().toISOString();
        const line =
          `[Exclusão executada ${stamp} por ${caller.email}] motivo: ${reason.trim()} · ` +
          `conta ${email ?? userId} ${delErr ? `(login NÃO removido: ${delErr.message})` : "(login removido)"} · ` +
          `dados apagados: ${JSON.stringify((report as any)?.deleted ?? {})}`;
        await admin
          .from("data_subject_requests")
          .update({
            status: "completed",
            handled_at: stamp,
            handled_by: caller.id,
            details: `${current?.details ? current.details + "\n\n" : ""}${line}`,
          })
          .eq("id", requestId);
      }

      return json({
        ok: true,
        auth_user_deleted: !delErr,
        auth_error: delErr?.message ?? null,
        report,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
