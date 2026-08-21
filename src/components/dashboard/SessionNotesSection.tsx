import { useState, useEffect, useCallback } from "react";
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  NotebookPen, Plus, CalendarIcon, Loader2, Trash2, Pencil, ChevronDown, ChevronUp, Copy,
} from "lucide-react";

interface SessionNote {
  id: string;
  session_date: string;
  content: string;
  observation?: string | null;
  created_at: string;
  updated_at: string;
  appointment_id?: string | null;
}

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
}

const SessionNotesSection = ({ professionalId, patientEmail, isDemo }: SessionNotesSectionProps) => {
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);

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
      toast({ title: "Sem evolução anterior para copiar" });
      return;
    }
    setFormContent(previous.content || "");
    setFormObservation(previous.observation || "");
    toast({ title: "Preenchido com a evolução anterior" });
  };

  const applyTemplate = (id: string) => {
    const tpl = templates.find((x) => x.id === id);
    if (!tpl) return;
    setFormContent(tpl.content || "");
    setFormObservation(tpl.observation || "");
  };

  const saveAsTemplate = async () => {
    if (!formContent.trim()) return;
    const name = window.prompt("Nome do modelo de evolução:");
    if (!name?.trim()) return;
    setSavingTemplate(true);
    try {
      await (supabase.from("session_note_templates" as any) as any).insert({
        professional_id: professionalId,
        name: name.trim(),
        content: formContent,
        observation: formObservation || null,
      });
      toast({ title: "Modelo salvo" });
      fetchTemplates();
    } catch {
      toast({ title: "Não foi possível salvar o modelo", variant: "destructive" });
    } finally {
      setSavingTemplate(false);
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
    const { data } = await (supabase.from("session_notes" as any) as any)
      .select("*")
      .eq("professional_id", professionalId)
      .eq("patient_email", patientEmail)
      .order("session_date", { ascending: false });
    setNotes((data as SessionNote[]) || []);
    setLoading(false);
  }, [professionalId, patientEmail, isDemo]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const handleSave = async () => {
    if (!formContent.trim()) return;
    if (isDemo) { toast({ title: "Demo: anotações não são salvas" }); setShowForm(false); setEditingNote(null); setFormContent(""); return; }
    setSaving(true);
    try {
      if (editingNote) {
        await (supabase.from("session_notes" as any) as any)
          .update({ content: formContent, session_date: format(formDate, "yyyy-MM-dd") })
          .eq("id", editingNote.id);
      } else {
        await (supabase.from("session_notes" as any) as any)
          .insert({
            professional_id: professionalId,
            patient_email: patientEmail,
            session_date: format(formDate, "yyyy-MM-dd"),
            content: formContent,
          });
      }
      toast({ title: editingNote ? t("session_notes.updated") : t("session_notes.created") });
      setShowForm(false);
      setEditingNote(null);
      setFormContent("");
      setFormDate(new Date());
      fetchNotes();
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
      fetchNotes();
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
        patient_email: patientEmail,
        session_date: today,
        content: note.content,
      });
      toast({ title: t("session_notes.repeated") || "Evolução repetida na data de hoje" });
      fetchNotes();
    } catch {
      toast({ title: t("session_notes.error"), variant: "destructive" });
    }
  };

  const startEdit = (note: SessionNote) => {
    setEditingNote(note);
    setFormDate(new Date(note.session_date + "T12:00:00"));
    setFormContent(note.content);
    setShowForm(true);
  };

  return (
    <Card>
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
              setFormDate(new Date());
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
            <div className="flex items-center gap-2">
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
            <Textarea
              placeholder={t("session_notes.placeholder")}
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              className="text-xs min-h-[80px] resize-y"
            />
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
            {notes.map((note) => {
              const isExpanded = expanded[note.id];
              const isLong = note.content.length > 150;
              return (
                <div key={note.id} className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-semibold text-foreground">
                        {new Date(note.session_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        title={t("session_notes.repeat_today") || "Repetir evolução hoje"}
                        onClick={() => handleRepeat(note)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(note)}>
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteId(note.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className={cn("text-xs text-muted-foreground whitespace-pre-wrap", !isExpanded && isLong && "line-clamp-3")}>
                    {note.content}
                  </p>
                  {isLong && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] px-1 gap-0.5"
                      onClick={() => setExpanded((prev) => ({ ...prev, [note.id]: !prev[note.id] }))}
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? t("session_notes.collapse") : t("session_notes.expand")}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

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
