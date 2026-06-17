import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, GraduationCap, Trash2, Loader2, Brain } from "lucide-react";
import { toast } from "sonner";

type StudyCase = {
  id: string;
  full_name: string;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
};

export default function CasosDeEstudo() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<StudyCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: pro } = await (supabase as any).from("professionals")
      .select("id").eq("user_id", user.id).maybeSingle();
    if (!pro?.id) { setCases([]); setLoading(false); return; }
    const { data } = await (supabase as any).from("patients")
      .select("id, full_name, birth_date, notes, created_at")
      .eq("professional_id", pro.id)
      .eq("is_study_case", true)
      .order("created_at", { ascending: false });
    setCases(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const remove = async (id: string) => {
    if (!confirm("Excluir este caso de estudo?")) return;
    await (supabase as any).from("patients").delete().eq("id", id);
    toast.success("Caso removido");
    load();
  };

  const age = (bd: string | null) => bd ? Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 86400000)) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/60 backdrop-blur-sm px-4 py-3 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <GraduationCap className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-base font-semibold">Casos de estudo</h1>
          <p className="text-xs text-muted-foreground">Pacientes fictícios criados pelo agente para aprendizado</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : cases.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center space-y-3">
              <GraduationCap className="h-10 w-10 mx-auto text-muted-foreground" />
              <h2 className="font-semibold">Nenhum caso de estudo ainda</h2>
              <p className="text-sm text-muted-foreground">
                Abra o Agente Clínico e digite <code className="px-1.5 py-0.5 rounded bg-muted text-xs">/caso [tema]</code> para gerar
                um paciente fictício completo e praticar seu raciocínio clínico.
              </p>
              <Button onClick={() => navigate("/agente")} className="gap-2">
                <Brain className="h-4 w-4" /> Abrir Agente Clínico
              </Button>
            </CardContent>
          </Card>
        ) : (
          cases.map((c) => {
            const a = age(c.birth_date);
            const open = expanded === c.id;
            return (
              <Card key={c.id} className="border-amber-500/30 bg-amber-500/[0.03]">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{c.full_name}</h3>
                        <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400">
                          🎓 Caso de estudo
                        </Badge>
                        {a != null && <span className="text-xs text-muted-foreground">{a} anos</span>}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Criado em {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setExpanded(open ? null : c.id)}
                  >
                    {open ? "Ocultar" : "Ver caso completo"}
                  </Button>
                  {open && c.notes && (
                    <pre className="text-xs whitespace-pre-wrap bg-background/60 rounded-lg p-3 border border-border/40 font-sans">
                      {c.notes}
                    </pre>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
}
