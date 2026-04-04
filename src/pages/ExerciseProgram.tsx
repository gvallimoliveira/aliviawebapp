import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Dumbbell, Play, Clock, ChevronDown, ChevronUp, Globe } from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";

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
  const { language, toggleLanguage } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [expired, setExpired] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      const { data: prog, error } = await (supabase as any)
        .from("exercise_programs")
        .select("id, patient_name, notes, created_at, expires_at, professional:professionals(full_name, logo_url, clinic_name)")
        .eq("token", token)
        .maybeSingle();

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

      setProgram(prog);

      const { data: exerciseItems } = await (supabase as any)
        .from("exercise_program_items")
        .select("id, sets, reps, frequency, observations, sort_order, custom_name, custom_video_url, exercise:exercise_library(name_pt, name_en, name_es, description_pt, description_en, description_es, body_region, category, video_url, difficulty)")
        .eq("program_id", prog.id)
        .order("sort_order", { ascending: true });

      setItems(exerciseItems || []);
      setLoading(false);
    };
    load();
  }, [token]);

  const getName = (ex: any) => language === "en" ? (ex.name_en || ex.name_pt) : language === "es" ? (ex.name_es || ex.name_pt) : ex.name_pt;
  const getDesc = (ex: any) => language === "en" ? (ex.description_en || ex.description_pt) : language === "es" ? (ex.description_es || ex.description_pt) : ex.description_pt;

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2">
            {program?.professional?.logo_url ? (
              <img src={program.professional.logo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <img src={logoAlivia} alt="Aliv.iA" className="h-8" />
            )}
            <span className="text-sm font-semibold text-foreground truncate max-w-[180px]">
              {program?.professional?.clinic_name || program?.professional?.full_name || "Aliv.iA"}
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
            <Globe className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container max-w-lg py-6 px-4 space-y-5">
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
              {categoryLabels[category]?.[language] || category}
            </h2>
            {catItems.map((item) => {
              const embedUrl = item.exercise?.video_url ? getYouTubeEmbedUrl(item.exercise.video_url) : null;
              const isExpanded = expandedVideo === item.id;
              return (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="py-3 px-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{getName(item.exercise)}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{getDesc(item.exercise)}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {difficultyLabels[item.exercise?.difficulty]?.[language] || item.exercise?.difficulty}
                      </Badge>
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

                    {embedUrl && (
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5 text-xs text-primary p-0 h-auto"
                          onClick={() => setExpandedVideo(isExpanded ? null : item.id)}
                        >
                          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                          {isExpanded ? t("hide_video") : t("watch_video")}
                        </Button>
                        {isExpanded && (
                          <div className="mt-2 aspect-video rounded-lg overflow-hidden">
                            <iframe
                              src={embedUrl}
                              className="w-full h-full"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              title={getName(item.exercise)}
                            />
                          </div>
                        )}
                      </div>
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
