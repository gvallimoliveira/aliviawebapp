// Monthly audit of the exercise library videos.
// Checks every YouTube link via oEmbed: dead links are flagged (and the
// resolver cache purged), and titles that no longer match the exercise name
// are flagged as "mismatch" for manual review. Admin gets a summary alert.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_ALERT_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const log = (step: string, details?: unknown) =>
  console.log(
    `[exercise-video-audit] ${step}`,
    details ? JSON.stringify(details) : "",
  );

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const STOP_WORDS = new Set([
  "com",
  "sem",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "em",
  "no",
  "na",
  "para",
  "por",
  "e",
  "a",
  "o",
  "os",
  "as",
  "the",
  "with",
]);

function extractVideoId(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/,
  );
  return m ? m[1] : null;
}

function tokens(name: string): string[] {
  return stripAccents(name)
    .replace(/\(.*?\)/g, " ")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !STOP_WORDS.has(t));
}

/** 0..1 share of meaningful exercise-name tokens present in the video title */
function titleMatch(name: string, title: string): number {
  const toks = tokens(name);
  if (toks.length === 0) return 1;
  const t = stripAccents(title);
  const hits = toks.filter((tok) => t.includes(tok.slice(0, 6))).length;
  return hits / toks.length;
}

type OEmbed = { ok: boolean; title?: string; author?: string };

async function checkVideo(videoId: string): Promise<OEmbed> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
    );
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, title: data?.title ?? "", author: data?.author_name ?? "" };
  } catch {
    return { ok: false };
  }
}

async function notifyAdmin(payload: Record<string, unknown>) {
  if (!INTERNAL_SECRET) return;
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SECRET,
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    log("notify_failed", String(e));
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth: internal cron secret OR an admin JWT
  let source = "cron";
  const secret = req.headers.get("x-internal-secret") || "";
  if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const uid = userData?.user?.id;
    let admin = false;
    if (uid) {
      const { data } = await supabase.rpc("is_admin", { _user_id: uid });
      admin = data === true;
    }
    if (!admin) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    source = "manual";
  }

  const { data: run } = await supabase
    .from("exercise_video_audit_runs")
    .insert({ source })
    .select("id")
    .single();
  const runId = run?.id as string | undefined;

  try {
    const { data: exercises, error } = await supabase
      .from("exercise_library")
      .select("id, name_pt, video_url")
      .not("video_url", "is", null);
    if (error) throw error;

    const issues: Array<Record<string, unknown>> = [];
    let ok = 0;
    let broken = 0;
    let mismatch = 0;
    const deadIds: string[] = [];

    const list = exercises ?? [];
    const BATCH = 6;
    for (let i = 0; i < list.length; i += BATCH) {
      const slice = list.slice(i, i + BATCH);
      await Promise.all(slice.map(async (ex: any) => {
        const videoId = extractVideoId(ex.video_url || "");
        if (!videoId) {
          broken++;
          issues.push({
            id: ex.id,
            name: ex.name_pt,
            url: ex.video_url,
            status: "invalid_url",
          });
          await supabase.from("exercise_library").update({
            video_status: "broken",
            video_checked_at: new Date().toISOString(),
            video_check_note: "URL do YouTube inválida",
          }).eq("id", ex.id);
          return;
        }

        const res = await checkVideo(videoId);
        const now = new Date().toISOString();

        if (!res.ok) {
          broken++;
          deadIds.push(videoId);
          issues.push({
            id: ex.id,
            name: ex.name_pt,
            url: ex.video_url,
            status: "broken",
          });
          await supabase.from("exercise_library").update({
            video_status: "broken",
            video_checked_at: now,
            video_check_note: "Vídeo indisponível no YouTube",
          }).eq("id", ex.id);
          return;
        }

        const score = titleMatch(ex.name_pt || "", res.title || "");
        if (score < 0.34) {
          mismatch++;
          issues.push({
            id: ex.id,
            name: ex.name_pt,
            url: ex.video_url,
            status: "mismatch",
            video_title: res.title,
            channel: res.author,
            score: Number(score.toFixed(2)),
          });
          await supabase.from("exercise_library").update({
            video_status: "mismatch",
            video_checked_at: now,
            video_check_note: `Título do vídeo diverge: "${res.title}"`,
          }).eq("id", ex.id);
          return;
        }

        ok++;
        await supabase.from("exercise_library").update({
          video_status: "ok",
          video_checked_at: now,
          video_check_note: res.title ?? null,
        }).eq("id", ex.id);
      }));
    }

    // Purge resolver cache entries pointing at dead videos
    if (deadIds.length > 0) {
      await supabase.from("youtube_video_cache").delete().in(
        "video_id",
        deadIds,
      );
    }

    // Also audit the resolver cache itself (links served to patients)
    const { data: cached } = await supabase
      .from("youtube_video_cache")
      .select("id, video_id, query_key");
    let cacheRemoved = 0;
    const cacheList = cached ?? [];
    for (let i = 0; i < cacheList.length; i += BATCH) {
      const slice = cacheList.slice(i, i + BATCH);
      const results = await Promise.all(
        slice.map(async (c: any) => ({ c, res: await checkVideo(c.video_id) })),
      );
      const dead = results.filter((r) => !r.res.ok).map((r) => r.c.id);
      if (dead.length > 0) {
        await supabase.from("youtube_video_cache").delete().in("id", dead);
        cacheRemoved += dead.length;
        for (const r of results.filter((r) => !r.res.ok)) {
          issues.push({
            status: "cache_broken",
            query_key: r.c.query_key,
            video_id: r.c.video_id,
          });
        }
      }
    }

    const summary = {
      checked_count: list.length,
      ok_count: ok,
      broken_count: broken,
      mismatch_count: mismatch,
      fixed_count: cacheRemoved,
      issues,
      finished_at: new Date().toISOString(),
    };

    if (runId) {
      await supabase.from("exercise_video_audit_runs").update(summary).eq(
        "id",
        runId,
      );
    }

    log("done", {
      checked: list.length,
      ok,
      broken,
      mismatch,
      cacheRemoved,
    });

    if (broken > 0 || mismatch > 0) {
      await notifyAdmin({
        event_type: "exercise_video_audit",
        title: `Auditoria de vídeos: ${broken} quebrados, ${mismatch} divergentes`,
        body: issues.slice(0, 15).map((i: any) =>
          `• ${i.name || i.query_key} — ${i.status}`
        ).join("\n"),
        fields: {
          Verificados: list.length,
          OK: ok,
          Quebrados: broken,
          Divergentes: mismatch,
          "Cache limpo": cacheRemoved,
          Origem: source,
        },
        ref: runId,
      });
    }

    return new Response(JSON.stringify({ run_id: runId, ...summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = String((e as Error)?.message || e);
    log("error", message);
    if (runId) {
      await supabase.from("exercise_video_audit_runs").update({
        error: message,
        finished_at: new Date().toISOString(),
      }).eq("id", runId);
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
