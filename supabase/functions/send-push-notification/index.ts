import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Ensure a base64url string has proper padding for Deno's stricter decoder.
 */
function ensureBase64urlPadding(str: string): string {
  const cleaned = str.trim();
  const pad = (4 - (cleaned.length % 4)) % 4;
  return cleaned + "=".repeat(pad);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const vapidPublicKeyRaw = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKeyRaw = Deno.env.get("VAPID_PRIVATE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    if (!vapidPublicKeyRaw || !vapidPrivateKeyRaw) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Trim whitespace/newlines that may sneak in from env vars
    const vapidPublicKey = vapidPublicKeyRaw.trim();
    const vapidPrivateKey = vapidPrivateKeyRaw.trim();

    // Authorization: accept service-role, authenticated user, or anon key (for assessment notifications)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    const apikeyHeader = req.headers.get("apikey") || "";

    if (!token && !apikeyHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isServiceRole = token === serviceRoleKey;
    // The client always sends the project anon key in `apikey`, including
    // authenticated requests. Do not let that header erase the user's JWT.
    const hasUserToken = Boolean(token && token !== anonKey && token !== serviceRoleKey);
    const isAnonKey = !hasUserToken && (token === anonKey || apikeyHeader === anonKey);
    let callerUserId: string | null = null;

    if (hasUserToken) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !userData?.user) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      callerUserId = userData.user.id;
    }

    // Set VAPID details — wrap in try/catch for diagnostics
    try {
      webpush.setVapidDetails(
        "mailto:contato@aliviawebapp.com.br",
        vapidPublicKey,
        vapidPrivateKey
      );
    } catch (vapidErr: any) {
      console.error("[Push] VAPID setup failed:", vapidErr?.message, "pubKey length:", vapidPublicKey.length, "privKey length:", vapidPrivateKey.length);
      return new Response(
        JSON.stringify({ error: "VAPID key configuration error", details: vapidErr?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const reqBody = await req.json();
    let { user_id, clinic_id, conversation_id, email, title, body, url, kind, tag, call_id, category } = reqBody;
    const appointmentRequestId = reqBody.appointment_request_id ? String(reqBody.appointment_request_id) : null;

    // Appointment requests: recipients and copy are resolved here from the
    // request row; the caller is validated (patient on create, staff on approve).
    let preAuthorizedTargets: string[] | null = null;

    // Assessment-link alerts (patient without login, or any non-service caller
    // using assessment_id): recipients and text come only from the assessment
    // row, never from the request, so nobody can impersonate the clinic.
    const assessmentRef = reqBody.assessment_id ? String(reqBody.assessment_id) : null;
    if (!isServiceRole && (isAnonKey || assessmentRef)) {
      const deny = (msg: string, status = 403) => new Response(JSON.stringify({ error: msg }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!assessmentRef || !/^[0-9a-f-]{36}$/i.test(assessmentRef)) return deny("assessment_id required", 401);
      const { data: asmt } = await supabase.from("assessments")
        .select("id, user_id, clinic_id, professional_id, patient_name, created_at")
        .eq("id", assessmentRef).maybeSingle();
      const fresh = asmt && Date.now() - new Date(asmt.created_at).getTime() < 48 * 3600 * 1000;
      if (!asmt || !fresh || (asmt.user_id && asmt.user_id !== callerUserId)) return deny("Forbidden");
      const targets: string[] = [];
      if (asmt.clinic_id) {
        const { data: members } = await supabase.from("clinic_members").select("user_id")
          .eq("clinic_id", asmt.clinic_id).eq("status", "active").in("role", ["owner", "secretary"]);
        for (const m of members || []) if (m.user_id) targets.push(m.user_id);
      } else if (asmt.professional_id) {
        const { data: p } = await supabase.from("professionals").select("user_id").eq("id", asmt.professional_id).maybeSingle();
        if (p?.user_id) targets.push(p.user_id);
      }
      const who = String(asmt.patient_name || "Paciente").slice(0, 80);
      const isRedFlag = reqBody.kind === "red_flag" || reqBody.category === "red_flags";
      title = isRedFlag ? "🚨 Red flag detectada" : "📋 Nova avaliação recebida";
      body = isRedFlag ? `${who} ativou sinais de alerta na avaliação.` : `${who} respondeu o link de avaliação.`;
      url = `/assessment/view/${asmt.id}`;
      tag = `${isRedFlag ? "redflag" : "assessment"}-${asmt.id}`;
      category = isRedFlag ? "red_flags" : "assessments";
      user_id = undefined; clinic_id = undefined; email = undefined; conversation_id = undefined;
      preAuthorizedTargets = targets;
    }
    const announcementId = reqBody.announcement_id ? String(reqBody.announcement_id) : null;
    if (announcementId) {
      if (!callerUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: an } = await supabase.from("patient_announcements").select("*").eq("id", announcementId).maybeSingle();
      if (!an) {
        return new Response(JSON.stringify({ error: "Not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: allowed } = await supabase.rpc("can_handle_appointment_request", {
        _user_id: callerUserId, _clinic_id: an.clinic_id, _professional_id: an.professional_id,
      });
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: ids } = await supabase.rpc("announcement_recipient_ids", { _announcement_id: an.id });
      preAuthorizedTargets = [...new Set(((ids as any[]) || []).map((r) => r.user_id).filter(Boolean))];
      title = `📢 ${an.title}`;
      body = String(an.body).slice(0, 140);
      url = "/dashboard?tab=notices";
      tag = `notice-${an.id}`;
      user_id = undefined; clinic_id = undefined; conversation_id = undefined; email = undefined; category = undefined;
      if (preAuthorizedTargets.length === 0) {
        return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }
    if (appointmentRequestId) {
      if (!callerUserId) {
        return new Response(JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: ar } = await supabase.from("appointment_requests").select("*").eq("id", appointmentRequestId).maybeSingle();
      if (!ar) {
        return new Response(JSON.stringify({ error: "Request not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const fmtDate = (d: string) => d.split("-").reverse().join("/");
      if (ar.status === "pending" && ar.patient_user_id === callerUserId) {
        const targets = new Set<string>();
        if (ar.clinic_id) {
          const { data: members } = await supabase.from("clinic_members").select("user_id")
            .eq("clinic_id", ar.clinic_id).eq("status", "active").in("role", ["owner", "admin", "secretary"]);
          (members || []).forEach((m: any) => m.user_id && targets.add(m.user_id));
        } else if (ar.professional_id) {
          const { data: p } = await supabase.from("professionals").select("user_id").eq("id", ar.professional_id).maybeSingle();
          if (p?.user_id) targets.add(p.user_id);
        }
        preAuthorizedTargets = [...targets];
        title = "📅 Nova solicitação de agendamento";
        body = `${ar.patient_name} pediu horário para ${fmtDate(ar.requested_date)}${ar.requested_time ? ` às ${ar.requested_time}` : ""}.`;
        url = "/dashboard?tab=agenda";
        tag = `apt-req-${ar.id}`;
      } else if (ar.status === "approved" && ar.decided_by === callerUserId && ar.appointment_id) {
        const { data: apt } = await supabase.from("professional_appointments")
          .select("appointment_date, appointment_time").eq("id", ar.appointment_id).maybeSingle();
        preAuthorizedTargets = [ar.patient_user_id];
        title = "✅ Agendamento confirmado";
        body = apt ? `Sua sessão em ${fmtDate(apt.appointment_date)} às ${String(apt.appointment_time).slice(0, 5)} foi confirmada.` : "Seu agendamento foi confirmado.";
        url = "/dashboard?tab=appointments";
        tag = `apt-req-${ar.id}`;
      } else {
        return new Response(JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      user_id = undefined; clinic_id = undefined; conversation_id = undefined; email = undefined; category = undefined;
    }

    if (!title || (!preAuthorizedTargets && !user_id && !clinic_id && !conversation_id && !email)) {
      return new Response(
        JSON.stringify({ error: "title and (user_id, clinic_id, conversation_id or email) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve recipient user_ids
    let targetUserIds: string[] = preAuthorizedTargets ? [...preAuthorizedTargets] : [];
    if (user_id) targetUserIds.push(user_id);

    // Video calls and chat alerts should not depend on a client-side query to
    // discover the recipient. Resolve the counterpart here with service-level
    // reads, while still requiring the authenticated caller to be a participant.
    if (conversation_id) {
      if (!callerUserId && !isServiceRole) {
        return new Response(
          JSON.stringify({ error: "Authenticated user required for conversation notifications" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .select("patient_user_id, professional_id, recipient_user_id")
        .eq("id", String(conversation_id))
        .maybeSingle();

      if (conversationError || !conversation) {
        return new Response(
          JSON.stringify({ error: "Conversation not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      let professionalUserId: string | null = null;
      if (conversation.professional_id) {
        const { data: professional } = await supabase
          .from("professionals")
          .select("user_id")
          .eq("id", conversation.professional_id)
          .maybeSingle();
        professionalUserId = professional?.user_id || null;
      }

      const participants = new Set(
        [conversation.patient_user_id, conversation.recipient_user_id, professionalUserId].filter(Boolean),
      );
      if (!isServiceRole && (!callerUserId || !participants.has(callerUserId))) {
        return new Response(
          JSON.stringify({ error: "Forbidden: caller is not a conversation participant" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const counterpart = callerUserId
        ? [conversation.patient_user_id, conversation.recipient_user_id, professionalUserId]
            .find((id) => id && id !== callerUserId)
        : null;
      if (counterpart && !targetUserIds.includes(counterpart)) targetUserIds.push(counterpart);
    }

    if (email && (isServiceRole || isAnonKey)) {
      const { data: u } = await supabase.auth.admin.listUsers();
      const match = u?.users?.find((x: any) => (x.email || "").toLowerCase() === String(email).toLowerCase());
      if (match?.id && !targetUserIds.includes(match.id)) targetUserIds.push(match.id);
    }

    if (clinic_id) {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("user_id, role, status")
        .eq("clinic_id", clinic_id)
        .eq("status", "active")
        .in("role", ["owner", "secretary"]);
      for (const m of members || []) {
        if (m.user_id && !targetUserIds.includes(m.user_id)) targetUserIds.push(m.user_id);
      }
    }

    // Non-service-role, non-anon callers may target themselves OR any user who
    // shares a conversation with them (chat messages / video calls). Anything
    // else is rejected.
    if (preAuthorizedTargets) {
      if (targetUserIds.length === 0) {
        return new Response(JSON.stringify({ message: "No recipients", sent: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    } else if (!isServiceRole && !isAnonKey) {
      const others = targetUserIds.filter((uid) => uid !== callerUserId);
      const allowed = new Set(targetUserIds.filter((uid) => uid === callerUserId));

      if (others.length > 0 && callerUserId) {
        // Resolve the caller's professional profile (if any) so both sides of a
        // conversation can be matched.
        const { data: callerPro } = await supabase
          .from("professionals")
          .select("id")
          .eq("user_id", callerUserId)
          .maybeSingle();

        // Conversations where the caller is the patient side
        const { data: asPatient } = await supabase
          .from("conversations")
          .select("id, patient_user_id, professional_id, recipient_user_id")
          .eq("patient_user_id", callerUserId);

        // Conversations where the caller is the professional / recipient side
        const orFilters = [`recipient_user_id.eq.${callerUserId}`];
        if (callerPro?.id) orFilters.push(`professional_id.eq.${callerPro.id}`);
        const { data: asPro } = await supabase
          .from("conversations")
          .select("id, patient_user_id, professional_id, recipient_user_id")
          .or(orFilters.join(","));

        const convs = [...(asPatient || []), ...(asPro || [])];
        const proIds = Array.from(
          new Set(convs.map((c: any) => c.professional_id).filter(Boolean)),
        );
        let proUserIds: string[] = [];
        if (proIds.length > 0) {
          const { data: pros } = await supabase
            .from("professionals")
            .select("user_id")
            .in("id", proIds);
          proUserIds = (pros || []).map((p: any) => p.user_id).filter(Boolean);
        }

        const counterparts = new Set<string>([
          ...convs.map((c: any) => c.patient_user_id).filter(Boolean),
          ...convs.map((c: any) => c.recipient_user_id).filter(Boolean),
          ...proUserIds,
        ]);
        counterparts.delete(callerUserId);

        for (const uid of others) if (counterparts.has(uid)) allowed.add(uid);
      }

      targetUserIds = targetUserIds.filter((uid) => allowed.has(uid));
      if (targetUserIds.length === 0) {
        return new Response(
          JSON.stringify({ error: "Forbidden: cannot send notifications to other users" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }


    // Per-user category preferences (defaults to opted-in when no row exists).
    const VALID_CATEGORIES = [
      "assessments",
      "messages",
      "red_flags",
      "questionnaires",
      "load_alerts",
      "billing",
      "care_plan",
      "my_assessment",
      "payments",
    ];
    const cat = category ? String(category) : null;
    if (cat && VALID_CATEGORIES.includes(cat) && targetUserIds.length > 0) {
      const { data: prefs } = await supabase
        .from("notification_preferences")
        .select(`user_id, ${cat}`)
        .in("user_id", targetUserIds);
      const optedOut = new Set(
        (prefs || []).filter((p: any) => p[cat] === false).map((p: any) => p.user_id),
      );
      targetUserIds = targetUserIds.filter((uid) => !optedOut.has(uid));
      if (targetUserIds.length === 0) {
        return new Response(
          JSON.stringify({ message: "All recipients opted out of this category", sent: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }


    const safeTitle = String(title).slice(0, 200);
    const safeBody = body ? String(body).slice(0, 500) : "";
    const safeUrl = url ? String(url).slice(0, 500) : "/";
    const safeKind = kind ? String(kind).slice(0, 40) : undefined;
    const safeTag = tag ? String(tag).slice(0, 120) : undefined;
    const safeCallId = call_id ? String(call_id).slice(0, 80) : undefined;

    const { data: subscriptions, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    if (error || !subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push subscriptions found", sent: 0, devices: 0, targets: targetUserIds.length }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: safeTitle,
      body: safeBody,
      url: safeUrl,
      kind: safeKind,
      tag: safeTag,
      call_id: safeCallId,
    });
    let sent = 0;
    const errors: string[] = [];
    const expiredEndpoints: string[] = [];

    for (const sub of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        await webpush.sendNotification(pushSubscription, payload, {
          // Incoming calls are time-sensitive. Apple Web Push may otherwise
          // defer delivery while the installed PWA is backgrounded.
          TTL: safeKind === "video-call" ? 120 : 86_400,
          urgency: safeKind === "video-call" ? "high" : "normal",
          topic: safeTag ? safeTag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32) : undefined,
        });
        sent++;
        await supabase
          .from("push_subscriptions")
          .update({ last_used_at: new Date().toISOString(), last_success_at: new Date().toISOString() })
          .eq("id", sub.id);
        console.log(`[Push] Sent to ${sub.endpoint.slice(0, 60)}...`);
      } catch (e: any) {
        const statusCode = e?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(sub.endpoint);
          console.log(`[Push] Subscription expired, removing: ${sub.endpoint.slice(0, 60)}...`);
        } else {
          const detail = `${e?.message || e} | status=${statusCode} | body=${String(e?.body || "").slice(0, 200)} | headers=${JSON.stringify(e?.headers || {}).slice(0, 200)}`;
          errors.push(`Failed (${statusCode}): ${detail}`);
          console.error(`[Push] Error for ${sub.endpoint.slice(0, 60)}:`, detail);
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString(), last_failure_at: new Date().toISOString() })
            .eq("id", sub.id);
        }
      }
    }

    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({ sent, devices: subscriptions.length, cleaned: expiredEndpoints.length, errors }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Push] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
