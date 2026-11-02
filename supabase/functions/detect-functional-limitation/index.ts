// Detects whether a free-text note describes a relevant functional
// limitation tied to one of the low-pain regions the user already marked.
// Returns a list of region IDs (subset of painRegions) for which we should
// add an extra prioritized questionnaire.
import { requireUserOrAssessment } from "../_shared/caller-auth.ts";


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


  try {
    const { note, painRegions = [], painScoresPerRegion = {}, language = "pt", assessmentId } = await req.json();
    const __gate = await requireUserOrAssessment(req, corsHeaders, assessmentId);
    if (__gate instanceof Response) return __gate;
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

    // Regra local determinística (sem IA, sem créditos): a nota precisa citar
    // impacto funcional claro; escolhe a região de baixa dor com maior nota.
    const norm = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const FUNCTIONAL = [
      "trabalh", "servico", "emprego", "afast", "atestado", "dormir", "sono", "acordo", "acorda",
      "esporte", "treino", "treinar", "correr", "corrida", "academia", "jogar", "pedal",
      "caminhar", "andar", "subir escada", "descer escada", "carregar", "levantar", "agach",
      "vestir", "banho", "dirigir", "cozinhar", "limpar", "nao consigo", "dificuldade", "impede", "limita", "atrapalha",
      "work", "job", "sleep", "sport", "running", "walk", "stairs", "lift", "carry", "dress", "drive", "can't", "cannot", "unable", "difficult", "prevents", "limits",
    ];
    const hasFunctional = FUNCTIONAL.some((k) => norm.includes(k));
    const regions = hasFunctional
      ? [...lowPainRegions].sort((a, b) => Number(painScoresPerRegion?.[b] ?? 0) - Number(painScoresPerRegion?.[a] ?? 0)).slice(0, 1)
      : [];

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
