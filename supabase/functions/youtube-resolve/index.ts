// Resolve the most likely YouTube video for a physiotherapy exercise.
// Scrapes the YouTube search results page (no API key needed) and picks the
// best candidate by title relevance + duration window. Caches results.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Candidate {
  videoId: string;
  title: string;
  durationSeconds: number;
  channel: string;
}

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function parseDuration(text: string): number {
  // YouTube returns "lengthText.simpleText" like "1:23" or "12:05" or "1:02:03"
  const parts = text.split(":").map((p) => parseInt(p, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

async function searchYouTube(query: string): Promise<Candidate[]> {
  const url = `https://www.youtube.com/results?search_query=${
    encodeURIComponent(query)
  }&gl=BR&hl=pt-BR`;
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
  if (!m) return [];
  let data: any;
  try {
    data = JSON.parse(m[1]);
  } catch {
    return [];
  }

  const candidates: Candidate[] = [];
  const sections = data?.contents?.twoColumnSearchResultsRenderer
    ?.primaryContents?.sectionListRenderer?.contents ?? [];
  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents ?? [];
    for (const it of items) {
      const v = it?.videoRenderer;
      if (!v?.videoId) continue;
      const title = v.title?.runs?.[0]?.text ?? "";
      const durationText = v.lengthText?.simpleText ?? "";
      const channel = v.ownerText?.runs?.[0]?.text ?? "";
      const dur = parseDuration(durationText);
      if (!title || !dur) continue;
      candidates.push({
        videoId: v.videoId,
        title,
        durationSeconds: dur,
        channel,
      });
      if (candidates.length >= 25) break;
    }
    if (candidates.length >= 25) break;
  }
  return candidates;
}

function scoreCandidate(c: Candidate, nameTokens: string[]): number {
  const title = stripAccents(c.title);
  const channel = stripAccents(c.channel);
  let score = 0;

  // Title token matches — heavily weighted; require core words to appear
  let coreMatches = 0;
  for (const tok of nameTokens) {
    if (tok.length < 3) continue;
    if (title.includes(tok)) {
      score += 15;
      coreMatches++;
    }
  }
  // Strong bonus when most of the exercise name tokens appear
  if (nameTokens.length > 0 && coreMatches / nameTokens.length >= 0.6) score += 25;

  // Physio context bonus
  const physioTerms = [
    "fisioterap",
    "exercicio",
    "exerc\u00edcio",
    "reabilita",
    "como fazer",
    "execu",
    "tutorial",
    "passo a passo",
  ];
  for (const t of physioTerms) {
    if (title.includes(t) || channel.includes(t)) score += 4;
  }

  // Duration sweet spot for demo videos: 30s - 6min
  if (c.durationSeconds >= 30 && c.durationSeconds <= 360) score += 8;
  else if (c.durationSeconds <= 600) score += 3;
  else score -= 4;

  // Penalize very long content (lectures / lives)
  if (c.durationSeconds > 1500) score -= 10;

  // Slight bonus for shorts-ish but not too short
  if (c.durationSeconds < 20) score -= 5;

  return score;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const name: string = (body?.name || "").toString().trim();
    const category: string = (body?.category || "").toString();
    const bodyRegion: string = (body?.bodyRegion || "").toString();

    if (!name) {
      return new Response(
        JSON.stringify({ error: "name is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const queryKey = stripAccents(`${name}|${bodyRegion}|${category}`).replace(
      /\s+/g,
      " ",
    ).trim();

    // Check cache
    const { data: cached } = await supabase
      .from("youtube_video_cache")
      .select("video_id, title, duration_seconds")
      .eq("query_key", queryKey)
      .maybeSingle();

    if (cached?.video_id) {
      return new Response(
        JSON.stringify({
          videoId: cached.video_id,
          title: cached.title,
          durationSeconds: cached.duration_seconds,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Build query with physio context
    const cleanName = stripAccents(name).replace(/\(.*?\)/g, " ").replace(
      /[^\w\s\-]/g,
      " ",
    ).replace(/\s+/g, " ").trim();
    const regionMap: Record<string, string> = {
      lumbar: "lombar",
      cervical: "cervical",
      thoracic: "toracica",
      shoulder: "ombro",
      elbow: "cotovelo",
      wrist: "punho",
      hip: "quadril",
      knee: "joelho",
      ankle: "tornozelo",
      foot: "pe",
      core: "core",
      spine: "coluna",
    };
    const regionTerm = regionMap[bodyRegion?.toLowerCase()] || "";
    const query = `${cleanName} ${regionTerm} fisioterapia exercicio execucao`
      .replace(/\s+/g, " ").trim();

    const candidates = await searchYouTube(query);
    if (candidates.length === 0) {
      return new Response(
        JSON.stringify({ error: "no_results", query }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const nameTokens = cleanName.split(/\s+/).filter(Boolean);
    const scored = candidates
      .map((c) => ({ c, s: scoreCandidate(c, nameTokens) }))
      .sort((a, b) => b.s - a.s);
    const best = scored[0].c;

    // Verify the chosen video is embeddable via oEmbed; if not, walk the list.
    let chosen: Candidate | null = null;
    for (const { c } of scored.slice(0, 5)) {
      try {
        const oe = await fetch(
          `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${c.videoId}&format=json`,
        );
        if (oe.ok) {
          chosen = c;
          break;
        }
      } catch {
        /* ignore */
      }
    }
    if (!chosen) chosen = best;

    // Save cache
    await supabase.from("youtube_video_cache").upsert({
      query_key: queryKey,
      video_id: chosen.videoId,
      title: chosen.title,
      duration_seconds: chosen.durationSeconds,
    }, { onConflict: "query_key" });

    return new Response(
      JSON.stringify({
        videoId: chosen.videoId,
        title: chosen.title,
        durationSeconds: chosen.durationSeconds,
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e?.message || e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
