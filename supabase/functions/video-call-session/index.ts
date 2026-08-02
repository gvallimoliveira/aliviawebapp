import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const StartSchema = z.object({
  action: z.literal("start"),
  call_id: z.string().uuid(),
  conversation_id: z.string().uuid(),
  caller_name: z.string().trim().min(1).max(120),
});

const UpdateSchema = z.object({
  action: z.literal("update"),
  call_id: z.string().uuid(),
  status: z.enum(["accepted", "connecting", "connected", "rejected", "missed", "ended", "failed"]),
  failure_reason: z.string().trim().max(300).optional(),
});

const SignalSchema = z.object({
  action: z.literal("signal"),
  call_id: z.string().uuid(),
  kind: z.enum(["offer", "answer"]),
  sdp: z.string().min(1).max(250_000),
});

const PendingSchema = z.object({ action: z.literal("pending") });
const BodySchema = z.discriminatedUnion("action", [StartSchema, UpdateSchema, SignalSchema, PendingSchema]);
const TERMINAL_STATUSES = new Set(["rejected", "missed", "ended", "failed"]);
const STATUS_ORDER: Record<string, number> = {
  ringing: 0,
  accepted: 1,
  connecting: 2,
  connected: 3,
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anonKey || !serviceKey) return json({ error: "Backend configuration unavailable" }, 500);

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(url, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    const user = authData?.user;
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);

    const admin = createClient(url, serviceKey);
    const body = parsed.data;

    if (body.action === "pending") {
      const now = new Date().toISOString();
      await admin
        .from("video_call_sessions")
        .update({ status: "missed", ended_at: now, failure_reason: "expired" })
        .eq("recipient_user_id", user.id)
        .eq("status", "ringing")
        .lte("expires_at", now);

      const { data, error } = await admin
        .from("video_call_sessions")
        .select("*")
        .eq("recipient_user_id", user.id)
        .eq("status", "ringing")
        .gt("expires_at", now)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      return json({ call: data || null });
    }

    if (body.action === "update" || body.action === "signal") {
      const { data: current, error: readError } = await admin
        .from("video_call_sessions")
        .select("*")
        .eq("id", body.call_id)
        .maybeSingle();
      if (readError || !current) return json({ error: "Call not found" }, 404);
      if (current.caller_user_id !== user.id && current.recipient_user_id !== user.id) return json({ error: "Forbidden" }, 403);

      if (body.action === "signal") {
        const isCallerOffer = body.kind === "offer" && current.caller_user_id === user.id;
        const isRecipientAnswer = body.kind === "answer" && current.recipient_user_id === user.id;
        if (!isCallerOffer && !isRecipientAnswer) return json({ error: "Invalid signaling role" }, 403);
        if (TERMINAL_STATUSES.has(current.status)) return json({ error: "Call is no longer active" }, 409);

        const signalPatch = body.kind === "offer"
          ? { offer_sdp: body.sdp, ...(current.status === "connected" ? {} : { status: "connecting" }) }
          : { answer_sdp: body.sdp, ...(current.status === "connected" ? {} : { status: "connecting" }) };
        const { data, error } = await admin
          .from("video_call_sessions")
          .update(signalPatch)
          .eq("id", body.call_id)
          .select()
          .single();
        if (error) return json({ error: error.message }, 500);
        return json({ call: data });
      }

      const recipientOnly = new Set(["accepted", "rejected"]);
      if (recipientOnly.has(body.status) && current.recipient_user_id !== user.id) return json({ error: "Recipient action required" }, 403);
      if (TERMINAL_STATUSES.has(current.status)) {
        return body.status === current.status
          ? json({ call: current })
          : json({ error: "Call is no longer active" }, 409);
      }
      const currentOrder = STATUS_ORDER[current.status];
      const nextOrder = STATUS_ORDER[body.status];
      if (nextOrder !== undefined && currentOrder !== undefined && nextOrder < currentOrder) {
        console.log(`[VideoCallSession] ignored state regression call=${current.id} ${current.status}->${body.status}`);
        return json({ call: current });
      }
      const patch: Record<string, unknown> = { status: body.status };
      if (body.status === "accepted" && !current.accepted_at) patch.accepted_at = new Date().toISOString();
      if (body.status === "connected" && !current.connected_at) patch.connected_at = new Date().toISOString();
      if (TERMINAL_STATUSES.has(body.status)) {
        patch.ended_at = new Date().toISOString();
        patch.offer_sdp = null;
        patch.answer_sdp = null;
      }
      if (body.failure_reason) patch.failure_reason = body.failure_reason;

      const { data, error } = await admin.from("video_call_sessions").update(patch).eq("id", body.call_id).select().single();
      if (error) return json({ error: error.message }, 500);
      return json({ call: data });
    }

    const { data: conversation, error: conversationError } = await admin
      .from("conversations")
      .select("patient_user_id, recipient_user_id, professional_id")
      .eq("id", body.conversation_id)
      .maybeSingle();
    if (conversationError || !conversation) return json({ error: "Conversation not found" }, 404);

    let professionalUserId: string | null = null;
    if (conversation.professional_id) {
      const { data: professional } = await admin.from("professionals").select("user_id").eq("id", conversation.professional_id).maybeSingle();
      professionalUserId = professional?.user_id || null;
    }
    const participants = [conversation.patient_user_id, conversation.recipient_user_id, professionalUserId].filter(Boolean) as string[];
    if (!participants.includes(user.id)) return json({ error: "Forbidden" }, 403);
    const recipientUserId = participants.find((id) => id !== user.id);
    if (!recipientUserId) return json({ error: "No recipient found" }, 422);

    // Give the recipient enough time to open the app from the push notification.
    const expiresAt = new Date(Date.now() + 90_000).toISOString();
    const { data: call, error: createError } = await admin
      .from("video_call_sessions")
      .insert({
        id: body.call_id,
        conversation_id: body.conversation_id,
        caller_user_id: user.id,
        recipient_user_id: recipientUserId,
        caller_name: body.caller_name,
        // The push notification is fired by the database trigger
        // `trg_push_video_call_ringing` (same proven internal path used by
        // assessment alerts), so the invitation is durable even if this
        // function's response never reaches the caller.
        status: "ringing",
        expires_at: expiresAt,
      })
      .select()
      .single();
    if (createError || !call) return json({ error: createError?.message || "Unable to create call" }, 500);

    console.log(`[VideoCallSession] call=${call.id} caller=${user.id} recipient=${recipientUserId} (push via db trigger)`);
    return json({ call });

  } catch (error) {
    console.error("[VideoCallSession] Unexpected error", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});