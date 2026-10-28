import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/caller-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const __gate = await requireUser(req, corsHeaders);
    if (__gate instanceof Response) return __gate;
    const creditDecision = await canaryCredits(req, "parse-schedule-image");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Cache: identical screenshot → identical extraction (30d).
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
    const cachePayload = { imageBase64, mimeType: mimeType || "" };
    if (admin) {
      const cached = await getCachedAiResponse<{ appointments: unknown[] }>(admin, "parse-schedule-image", cachePayload);
      if (cached) {
        return new Response(JSON.stringify({ ...cached, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const systemPrompt = `You are a schedule parser. Given a screenshot of a scheduling/calendar app, extract all visible appointments.

Return a JSON array of appointments. Each appointment must have:
- "patient_name": string (the patient or event name)
- "date": string in YYYY-MM-DD format
- "time": string in HH:MM format (24h)
- "end_time": string HH:MM (24h) | null — the end time when visible (e.g. "08:00 - 17:00" → "17:00"), or derived from the block's visual height
- "duration_minutes": number (end minus start when end is known; otherwise estimate, default 50). All-day events or courses can last many hours.
- "type": "in_person" | "video_call" | "external" (infer from context)
- "notes": string | null (any extra info visible)
- "is_patient": boolean (false for personal commitments, meetings, lunch, blocks, courses; true when it looks like a patient session)

Rules:
- If year is not visible, assume current year (2026)
- If duration is not visible, default to 50 minutes
- Parse all appointments visible in the image, in ANY layout: week/day grid, month view, or list/agenda ("schedule") view such as Google Calendar mobile, where a day label (e.g. "QUA. 21") appears at the left and every colored block below it belongs to that day until the next day label. The month name appears in the header (e.g. "outubro" = October).
- Each colored block usually has a title line (name) and a time line "HH:MM – HH:MM".
- Keep names exactly as written (including "?" or extra words) in patient_name.
- Return ONLY the JSON array, no other text
- If no appointments found, return an empty array []`;

    const { callAiWithFallback } = await import("../_shared/ai-fallback.ts");
    const buildBody = () => ({
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: `data:${mimeType || "image/png"};base64,${imageBase64}` } },
            { type: "text", text: "Extract all appointments from this schedule screenshot. Return only the JSON array." },
          ],
        },
      ],
    });

    const parseAppointments = (content: string): unknown[] => {
      const cleaned = (content || "").replace(/```(?:json)?/gi, "").trim();
      try {
        const v = JSON.parse(cleaned);
        if (Array.isArray(v)) return v;
        if (v && Array.isArray(v.appointments)) return v.appointments;
      } catch { /* fall through */ }
      const match = cleaned.match(/\[[\s\S]*\]/);
      if (match) {
        try { const v = JSON.parse(match[0]); if (Array.isArray(v)) return v; } catch {
          console.error("Failed to parse extracted JSON:", match[0].slice(0, 500));
        }
      }
      return [];
    };

    // Thinking models can exhaust a small output budget and return empty content;
    // use a generous cap and retry once when nothing comes back.
    const chains = [["google/gemini-3.8-flash"], ["google/gemini-3.8-flash"]];
    let appointments: unknown[] = [];
    let response: Response | null = null;
    for (const models of chains) {
      response = await callAiWithFallback(LOVABLE_API_KEY, buildBody(), models, {
        functionName: "parse-schedule-image",
        maxTokens: 12000,
      });
      if (!response.ok) break;
      const data = await response.json();
      const choice = data.choices?.[0];
      appointments = parseAppointments(choice?.message?.content || "");
      if (appointments.length > 0) break;
      console.warn("parse-schedule-image empty result", models[0], choice?.finish_reason);
    }

    if (response && !response.ok) {
      const status = response.status;
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      const msg = status === 429 ? "Rate limit exceeded. Please try again in a moment."
        : status === 402 ? "AI credits exhausted. Add funds in Settings > Workspace > Usage."
        : "AI processing error";
      return new Response(JSON.stringify({ error: msg }), {
        status: status === 429 || status === 402 ? status : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (admin && Array.isArray(appointments) && appointments.length > 0) {
      await setCachedAiResponse(admin, "parse-schedule-image", cachePayload, { appointments }, 30 * 24 * 3600);
    }

    return new Response(JSON.stringify({ appointments }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-schedule-image error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
