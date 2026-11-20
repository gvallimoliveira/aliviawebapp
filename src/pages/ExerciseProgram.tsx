import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Dumbbell, Play, Clock, ChevronDown, ChevronUp, Globe, ArrowLeft } from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";
import ClinicBrandHeader, { type ClinicLinkBranding } from "@/components/ClinicBrandHeader";
import { clinicAssessmentTheme } from "@/lib/clinicAssessmentTheme";

interface ExerciseItem {
  id: string;
  sets: string;
  reps: string;
  frequency: string;
  observations: string | null;
  sort_order: number;
  custom_name: string | null;
  custom_video_url: string | null;
  exercise: {
    name_pt: string;
    name_en: string;
    name_es: string;
    description_pt: string;
    description_en: string;
    description_es: string;
    body_region: string;
    category: string;
    video_url: string | null;
    difficulty: string;
  } | null;
}

interface Program {
  id: string;
  patient_name: string;
  notes: string | null;
  created_at: string;
  expires_at: string;
  professional: {
    full_name: string;
    logo_url: string | null;
    clinic_name: string | null;
    is_student?: boolean | null;
    active_profile_mode?: string | null;
    student_institution?: string | null;
    student_period?: string | null;
  };
}

const categoryLabels: Record<string, Record<string, string>> = {
  strengthening: { pt: "Fortalecimento", en: "Strengthening", es: "Fortalecimiento" },
  stretching: { pt: "Alongamento", en: "Stretching", es: "Estiramiento" },
  mobility: { pt: "Mobilidade", en: "Mobility", es: "Movilidad" },
  proprioception: { pt: "Propriocepção", en: "Proprioception", es: "Propiocepción" },
};

const difficultyLabels: Record<string, Record<string, string>> = {
  beginner: { pt: "Iniciante", en: "Beginner", es: "Principiante" },
  intermediate: { pt: "Intermediário", en: "Intermediate", es: "Intermedio" },
  advanced: { pt: "Avançado", en: "Advanced", es: "Avanzado" },
};

