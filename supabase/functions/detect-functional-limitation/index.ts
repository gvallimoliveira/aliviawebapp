// Detects whether a free-text note describes a relevant functional
// limitation tied to one of the low-pain regions the user already marked.
// Returns a list of region IDs (subset of painRegions) for which we should
// add an extra prioritized questionnaire.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { canaryCredits, creditBlockResponse } from "../_shared/ai-credits.ts";
import { getCachedAiResponse, setCachedAiResponse } from "../_shared/ai-cache.ts";


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function extractJson(text: string): any {
  try { return JSON.parse(text); } catch {}
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1]); } catch {} }
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) {
    const slice = text.slice(first, last + 1);
    try { return JSON.parse(slice); } catch {}
    try { return JSON.parse(slice.replace(/,\s*([}\]])/g, "$1")); } catch {}
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ regions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const creditDecision = await canaryCredits(req, "detect-functional-limitation");
    const quotaBlock = creditBlockResponse(creditDecision, corsHeaders);
    if (quotaBlock) return quotaBlock;
    const { note, painRegions = [], painScoresPerRegion = {}, language = "pt" } = await req.json();
    const text = (note || "").toString().trim();
    if (!text || !Array.isArray(painRegions) || painRegions.length === 0) {
      return new Response(JSON.stringify({ regions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only consider regions with low pain score (<5) as candidates for the
    // "low pain but functionally limiting" exception.
    const lowPainRegions: string[] = painRegions.filter((r: string) => {
      const s = Number(painScoresPerRegion?.[r] ?? 0);
      return s > 0 && s < 5;
    });
    if (lowPainRegions.length === 0) {
      return new Response(JSON.stringify({ regions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sysPt = `Você é um classificador clínico. O paciente já marcou regiões de dor com nota baixa (<5/10). Analise se a nota descreve LIMITAÇÃO FUNCIONAL RELEVANTE (impacto em trabalho, sono, esporte, atividades diárias) em alguma dessas regiões de baixa dor. Responda APENAS JSON: {"regions": ["region_id", ...]}. Devolva no máximo 1 região, somente se houver evidência clara. Se não houver, devolva [].`;
    const sysEn = `You are a clinical classifier. The patient marked low-pain regions (<5/10). Decide if the note describes RELEVANT FUNCTIONAL LIMITATION (impact on work, sleep, sport, daily activities) on any of those low-pain regions. Reply ONLY JSON: {"regions": ["region_id", ...]}. Return at most 1 region, only if evidence is clear. Otherwise [].`;
    const isPt = language === "pt";
    const userMsg = JSON.stringify({
      note: text,
      low_pain_region_candidates: lowPainRegions,
      pain_scores: painScoresPerRegion,
    });

    // Cache: same note + same candidates → same answer (7d).
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;
    const cachePayload = { note: text, lowPainRegions, language: isPt ? "pt" : "en" };
    if (admin) {
      const cached = await getCachedAiResponse<{ regions: string[] }>(admin, "detect-functional-limitation", cachePayload);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {

      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        max_tokens: 400,
        messages: [
          { role: "system", content: isPt ? sysPt : sysEn },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!aiResp.ok) {
      console.error("detect-functional-limitation AI error", aiResp.status, await aiResp.text());
      return new Response(JSON.stringify({ regions: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const content = data?.choices?.[0]?.message?.content || "";
    const parsed = extractJson(content);
    const raw: string[] = Array.isArray(parsed?.regions) ? parsed.regions : [];
    const regions = raw.filter((r) => typeof r === "string" && lowPainRegions.includes(r)).slice(0, 1);

    if (admin) {
      await setCachedAiResponse(admin, "detect-functional-limitation", cachePayload, { regions }, 7 * 24 * 3600);
    }

    return new Response(JSON.stringify({ regions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("detect-functional-limitation error:", err);
    return new Response(JSON.stringify({ regions: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
