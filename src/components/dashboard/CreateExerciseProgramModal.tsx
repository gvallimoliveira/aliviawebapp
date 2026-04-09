import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Loader2, Search, Plus, Minus, Dumbbell, Copy, Share2, Check, Link2, PenLine, Trash2,
} from "lucide-react";

interface Exercise {
  id: string;
  name_pt: string;
  name_en: string;
  name_es: string;
  body_region: string;
  category: string;
  difficulty: string;
  video_url: string | null;
}

interface SelectedExercise {
  exercise: Exercise;
  sets: string;
  reps: string;
  frequency: string;
  observations: string;
}

interface CustomExercise {
  tempId: string;
  name: string;
  sets: string;
  reps: string;
  frequency: string;
  observations: string;
  videoUrl: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionalId: string;
  patientName: string;
  assessmentId?: string;
  editProgramId?: string | null;
}

const categoryLabels: Record<string, Record<string, string>> = {
  strengthening: { pt: "Fortalecimento", en: "Strengthening", es: "Fortalecimiento" },
  stretching: { pt: "Alongamento", en: "Stretching", es: "Estiramiento" },
  mobility: { pt: "Mobilidade", en: "Mobility", es: "Movilidad" },
  proprioception: { pt: "Propriocepção", en: "Proprioception", es: "Propiocepción" },
};

const regionLabels: Record<string, Record<string, string>> = {
  hip: { pt: "Quadril", en: "Hip", es: "Cadera" },
  knee: { pt: "Joelho", en: "Knee", es: "Rodilla" },
  shoulder: { pt: "Ombro", en: "Shoulder", es: "Hombro" },
  spine: { pt: "Coluna", en: "Spine", es: "Columna" },
  ankle: { pt: "Tornozelo", en: "Ankle", es: "Tobillo" },
  cervical: { pt: "Cervical", en: "Cervical", es: "Cervical" },
  wrist: { pt: "Punho", en: "Wrist", es: "Muñeca" },
  elbow: { pt: "Cotovelo", en: "Elbow", es: "Codo" },
  foot: { pt: "Pé", en: "Foot", es: "Pie" },
  general: { pt: "Geral", en: "General", es: "General" },
};

