import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  NotebookPen, Plus, CalendarIcon, Loader2, Copy, BookmarkPlus, History,
} from "lucide-react";
import SessionNoteItem, { SessionNoteData } from "./SessionNoteItem";
import SessionNotesHistoryModal from "./SessionNotesHistoryModal";
import DictationBar from "./DictationBar";
import { anchorScroll } from "@/hooks/useScrollAnchor";


type SessionNote = SessionNoteData;

interface NoteTemplate {
  id: string;
  name: string;
  content: string;
  observation?: string | null;
}


interface SessionNotesSectionProps {
  professionalId: string;
  patientEmail: string;
  isDemo?: boolean;
  /** Em modo clínica os registros são da equipe: leitura e escrita usam o clinic_id. */
  clinicId?: string | null;
}

const SessionNotesSection = ({ professionalId, patientEmail, isDemo, clinicId }: SessionNotesSectionProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formContent, setFormContent] = useState("");
  const [formObservation, setFormObservation] = useState("");
  const [saving, setSaving] = useState(false);

  // Abertura externa (botão "Registrar evolução" do prontuário / rail lateral):
  // abre o formulário de nova nota já focado no campo de texto.
  const contentRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const handler = () => {
      setEditingNote(null);
      setFormContent("");
      setFormObservation("");
      setFormDate(new Date());
      setHint(null);
      setShowForm(true);
      window.setTimeout(() => contentRef.current?.focus(), 250);
    };
    window.addEventListener("alivia:open-session-note", handler);
    return () => window.removeEventListener("alivia:open-session-note", handler);
  }, []);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  // Feedback inline dos atalhos (evita toast fixo no topo, que no iOS com o
  // teclado aberto empurrava a página para o topo).
  const [hint, setHint] = useState<string | null>(null);
  const [authors, setAuthors] = useState<Record<string, string>>({});

  // Mantém o card ancorado na mesma posição da viewport durante ações que
  // re-renderizam a lista ou fecham o teclado.
  const cardRef = useRef<HTMLDivElement | null>(null);
  const withAnchor = (fn: () => void) => {
    const restore = anchorScroll(() => cardRef.current, 1200);
    fn();
    restore();
  };

  const itemLabels = {
    repeat: t("session_notes.repeat_today") || "Repetir evolução hoje",
    expand: t("session_notes.expand"),
    collapse: t("session_notes.collapse"),
  };


  const fetchTemplates = useCallback(async () => {
    if (isDemo) return;
    const { data } = await (supabase.from("session_note_templates" as any) as any)
      .select("id, name, content, observation")
      .eq("professional_id", professionalId)
      .order("name", { ascending: true });
    setTemplates((data as NoteTemplate[]) || []);
  }, [professionalId, isDemo]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const applyPrevious = () => {
    const previous = notes[0];
    if (!previous) {
      setHint("Sem evolução anterior para copiar.");
      return;
    }
    withAnchor(() => {
      setFormContent(previous.content || "");
      setFormObservation(previous.observation || "");
      setHint("Preenchido com a evolução anterior.");
    });
  };

  const applyTemplate = (id: string) => {
    const tpl = templates.find((x) => x.id === id);
    if (!tpl) return;
    withAnchor(() => {
      setFormContent(tpl.content || "");
      setFormObservation(tpl.observation || "");
      setHint(`Modelo aplicado: ${tpl.name}`);
    });
  };

  const saveAsTemplate = async () => {
    if (!formContent.trim()) return;
    const name = window.prompt("Nome do modelo de evolução:");
    if (!name?.trim()) return;
    const restore = anchorScroll(() => cardRef.current, 2000);
    setSavingTemplate(true);
    try {
      await (supabase.from("session_note_templates" as any) as any).insert({
        professional_id: professionalId,
        name: name.trim(),
        content: formContent,
        observation: formObservation || null,
      });
      setHint(`Modelo "${name.trim()}" salvo.`);
      await fetchTemplates();
    } catch {
      setHint("Não foi possível salvar o modelo.");
    } finally {
      setSavingTemplate(false);
      restore();
    }
  };


  const fetchNotes = useCallback(async () => {
    if (isDemo) {
      const { mockSessionNotes } = await import("@/data/mockProDemoExtras");
      const list = mockSessionNotes[patientEmail] || [];
      setNotes([...list].sort((a, b) => b.session_date.localeCompare(a.session_date)));
      setLoading(false);
      return;
    }
    // Modo clínica: o prontuário é da equipe — todos os registros do paciente
    // naquela clínica aparecem, com o autor identificado.
    let q = (supabase.from("session_notes" as any) as any)
      .select("*")
      .eq("patient_email", patientEmail)
      .order("session_date", { ascending: false });
    q = clinicId ? q.eq("clinic_id", clinicId) : q.eq("professional_id", professionalId).is("clinic_id", null);
    const { data } = await q;
    const list = (data as SessionNote[]) || [];
    setNotes(list);
    setLoading(false);

    if (clinicId) {
      const ids = Array.from(new Set(list.map((n: any) => n.professional_id).filter(Boolean)));
      if (ids.length > 0) {
        const { data: pros } = await (supabase.from("professionals") as any)
          .select("id, full_name")
          .in("id", ids);
        const map: Record<string, string> = {};
        (pros || []).forEach((p: any) => { map[p.id] = p.full_name; });
        setAuthors(map);
      }
    }
  }, [professionalId, patientEmail, isDemo, clinicId]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleSave = async () => {
    if (!formContent.trim()) return;
    if (isDemo) { toast({ title: "Demo: anotações não são salvas" }); setShowForm(false); setEditingNote(null); setFormContent(""); setFormObservation(""); return; }
    setSaving(true);
    try {
      if (editingNote) {
        await (supabase.from("session_notes" as any) as any)
          .update({ content: formContent, observation: formObservation || null, session_date: format(formDate, "yyyy-MM-dd") })
          .eq("id", editingNote.id);
      } else {
        await (supabase.from("session_notes" as any) as any)
          .insert({
            professional_id: professionalId,
            clinic_id: clinicId || null,
            patient_email: patientEmail,
            session_date: format(formDate, "yyyy-MM-dd"),
            content: formContent,
            observation: formObservation || null,
          });
      }
      toast({ title: editingNote ? t("session_notes.updated") : t("session_notes.created") });
      setShowForm(false);
      setEditingNote(null);
      setFormContent("");
      setFormObservation("");
      setFormDate(new Date());
      setHint(null);
      const restore = anchorScroll(() => cardRef.current, 1500);
      await fetchNotes();
      restore();
    } catch {
      toast({ title: t("session_notes.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    if (isDemo) { toast({ title: "Demo: anotações não são removidas" }); setDeleteId(null); return; }
    setDeleting(true);
    try {
      await (supabase.from("session_notes" as any) as any).delete().eq("id", deleteId);
      toast({ title: t("session_notes.deleted") });
      setDeleteId(null);
      const restore = anchorScroll(() => cardRef.current, 1500);
      await fetchNotes();
      restore();
    } catch {
      toast({ title: t("session_notes.error"), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleRepeat = async (note: SessionNote) => {
    if (isDemo) { toast({ title: "Demo: anotações não são salvas" }); return; }
    const today = format(new Date(), "yyyy-MM-dd");
    const exists = notes.some((n) => n.session_date === today && n.content === note.content);
    if (exists) {
      toast({ title: t("session_notes.repeat_duplicate") || "Evolução idêntica já registrada hoje" });
      return;
    }
    try {
      await (supabase.from("session_notes" as any) as any).insert({
        professional_id: professionalId,
        clinic_id: clinicId || null,
        patient_email: patientEmail,
        session_date: today,
        content: note.content,
        observation: note.observation || null,

      });
      toast({ title: t("session_notes.repeated") || "Evolução repetida na data de hoje" });
      const restore = anchorScroll(() => cardRef.current, 1500);
      await fetchNotes();
      restore();
    } catch {
      toast({ title: t("session_notes.error"), variant: "destructive" });
    }
  };

  /** Salva a edição feita dentro do modal de histórico (com ou sem ditado). */
  const handleInlineSave = async (id: string, content: string, observation: string) => {
    if (isDemo) { toast({ title: "Demo: anotações não são salvas" }); return; }
    try {
      await (supabase.from("session_notes" as any) as any)
        .update({ content, observation: observation.trim() || null })
        .eq("id", id);
      toast({ title: t("session_notes.updated") });
      const restore = anchorScroll(() => cardRef.current, 1500);
      await fetchNotes();
      restore();
    } catch {
      toast({ title: t("session_notes.error"), variant: "destructive" });
      throw new Error("save failed");
    }
  };

  const startEdit = (note: SessionNote) => {
    setShowHistory(false);
    setHint(null);
    setEditingNote(note);
    setFormDate(new Date(note.session_date + "T12:00:00"));
    setFormContent(note.content);
    setFormObservation(note.observation || "");
    setShowForm(true);
  };



  return (
    <Card ref={cardRef}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <NotebookPen className="h-4 w-4 text-primary" />
            {t("session_notes.title")}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-xl text-xs"
            onClick={() => {
              setEditingNote(null);
              setFormContent("");
              setFormObservation("");
              setFormDate(new Date());
              setHint(null);
              setShowForm(!showForm);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("session_notes.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("gap-1.5 text-xs", !formDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {formDate ? format(formDate, "dd/MM/yyyy") : t("session_notes.select_date")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formDate}
                    onSelect={(d) => d && setFormDate(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {editingNote && (
                <Badge variant="outline" className="text-[10px]">{t("session_notes.editing")}</Badge>
              )}
            </div>

            {/* Atalhos: evolução anterior e modelos */}
            {!isDemo && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-[11px]"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={applyPrevious}
                    disabled={notes.length === 0}
                  >
                    <Copy className="h-3 w-3" />
                    Preencher com evolução anterior
                  </Button>
                  {templates.length > 0 && (
                    <Select onValueChange={applyTemplate}>
                      <SelectTrigger className="h-7 w-[190px] text-[11px]">
                        <SelectValue placeholder="Usar modelo…" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id} className="text-xs">{tpl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-[11px] text-muted-foreground"
                    title={!formContent.trim() ? "Escreva a evolução antes de salvar como modelo" : undefined}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={saveAsTemplate}
                    disabled={savingTemplate || !formContent.trim()}
                  >
                    {savingTemplate ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookmarkPlus className="h-3 w-3" />}
                    Salvar como modelo
                  </Button>
                </div>
                {hint && <p className="text-[11px] text-primary">{hint}</p>}
                {!hint && templates.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Escreva uma evolução e use "Salvar como modelo" para reutilizá-la nas próximas sessões.
                  </p>
                )}
              </div>
            )}

            {!isDemo && (
              <DictationBar
                onAppend={(target, appender) => {
                  if (target === "content") setFormContent((c) => appender(c));
                  else setFormObservation((c) => appender(c));
                }}
              />
            )}

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Evolução da sessão</p>
              <Textarea
                ref={contentRef}
                placeholder={t("session_notes.placeholder")}
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                className="text-xs min-h-[80px] resize-y"
              />
            </div>

            <div className="space-y-1">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Observação (opcional)</p>
              <Textarea
                placeholder="Intercorrências, combinados com o paciente, ajustes de conduta…"
                value={formObservation}
                onChange={(e) => setFormObservation(e.target.value)}
                className="text-xs min-h-[50px] resize-y"
              />
            </div>

            <div className="flex gap-2">
              <Button size="sm" className="rounded-xl gap-1.5 text-xs" onClick={handleSave} disabled={saving || !formContent.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <NotebookPen className="h-3.5 w-3.5" />}
                {editingNote ? t("session_notes.save_edit") : t("session_notes.save")}
              </Button>

              <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setShowForm(false); setEditingNote(null); }}>
                {t("session_notes.cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">{t("session_notes.empty")}</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 px-0.5">
              <p className="text-[11px] text-muted-foreground">
                {notes.length} registro{notes.length === 1 ? "" : "s"} · última sessão em{" "}
                {new Date(notes[0].session_date + "T12:00:00").toLocaleDateString("pt-BR")}
              </p>
            </div>
            {notes.slice(0, 3).map((note) => (
              <SessionNoteItem
                key={note.id}
                note={note}
                onEdit={startEdit}
                onRepeat={handleRepeat}
                onDelete={setDeleteId}
                labels={itemLabels}
                authorName={clinicId ? authors[(note as any).professional_id] : undefined}
              />
            ))}
            {notes.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl gap-1.5 text-xs"
                onClick={() => setShowHistory(true)}
              >
                <History className="h-3.5 w-3.5" />
                Ver histórico completo ({notes.length})
              </Button>
            )}
          </div>
        )}

      </CardContent>

      <SessionNotesHistoryModal
        open={showHistory}
        onOpenChange={setShowHistory}
        notes={notes}
        onEdit={startEdit}
        onRepeat={handleRepeat}
        onDelete={setDeleteId}
        labels={itemLabels}
        authors={clinicId ? authors : undefined}
        isDemo={isDemo}
        onSaveEdit={handleInlineSave}
      />

      {/* Delete confirmation */}

      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("session_notes.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("session_notes.delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("session_notes.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("session_notes.confirm_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default SessionNotesSection;