const ExerciseProgram = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [branding, setBranding] = useState<ClinicLinkBranding | null>(null);
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [expired, setExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  // Per-item resolved video override (when the original is broken/blocked).
  // Key = item.id, value = { videoId, title } or null while loading, false if failed.
  const [resolvedVideos, setResolvedVideos] = useState<Record<string, { videoId: string; title?: string } | false | "loading">>({});

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      // DEMO mode — load a sample shoulder progression directly from the local
      // template + exercise_library, without creating a real program row.
      if (token === "demo-shoulder") {
        const { HEP_TEMPLATES } = await import("@/data/hepTemplates");
        const tpl = HEP_TEMPLATES.find((t) => t.id === "shoulder-progression-v1");
        if (!tpl) { setNotFound(true); setLoading(false); return; }
        const ids = tpl.items.map((it) => it.exerciseId);
        const { data: libs } = await (supabase as any)
          .from("exercise_library")
          .select("id, name_pt, name_en, name_es, description_pt, description_en, description_es, body_region, category, video_url, difficulty")
          .in("id", ids);
        const libMap = new Map<string, any>((libs || []).map((l: any) => [l.id, l]));
        const demoItems: ExerciseItem[] = tpl.items.map((it, idx) => ({
          id: `demo-${idx}`,
          sets: it.sets,
          reps: it.reps,
          frequency: it.frequency,
          observations: [it.stage, it.observations].filter(Boolean).join(" — ") || null,
          sort_order: idx,
          custom_name: null,
          custom_video_url: null,
          exercise: libMap.get(it.exerciseId) || null,
        }));
        setProgram({
          id: "demo-shoulder",
          patient_name: language === "pt" ? "Paciente Demo" : language === "es" ? "Paciente Demo" : "Demo Patient",
          notes: language === "pt" ? tpl.notes_pt : tpl.notes_en,
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          professional: { full_name: "Dr. Demo (Aliv.iA)", logo_url: null, clinic_name: null },
        });
        setItems(demoItems);
        setLoading(false);
        return;
      }

      const { data: progData, error } = await (supabase as any).rpc("get_exercise_program_by_token", { _token: token });
      const prog: any = progData;

      if (error || !prog) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (new Date(prog.expires_at) < new Date()) {
        setExpired(true);
        setLoading(false);
        return;
      }

      // The public (anon) link can't read `professionals` directly via RLS,
      // so fall back to a security-definer RPC scoped to this token.
      let resolved = prog;
      if (!prog.professional?.full_name) {
        const { data: proRows } = await (supabase as any).rpc("get_hep_professional", { _token: token });
        const pro = Array.isArray(proRows) ? proRows[0] : proRows;
        if (pro) resolved = { ...prog, professional: pro };
      }

      setProgram(resolved);
      const { data: clinicBranding } = await (supabase as any).rpc("get_hep_clinic_branding", { _token: token });
      setBranding(clinicBranding);

      setItems(prog.items || []);
      setLoading(false);
    };
    load();
  }, [token, language]);


  // Extract YouTube video ID from any common URL format
  const extractVideoId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    const m = url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  };

  // For each item, validate the original video via oEmbed; if it fails or is
  // missing, ask our edge function for the most likely replacement and cache
  // the result in component state. This way the patient always sees a working
  // embedded video instead of a generic search link.
  useEffect(() => {
    if (!items.length) return;
    let cancelled = false;

    const resolveItem = async (item: ExerciseItem) => {
      const isCustom = !item.exercise;
      const itemName = isCustom ? (item.custom_name || "Exercício") : (item.exercise!.name_pt || "");
      const originalUrl = isCustom ? item.custom_video_url : item.exercise?.video_url;
      const originalId = extractVideoId(originalUrl);

      // 1. Try the original
      if (originalId) {
        try {
          const oe = await fetch(
            `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${originalId}&format=json`,
            { method: "GET" }
          );
          if (oe.ok) return; // original works, nothing to do
        } catch { /* fall through to resolver */ }
      }

      // 2. Ask our resolver
      if (cancelled) return;
      setResolvedVideos((prev) => ({ ...prev, [item.id]: "loading" }));
      try {
        const { data, error } = await supabase.functions.invoke("youtube-resolve", {
          body: {
            name: itemName,
            category: item.exercise?.category || "",
            bodyRegion: item.exercise?.body_region || "",
          },
        });
        if (cancelled) return;
        if (error || !data?.videoId) {
          setResolvedVideos((prev) => ({ ...prev, [item.id]: false }));
          return;
        }
        setResolvedVideos((prev) => ({
          ...prev,
          [item.id]: { videoId: data.videoId, title: data.title },
        }));
      } catch {
        if (!cancelled) setResolvedVideos((prev) => ({ ...prev, [item.id]: false }));
      }
    };

    // Validate sequentially-ish in small batches to be gentle
    (async () => {
      for (const item of items) {
        if (cancelled) return;
        await resolveItem(item);
      }
    })();

    return () => { cancelled = true; };
  }, [items]);


  const getName = (ex: any) => language === "en" ? (ex.name_en || ex.name_pt) : language === "es" ? (ex.name_es || ex.name_pt) : ex.name_pt;
  const getDesc = (ex: any) => language === "en" ? (ex.description_en || ex.description_pt) : language === "es" ? (ex.description_es || ex.description_pt) : ex.description_pt;

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    // Use youtube-nocookie domain + params that maximize embed availability across regions
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?rel=0&modestbranding=1&playsinline=1` : null;
  };

  // Normalize accents/punctuation and expand common physiotherapy terms so the
  // YouTube search returns the correct exercise demonstration regardless of
  // how the exercise was named in the library.
  const buildYouTubeQuery = (name: string, category?: string, bodyRegion?: string) => {
    const stripAccents = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cleanName = stripAccents(name)
      .replace(/\(.*?\)/g, " ")        // drop parenthetical alt names
      .replace(/[^\w\s\-/]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    // Synonym / disambiguation map (keyword -> extra terms appended to query)
    const synonyms: Record<string, string> = {
      // Spine regions
      "lombar": "coluna lombar low back",
      "cervical": "coluna cervical pescoço neck",
      "toracica": "coluna torácica thoracic",
      "chin tuck": "retração cervical cervical",
      "gato vaca": "cat cow mobilidade coluna",
      "bird dog": "estabilização lombar core",
      "ponte": "glute bridge glúteo lombar",
      "hiperextensao": "extensão lombar banco romano",
      // Hip / glute
      "concha": "clamshell glúteo médio quadril",
      "clamshell": "glúteo médio quadril",
      "piriforme": "alongamento piriforme quadril",
      "abdução de quadril": "glúteo médio quadril",
      // Knee / leg
      "agachamento": "squat membros inferiores",
      "afundo": "lunge avanço membros inferiores",
      "lunge": "afundo membros inferiores",
      "bulgaro": "split squat búlgaro membros inferiores",
      "stiff": "stiff levantamento terra romeno posterior coxa",
      "leg press": "leg press quadriceps",
      "cadeira extensora": "extensão de joelho quadríceps",
      "cadeira flexora": "flexão de joelho posterior coxa",
      // Shoulder / upper limb
      "pendular": "Codman ombro mobilização",
      "rotação externa": "rotador externo manguito rotador ombro",
      "face pull": "ombro posterior manguito rotador",
      "codman": "pendular ombro mobilização",
      "puxada": "lat pulldown dorsal",
      "remada": "rowing dorsal",
      // Foot / ankle
      "short foot": "arco plantar pé exercício",
      "dorsiflexao": "tornozelo dorsiflexão mobilidade",
      "panturrilha": "calf raise tríceps sural",
      "alfabeto": "mobilidade tornozelo",
      // Generic stretching / strengthening cues
      "alongamento": "stretching alongamento",
      "mobilização": "mobilidade articular",
      "propriocepcao": "equilíbrio propriocepção",
    };

    // Region anchors based on bodyRegion column (e.g., "lumbar", "knee", "shoulder")
    const regionMap: Record<string, string> = {
      lumbar: "lombar coluna",
      cervical: "cervical pescoço",
      thoracic: "torácica coluna",
      shoulder: "ombro",
      elbow: "cotovelo",
      wrist: "punho",
      hip: "quadril",
      knee: "joelho",
      ankle: "tornozelo pé",
      foot: "pé",
      core: "core abdômen",
    };

    const categoryMap: Record<string, string> = {
      strengthening: "fortalecimento",
      stretching: "alongamento",
      mobility: "mobilidade",
      proprioception: "propriocepção equilíbrio",
    };

    const extras: string[] = [];
    for (const [keyword, expansion] of Object.entries(synonyms)) {
      if (cleanName.includes(keyword)) extras.push(expansion);
    }
    if (bodyRegion && regionMap[bodyRegion.toLowerCase()]) extras.push(regionMap[bodyRegion.toLowerCase()]);
    if (category && categoryMap[category.toLowerCase()]) extras.push(categoryMap[category.toLowerCase()]);

    // Always anchor with physio context + execution cue, dedupe tokens.
    const baseAnchors = "fisioterapia exercicio execução correta";
    const raw = `${cleanName} ${extras.join(" ")} ${baseAnchors}`;
    const seen = new Set<string>();
    const dedup = raw
      .split(/\s+/)
      .filter((tok) => {
        const k = tok.toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      })
      .join(" ");

    return dedup;
  };

  const getYouTubeSearchUrl = (name: string, category?: string, bodyRegion?: string) => {
    const query = buildYouTubeQuery(name, category, bodyRegion);
    // gl=BR + hl=pt-BR aumenta a chance de vídeos em português/Brasil aparecerem primeiro
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&gl=BR&hl=pt-BR`;
  };

  const t = (key: string) => {
    const map: Record<string, Record<string, string>> = {
      title: { pt: "Programa de Exercícios", en: "Exercise Program", es: "Programa de Ejercicios" },
      prepared_by: { pt: "Preparado por", en: "Prepared by", es: "Preparado por" },
      not_found: { pt: "Programa não encontrado", en: "Program not found", es: "Programa no encontrado" },
      expired: { pt: "Este programa expirou", en: "This program has expired", es: "Este programa ha expirado" },
      expired_desc: { pt: "Entre em contato com seu profissional para um novo programa.", en: "Contact your professional for a new program.", es: "Contacte a su profesional para un nuevo programa." },
      notes: { pt: "Observações", en: "Notes", es: "Observaciones" },
      sets: { pt: "Séries", en: "Sets", es: "Series" },
      reps: { pt: "Repetições", en: "Reps", es: "Repeticiones" },
      freq: { pt: "Frequência", en: "Frequency", es: "Frecuencia" },
      watch_video: { pt: "Ver vídeo", en: "Watch video", es: "Ver video" },
      hide_video: { pt: "Ocultar vídeo", en: "Hide video", es: "Ocultar video" },
      search_youtube: { pt: "Buscar no YouTube", en: "Search on YouTube", es: "Buscar en YouTube" },
      video_unavailable: { pt: "Vídeo indisponível? Buscar alternativa", en: "Video unavailable? Search alternative", es: "¿Video no disponible? Buscar alternativa" },
    };
    return map[key]?.[language] || map[key]?.pt || key;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || expired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center space-y-4">
            <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold text-foreground">{expired ? t("expired") : t("not_found")}</h2>
            {expired && <p className="text-sm text-muted-foreground">{t("expired_desc")}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Group items by category
  const grouped = items.reduce<Record<string, ExerciseItem[]>>((acc, item) => {
    const cat = item.exercise?.category || "custom";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background" style={clinicAssessmentTheme(branding?.clinic_brand_color)}>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {window.history.length > 1 && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {branding?.clinic_name ? <ClinicBrandHeader {...branding} compact /> : program?.professional?.logo_url ? (
              <img src={program.professional.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
            )}
            {!branding?.clinic_name && <span className="text-sm font-semibold text-foreground truncate">
              {program?.professional?.full_name || program?.professional?.clinic_name || "Aliv.iA"}
            </span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="gap-1.5 text-xs"
              title={language === "pt" ? "Ir para Aliv.iA" : language === "es" ? "Ir a Aliv.iA" : "Go to Aliv.iA"}
            >
              {language === "pt" ? "Aliv.iA" : "Aliv.iA"}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-lg py-6 px-4 space-y-5">
        {branding?.clinic_name && program?.professional?.full_name && <p className="text-xs text-muted-foreground">{language === "pt" ? "Fisioterapeuta responsável" : language === "es" ? "Fisioterapeuta responsable" : "Responsible physiotherapist"}: {program.professional.full_name}</p>}
        {(program?.professional?.active_profile_mode ?? (program?.professional?.is_student ? "student" : "professional")) === "student" && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            <p className="font-semibold">
              {language === "pt" ? "Aliv.iA Acadêmico" : language === "es" ? "Aliv.iA Académico" : "Aliv.iA Academic"}
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {language === "pt"
                ? `Programa elaborado por ${program.professional.full_name}, estudante de fisioterapia${program.professional.student_institution ? ` (${program.professional.student_institution}` + (program.professional.student_period ? ` · ${program.professional.student_period})` : ")") : ""}.`
                : language === "es"
                ? `Programa elaborado por ${program.professional.full_name}, estudiante de fisioterapia${program.professional.student_institution ? ` (${program.professional.student_institution})` : ""}.`
                : `Program prepared by ${program.professional.full_name}, physiotherapy student${program.professional.student_institution ? ` (${program.professional.student_institution})` : ""}.`}
            </p>
            <p className="text-xs font-medium mt-2 border-t border-amber-500/20 pt-2">
              {language === "pt"
                ? "Documento de caráter acadêmico — sem valor profissional. Se necessário, busque orientação de um fisioterapeuta formado e habilitado."
                : language === "es"
                ? "Documento de carácter académico — sin valor profesional. Si es necesario, busque orientación de un fisioterapeuta formado y habilitado."
                : "Academic document — no professional value. If needed, seek guidance from a qualified physiotherapist."}
            </p>
          </div>
        )}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 mx-auto">
            <Dumbbell className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
          {program?.patient_name && (
            <p className="text-lg font-semibold text-foreground">{program.patient_name}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("prepared_by")} <span className="font-medium">{program?.professional?.full_name}</span>
          </p>
        </div>

        {program?.notes && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3 px-4">
              <p className="text-xs font-semibold text-foreground mb-1">{t("notes")}</p>
              <p className="text-sm text-muted-foreground leading-relaxed">{program.notes}</p>
            </CardContent>
          </Card>
        )}

        {Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              {category === "custom"
                ? (language === "en" ? "Custom Exercises" : language === "es" ? "Ejercicios Personalizados" : "Exercícios Personalizados")
                : (categoryLabels[category]?.[language] || category)}
            </h2>
            {catItems.map((item) => {
              const isCustom = !item.exercise;
              const itemName = isCustom ? (item.custom_name || "Exercício") : getName(item.exercise!);
              const videoUrl = isCustom ? item.custom_video_url : item.exercise?.video_url;
              const originalEmbed = videoUrl ? getYouTubeEmbedUrl(videoUrl) : null;

              // Pick resolved fallback (auto-selected best YouTube match) when set
              const resolved = resolvedVideos[item.id];
              const isLoadingResolved = resolved === "loading";
              const resolvedFailed = resolved === false;
              const resolvedVideo = resolved && typeof resolved === "object" ? resolved : null;
              const resolvedEmbed = resolvedVideo
                ? `https://www.youtube-nocookie.com/embed/${resolvedVideo.videoId}?rel=0&modestbranding=1&playsinline=1`
                : null;

              // Effective embed: prefer auto-resolved (means original was broken),
              // otherwise the original. Hide entirely if resolver said "no_results".
              const embedUrl = resolvedEmbed || (!resolvedFailed && !isLoadingResolved ? originalEmbed : null);
              const isAutoResolved = !!resolvedEmbed;
              const isExpanded = expandedVideo === item.id;

              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="py-3 px-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{itemName}</p>
                        {!isCustom && (
                          <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{getDesc(item.exercise!)}</p>
                        )}
                      </div>
                      {!isCustom && item.exercise?.difficulty && (
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {difficultyLabels[item.exercise.difficulty]?.[language] || item.exercise.difficulty}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="bg-muted px-2 py-1 rounded font-medium">{t("sets")}: {item.sets}</span>
                      <span className="bg-muted px-2 py-1 rounded font-medium">{t("reps")}: {item.reps}</span>
                      <span className="bg-muted px-2 py-1 rounded font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {item.frequency}
                      </span>
                    </div>

                    {item.observations && (
                      <p className="text-xs text-muted-foreground italic">💡 {item.observations}</p>
                    )}

                    {embedUrl ? (
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-xs text-primary p-0 h-auto"
                            onClick={() => setExpandedVideo(isExpanded ? null : item.id)}
                          >
                            {isExpanded ? <ChevronUp className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                            {isExpanded ? t("hide_video") : t("watch_video")}
                          </Button>
                          {isAutoResolved && (
                            <span className="text-[10px] text-muted-foreground italic">
                              {language === "en" ? "auto-selected" : language === "es" ? "auto-seleccionado" : "selecionado automaticamente"}
                            </span>
                          )}
                        </div>
                        {isExpanded && (
                          <div className="mt-2 aspect-video rounded-lg overflow-hidden bg-muted">
                            <iframe
                              src={embedUrl}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              referrerPolicy="strict-origin-when-cross-origin"
                              title={resolvedVideo?.title || itemName}
                            />
                          </div>
                        )}
                      </div>
                    ) : isLoadingResolved ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {language === "en" ? "Finding the best video…" : language === "es" ? "Buscando el mejor video…" : "Buscando o melhor vídeo…"}
                      </div>
                    ) : (
                      <a
                        href={getYouTubeSearchUrl(itemName, item.exercise?.category, item.exercise?.body_region)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <Play className="h-3 w-3" /> {t("search_youtube")}
                      </a>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}

        <div className="text-center pt-4">
          <p className="text-[10px] text-muted-foreground">
            Powered by <span className="font-semibold">Aliv.iA</span>
          </p>
        </div>
      </main>
    </div>
  );
};

export default ExerciseProgram;
