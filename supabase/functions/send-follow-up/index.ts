import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { isInternalCall } from "../_shared/caller-auth.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Scheduled job only: reject anything without the internal secret / service key.
  if (!isInternalCall(req)) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { "Content-Type": "application/json" } });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch pending follow-ups that are due
    const { data: pendingEmails, error: fetchError } = await supabase
      .from("follow_up_emails")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .limit(50);

    if (fetchError) throw fetchError;
    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(JSON.stringify({ message: "No pending emails", count: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const followUp of pendingEmails) {
      try {
        // Fetch assessment data
        const { data: assessment } = await supabase
          .from("assessments")
          .select("pain_regions, diagnosis, treatment_plan")
          .eq("id", followUp.assessment_id)
          .single();

        // Fetch user profile for name and language
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, preferred_language")
          .eq("user_id", followUp.user_id)
          .single();

        const userName = profile?.full_name || "";
        const lang = profile?.preferred_language || "pt";
        const hypothesis = assessment?.diagnosis?.hypothesis || "";
        const painRegions = (assessment?.pain_regions || []).join(", ");
        const weekNumber = followUp.week_number;

        // Determine which phase the user should be in
        const phaseMap: Record<number, string> = {
          1: "short_term (acute phase)",
          2: "short_term (acute phase)",
          4: "medium_term (strengthening phase)",
          6: "long_term (maintenance phase)",
        };
        const currentPhase = phaseMap[weekNumber] || "general";

        // Generate personalized email content via Lovable AI
        const aiPrompt = lang === "pt"
          ? `Gere um email curto e motivacional de acompanhamento para um paciente em reabilitação musculoesquelética.
Nome: ${userName}
Semana: ${weekNumber} do tratamento
Diagnóstico: ${hypothesis}
Regiões de dor: ${painRegions}
Fase atual: ${currentPhase}

O email deve:
- Cumprimentar pelo nome
- Perguntar como está se sentindo
- Lembrar brevemente dos exercícios da fase atual
- Motivar a continuar o tratamento
- Ser acolhedor e profissional
- Ter no máximo 200 palavras
- NÃO incluir assunto/subject, apenas o corpo do email em HTML simples`
          : `Generate a short motivational follow-up email for a musculoskeletal rehabilitation patient.
Name: ${userName}
Week: ${weekNumber} of treatment
Diagnosis: ${hypothesis}
Pain regions: ${painRegions}
Current phase: ${currentPhase}

The email should:
- Greet by name
- Ask how they're feeling
- Briefly remind about current phase exercises
- Motivate to continue treatment
- Be warm and professional
- Max 200 words
- Do NOT include subject line, only the email body in simple HTML`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a professional physiotherapy assistant writing follow-up emails." },
              { role: "user", content: aiPrompt },
            ],
          }),
        });

        if (!aiResponse.ok) {
          console.error("AI gateway error:", aiResponse.status);
          throw new Error("AI gateway error");
        }

        const aiData = await aiResponse.json();
        const emailBody = aiData.choices?.[0]?.message?.content || "";

        const subject = lang === "pt"
          ? `Aliv.iA — Semana ${weekNumber}: Como você está?`
          : `Aliv.iA — Week ${weekNumber}: How are you feeling?`;

        const appUrl = "https://id-preview--9a266497-f7cd-4496-81f6-84dc1ea4edfb.lovable.app/dashboard";

        const htmlContent = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #ffffff;">
  <div style="text-align: center; margin-bottom: 24px;">
    <h2 style="color: #1a1a2e; margin: 0;">Aliv.iA</h2>
  </div>
  <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
    ${emailBody}
  </div>
  <div style="text-align: center; margin-bottom: 24px;">
    <a href="${appUrl}" style="display: inline-block; background: #6366f1; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${lang === "pt" ? "Acessar meu painel" : "Go to my dashboard"}
    </a>
  </div>
  <p style="text-align: center; font-size: 12px; color: #999;">
    ${lang === "pt" ? "Você recebeu este email porque optou por receber lembretes de acompanhamento no Aliv.iA." : "You received this email because you opted in to follow-up reminders on Aliv.iA."}
  </p>
</body>
</html>`;

        // Send via Resend
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Aliv.iA <onboarding@resend.dev>",
            to: [followUp.email],
            subject,
            html: htmlContent,
          }),
        });

        if (!resendResponse.ok) {
          const errText = await resendResponse.text();
          console.error("Resend error:", errText);
          throw new Error(`Resend error: ${resendResponse.status}`);
        }

        // Mark as sent
        await supabase
          .from("follow_up_emails")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", followUp.id);

        sentCount++;
      } catch (emailError) {
        console.error(`Failed to send follow-up ${followUp.id}:`, emailError);
        await supabase
          .from("follow_up_emails")
          .update({ status: "failed" })
          .eq("id", followUp.id);
        failedCount++;
      }
    }

    return new Response(
      JSON.stringify({ message: "Follow-up processing complete", sent: sentCount, failed: failedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("send-follow-up error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