const CreateExerciseProgramModal = ({ open, onOpenChange, professionalId, patientName, assessmentId, editProgramId }: Props) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const isEditing = !!editProgramId;

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("exercise_library")
        .select("id, name_pt, name_en, name_es, body_region, category, difficulty, video_url")
        .order("body_region")
        .order("category");
      setExercises(data || []);

      // If editing, load existing program items
      if (editProgramId) {
        const { data: program } = await (supabase as any)
          .from("exercise_programs")
          .select("notes")
          .eq("id", editProgramId)
          .single();
        if (program?.notes) setNotes(program.notes);

        const { data: items } = await (supabase as any)
          .from("exercise_program_items")
          .select("*")
          .eq("program_id", editProgramId)
          .order("sort_order");

        if (items && data) {
          const librarySelected: SelectedExercise[] = [];
          const customItems: CustomExercise[] = [];
          for (const item of items) {
            if (item.exercise_id) {
              const ex = data.find((e: Exercise) => e.id === item.exercise_id);
              if (ex) {
                librarySelected.push({
                  exercise: ex,
                  sets: item.sets || "3",
                  reps: item.reps || "10",
                  frequency: item.frequency || "3x/semana",
                  observations: item.observations || "",
                });
              }
            } else if (item.custom_name) {
              customItems.push({
                tempId: crypto.randomUUID(),
                name: item.custom_name,
                sets: item.sets || "3",
                reps: item.reps || "10",
                frequency: item.frequency || "3x/semana",
                observations: item.observations || "",
                videoUrl: item.custom_video_url || "",
              });
            }
          }
          setSelected(librarySelected);
          setCustomExercises(customItems);
        }
      }

      setLoading(false);
    };
    load();
  }, [open, editProgramId]);

  const getName = (ex: Exercise) => language === "en" ? (ex.name_en || ex.name_pt) : ex.name_pt;

  const filtered = useMemo(() => {
    return exercises.filter((ex) => {
      if (regionFilter !== "all" && ex.body_region !== regionFilter) return false;
      if (categoryFilter !== "all" && ex.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return getName(ex).toLowerCase().includes(q);
      }
      return true;
    });
  }, [exercises, searchQuery, regionFilter, categoryFilter, language]);

  const isSelected = (id: string) => selected.some((s) => s.exercise.id === id);

  const toggleExercise = (ex: Exercise) => {
    if (isSelected(ex.id)) {
      setSelected(selected.filter((s) => s.exercise.id !== ex.id));
    } else {
      setSelected([...selected, { exercise: ex, sets: "3", reps: "10", frequency: "3x/semana", observations: "" }]);
    }
  };

  const updateSelected = (id: string, field: string, value: string) => {
    setSelected(selected.map((s) => s.exercise.id === id ? { ...s, [field]: value } : s));
  };

  const addCustomExercise = () => {
    setCustomExercises([...customExercises, {
      tempId: crypto.randomUUID(),
      name: "",
      sets: "3",
      reps: "10",
      frequency: "3x/semana",
      observations: "",
      videoUrl: "",
    }]);
  };

  const updateCustom = (tempId: string, field: keyof CustomExercise, value: string) => {
    setCustomExercises(customExercises.map((c) => c.tempId === tempId ? { ...c, [field]: value } : c));
  };

  const removeCustom = (tempId: string) => {
    setCustomExercises(customExercises.filter((c) => c.tempId !== tempId));
  };

  const totalCount = selected.length + customExercises.filter(c => c.name.trim()).length;

  const handleCreate = async () => {
    if (totalCount === 0) return;
    setCreating(true);
    try {
      let programId: string;
      let programToken: string;

      if (isEditing && editProgramId) {
        // Update existing program
        programId = editProgramId;
        await (supabase as any).from("exercise_programs").update({ notes: notes || null }).eq("id", editProgramId);
        // Delete old items and re-insert
        await (supabase as any).from("exercise_program_items").delete().eq("program_id", editProgramId);
        // Get token
        const { data: prog } = await (supabase as any).from("exercise_programs").select("token").eq("id", editProgramId).single();
        programToken = prog?.token || editProgramId;
      } else {
        // Create new program
        const { data: program, error } = await (supabase as any)
          .from("exercise_programs")
          .insert({
            professional_id: professionalId,
            assessment_id: assessmentId || null,
            patient_name: patientName,
            notes: notes || null,
          })
          .select("id, token")
          .single();
        if (error) throw error;
        programId = program.id;
        programToken = program.token;
      }

      const items: any[] = [];
      let sortOrder = 0;

      selected.forEach((s) => {
        items.push({
          program_id: programId,
          exercise_id: s.exercise.id,
          sets: s.sets,
          reps: s.reps,
          frequency: s.frequency,
          observations: s.observations || null,
          sort_order: sortOrder++,
        });
      });

      customExercises.forEach((c) => {
        if (!c.name.trim()) return;
        items.push({
          program_id: programId,
          exercise_id: null,
          custom_name: c.name.trim(),
          custom_video_url: c.videoUrl.trim() || null,
          sets: c.sets,
          reps: c.reps,
          frequency: c.frequency,
          observations: c.observations || null,
          sort_order: sortOrder++,
        });
      });

      if (items.length > 0) {
        const { error: itemsError } = await (supabase as any)
          .from("exercise_program_items")
          .insert(items);
        if (itemsError) throw itemsError;
      }

      const link = `${window.location.origin}/hep/${programToken}`;
      setGeneratedLink(link);
      toast({ title: isEditing ? "Programa atualizado com sucesso!" : "Programa criado com sucesso!" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao criar programa", description: err?.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!generatedLink) return;
    const text = `Olá ${patientName}! Preparei seu programa de exercícios domiciliares. Acesse aqui: ${generatedLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleClose = () => {
    setGeneratedLink(null);
    setSelected([]);
    setCustomExercises([]);
    setNotes("");
    setSearchQuery("");
    setRegionFilter("all");
    setCategoryFilter("all");
    onOpenChange(false);
  };

  if (generatedLink) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Programa Criado!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              O programa de exercícios para <span className="font-semibold">{patientName}</span> foi criado. Compartilhe o link abaixo:
            </p>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-xl">
              <Link2 className="h-4 w-4 text-primary shrink-0" />
              <span className="text-xs text-foreground truncate flex-1">{generatedLink}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleWhatsApp} className="flex-1 gap-1.5 rounded-xl" variant="outline">
                <Share2 className="h-4 w-4" />
                Enviar via WhatsApp
              </Button>
              <Button onClick={handleClose} className="flex-1 rounded-xl">
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-primary" />
            {isEditing ? "Editar Programa de Exercícios" : "Criar Programa de Exercícios"}
          </DialogTitle>
          <DialogDescription>
            Selecione exercícios do banco ou adicione manualmente para <span className="font-semibold">{patientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercício..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Região" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas regiões</SelectItem>
                {Object.entries(regionLabels).map(([key, labels]) => (
                  <SelectItem key={key} value={key}>{labels[language] || labels.pt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {Object.entries(categoryLabels).map(([key, labels]) => (
                  <SelectItem key={key} value={key}>{labels[language] || labels.pt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Exercise list */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-1">
              {filtered.map((ex) => {
                const sel = isSelected(ex.id);
                return (
                  <div
                    key={ex.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${sel ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                    onClick={() => toggleExercise(ex)}
                  >
                    <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${sel ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"}`}>
                      {sel && <Check className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{getName(ex)}</p>
                      <div className="flex gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[9px] py-0">{regionLabels[ex.body_region]?.[language] || ex.body_region}</Badge>
                        <Badge variant="outline" className="text-[9px] py-0">{categoryLabels[ex.category]?.[language] || ex.category}</Badge>
                      </div>
                    </div>
                    {sel ? <Minus className="h-4 w-4 text-destructive shrink-0" /> : <Plus className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum exercício encontrado.</p>
              )}
            </div>
          )}

          {/* Add custom exercise button */}
          <Button variant="outline" size="sm" onClick={addCustomExercise} className="w-full gap-1.5 rounded-xl">
            <PenLine className="h-4 w-4" />
            Adicionar exercício manual
          </Button>

          {/* Custom exercises */}
          {customExercises.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <PenLine className="h-3.5 w-3.5" />
                Exercícios manuais
              </p>
              {customExercises.map((c) => (
                <Card key={c.tempId} className="overflow-hidden border-dashed">
                  <CardContent className="py-2.5 px-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Nome do exercício *"
                        value={c.name}
                        onChange={(e) => updateCustom(c.tempId, "name", e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeCustom(c.tempId)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Séries</Label>
                        <Input value={c.sets} onChange={(e) => updateCustom(c.tempId, "sets", e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Repetições</Label>
                        <Input value={c.reps} onChange={(e) => updateCustom(c.tempId, "reps", e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Frequência</Label>
                        <Input value={c.frequency} onChange={(e) => updateCustom(c.tempId, "frequency", e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    <Input
                      placeholder="Link de vídeo (opcional)"
                      value={c.videoUrl}
                      onChange={(e) => updateCustom(c.tempId, "videoUrl", e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Input
                      placeholder="Observações (opcional)"
                      value={c.observations}
                      onChange={(e) => updateCustom(c.tempId, "observations", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Selected library exercises config */}
          {selected.length > 0 && (
            <div className="space-y-3 border-t pt-3">
              <p className="text-sm font-semibold text-foreground">{selected.length} exercício(s) do banco selecionado(s)</p>
              {selected.map((s) => (
                <Card key={s.exercise.id} className="overflow-hidden">
                  <CardContent className="py-2.5 px-3 space-y-2">
                    <p className="text-sm font-medium text-foreground">{getName(s.exercise)}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Séries</Label>
                        <Input value={s.sets} onChange={(e) => updateSelected(s.exercise.id, "sets", e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Repetições</Label>
                        <Input value={s.reps} onChange={(e) => updateSelected(s.exercise.id, "reps", e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Frequência</Label>
                        <Input value={s.frequency} onChange={(e) => updateSelected(s.exercise.id, "frequency", e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    <Input
                      placeholder="Observações (opcional)"
                      value={s.observations}
                      onChange={(e) => updateSelected(s.exercise.id, "observations", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs">Observações gerais do programa</Label>
            <Textarea
              placeholder="Instruções gerais para o paciente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-xs min-h-[60px]"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={totalCount === 0 || creating}
            className="w-full rounded-xl gap-1.5"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dumbbell className="h-4 w-4" />}
            {creating ? "Criando..." : `Gerar Link do Programa (${totalCount})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateExerciseProgramModal;
