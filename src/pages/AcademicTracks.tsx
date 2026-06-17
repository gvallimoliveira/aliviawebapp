import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, ArrowLeft, GraduationCap, CheckCircle2, Sparkles, Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { awardBadgesIfEligible } from "@/lib/academicNiche";

type Track = { id: string; slug: string; title: string; niche: string; description: string | null; total_modules: number };
type Module = { id: string; track_id: string; order_index: number; title: string; summary: string | null; suggested_command: string | null };
type Progress = { module_id: string };

export default function AcademicTracks() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [modules, setModules] = useState<Record<string, Module[]>>({});
  const [progress, setProgress] = useState<Set<string>>(new Set());
  const [openTrack, setOpenTrack] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const sb = supabase as any;
      const [{ data: tr }, { data: mods }, { data: prog }] = await Promise.all([
        sb.from("academic_tracks").select("*").order("title"),
        sb.from("academic_track_modules").select("*").order("order_index"),
        sb.from("academic_user_progress").select("module_id").eq("user_id", user.id),
      ]);
      const byTrack: Record<string, Module[]> = {};
      (mods || []).forEach((m: Module) => {
        if (!byTrack[m.track_id]) byTrack[m.track_id] = [];
        byTrack[m.track_id].push(m);
      });
      setTracks(tr || []);
      setModules(byTrack);
      setProgress(new Set((prog || []).map((p: Progress) => p.module_id)));
      setLoading(false);
    })();
  }, [user?.id]);

  const completeModule = async (track: Track, mod: Module) => {
    if (!user || progress.has(mod.id)) return;
    setCompleting(mod.id);
    try {
      const sb = supabase as any;
      await sb.from("academic_user_progress").insert({
        user_id: user.id, track_id: track.id, module_id: mod.id, xp_earned: 30,
      });
      await sb.from("academic_xp_log").insert({
        user_id: user.id, source: "track_module", source_ref: `${track.slug}:${mod.order_index}`, niche: track.niche, xp: 30,
      });
      const { data: agg } = await sb.from("academic_xp_log").select("xp").eq("user_id", user.id).eq("niche", track.niche);
      const total = (agg || []).reduce((s: number, r: any) => s + (r.xp || 0), 0);
      await awardBadgesIfEligible(supabase, user.id, track.niche, total);
      setProgress(prev => new Set([...prev, mod.id]));
      toast.success(`✅ Módulo concluído! +30 XP em ${track.niche}`);
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível registrar a conclusão.");
    } finally {
      setCompleting(null);
    }
  };

  const studyWithMentor = (track: Track, mod: Module) => {
    const cmd = `/trilha ${track.niche} ${mod.order_index}`;
    navigate(`/agente?seed=${encodeURIComponent(cmd)}`);
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container py-16 text-center flex-1">
          <p className="text-muted-foreground mb-4">Você precisa estar logado.</p>
          <Button onClick={() => navigate("/auth")}>Fazer login</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="container py-8 max-w-4xl flex-1">
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <div className="flex items-center gap-3 mb-6">
          <RouteIcon className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Trilhas de Conhecimento</h1>
            <p className="text-sm text-muted-foreground">Estude por nicho com módulos sequenciais. Cada módulo concluído rende +30 XP rumo a "Mestre do Nicho".</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {tracks.map((t) => {
            const list = modules[t.id] || [];
            const done = list.filter(m => progress.has(m.id)).length;
            const pct = list.length ? Math.round((done / list.length) * 100) : 0;
            const isOpen = openTrack === t.id;
            return (
              <Card key={t.id} className={`border-border/60 ${isOpen ? "sm:col-span-2" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-semibold">{t.title}</h2>
                      <p className="text-xs text-muted-foreground">{t.description}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{done}/{list.length}</Badge>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                  <Button
                    variant={isOpen ? "secondary" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => setOpenTrack(isOpen ? null : t.id)}
                  >
                    {isOpen ? "Fechar trilha" : "Ver módulos"}
                  </Button>

                  {isOpen && (
                    <div className="space-y-2 pt-2 border-t border-border/40">
                      {list.map((m) => {
                        const completed = progress.has(m.id);
                        return (
                          <div key={m.id} className="rounded-lg border border-border/50 p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-[10px]">{m.order_index}</Badge>
                              <div className="text-sm font-medium flex-1">{m.title}</div>
                              {completed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            </div>
                            {m.summary && <p className="text-xs text-muted-foreground mb-2">{m.summary}</p>}
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => studyWithMentor(t, m)}>
                                <GraduationCap className="h-3.5 w-3.5" /> Aula com Mentor
                              </Button>
                              <Button
                                size="sm"
                                className="gap-1.5 h-8"
                                disabled={completed || completing === m.id}
                                onClick={() => completeModule(t, m)}
                              >
                                {completing === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                {completed ? "Concluído" : "Marcar como concluído"}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
