import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, addDays, startOfWeek, isSameDay, parseISO } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Plus, CalendarIcon, Clock, Video, MapPin, ExternalLink,
  Loader2, Trash2, Pencil, NotebookPen, GripVertical,
} from "lucide-react";

interface Appointment {
  id: string;
  professional_id: string;
  patient_email: string | null;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  notes: string | null;
  type: string;
  status: string;
  created_at: string;
}

interface ProScheduleProps {
  professionalId: string;
  patientEmails?: string[];
  onViewPatient?: (email: string) => void;
}

const TYPE_ICONS: Record<string, typeof Video> = {
  video_call: Video,
  in_person: MapPin,
  external: ExternalLink,
};

const TYPE_COLORS: Record<string, string> = {
  video_call: "bg-blue-500/10 text-blue-600 border-blue-200",
  in_person: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  external: "bg-amber-500/10 text-amber-600 border-amber-200",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-600 border-blue-200",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

interface KnownPatient {
  name: string;
  email: string;
}

/** Group appointments by time slot for side-by-side rendering */
function groupByTimeSlot(apts: Appointment[]): Appointment[][] {
  if (apts.length === 0) return [];
  const sorted = [...apts].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  const groups: Appointment[][] = [];
  let currentGroup: Appointment[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].appointment_time.slice(0, 5) === sorted[i - 1].appointment_time.slice(0, 5)) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [sorted[i]];
    }
  }
  groups.push(currentGroup);
  return groups;
}

const ProSchedule = ({ professionalId, patientEmails, onViewPatient }: ProScheduleProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const locale = language === "en" ? enUS : language === "es" ? es : ptBR;

  const daysToShow = isMobile ? 3 : 7;
  const [viewDate, setViewDate] = useState(() => new Date());
  const startDate = isMobile ? viewDate : startOfWeek(viewDate, { weekStartsOn: 1 });

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Known patients from assessments
  const [knownPatients, setKnownPatients] = useState<KnownPatient[]>([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState<string>("__new__");

  // Form state
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState("50");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState("in_person");
  const [formNotes, setFormNotes] = useState("");

  // Long-press state for session notes popup
  const [longPressApt, setLongPressApt] = useState<Appointment | null>(null);
  const [longPressNotes, setLongPressNotes] = useState<any[]>([]);
  const [longPressLoading, setLongPressLoading] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag-and-drop state
  const [draggedApt, setDraggedApt] = useState<Appointment | null>(null);
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null);

  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
  const rangeStart = format(days[0], "yyyy-MM-dd");
  const rangeEnd = format(days[days.length - 1], "yyyy-MM-dd");

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase.from("professional_appointments" as any) as any)
      .select("*")
      .eq("professional_id", professionalId)
      .gte("appointment_date", rangeStart)
      .lte("appointment_date", rangeEnd)
      .order("appointment_time", { ascending: true });
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  }, [professionalId, rangeStart, rangeEnd]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Fetch known patients from BOTH assessments AND appointments
  useEffect(() => {
    const fetchPatients = async () => {
      const map = new Map<string, KnownPatient>();
      const { data: assessData } = await supabase
        .from("assessments")
        .select("patient_name, patient_email")
        .eq("professional_id", professionalId)
        .not("patient_email", "is", null);
      if (assessData) {
        assessData.forEach((a) => {
          if (a.patient_email && a.patient_name) {
            map.set(a.patient_email, { name: a.patient_name, email: a.patient_email });
          }
        });
      }
      const { data: aptData } = await (supabase.from("professional_appointments" as any) as any)
        .select("patient_name, patient_email")
        .eq("professional_id", professionalId)
        .not("patient_email", "is", null);
      if (aptData) {
        (aptData as any[]).forEach((a) => {
          if (a.patient_email && a.patient_name && !map.has(a.patient_email)) {
            map.set(a.patient_email, { name: a.patient_name, email: a.patient_email });
          }
        });
      }
      setKnownPatients(Array.from(map.values()));
    };
    fetchPatients();
  }, [professionalId]);

  const [emailWarning, setEmailWarning] = useState(false);

  const navigateWeek = (dir: number) => setViewDate((prev) => addDays(prev, dir * daysToShow));

  const handleSelectPatient = (key: string) => {
    setSelectedPatientKey(key);
    setEmailWarning(false);
    if (key === "__new__") {
      setFormName("");
      setFormEmail("");
    } else {
      const patient = knownPatients.find((p) => p.email === key);
      if (patient) {
        setFormName(patient.name);
        setFormEmail(patient.email);
      }
    }
  };

  const openNew = (date?: Date) => {
    setEditingApt(null);
    setFormDate(date || new Date());
    setFormTime("09:00");
    setFormDuration("50");
    setFormName("");
    setFormEmail("");
    setFormType("in_person");
    setFormNotes("");
    setSelectedPatientKey("__new__");
    setModalOpen(true);
  };

  const openEdit = (apt: Appointment) => {
    setEditingApt(apt);
    setFormDate(new Date(apt.appointment_date + "T12:00:00"));
    setFormTime(apt.appointment_time?.slice(0, 5) || "09:00");
    setFormDuration(String(apt.duration_minutes));
    setFormName(apt.patient_name);
    setFormEmail(apt.patient_email || "");
    setFormType(apt.type);
    setFormNotes(apt.notes || "");
    const match = knownPatients.find((p) => p.email === apt.patient_email);
    setSelectedPatientKey(match ? match.email : "__new__");
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) return;
    if (selectedPatientKey === "__new__" && !formEmail.trim()) {
      setEmailWarning(true);
      return;
    }
    setSaving(true);
    try {
      const trimmedEmail = formEmail.trim();
      const payload = {
        professional_id: professionalId,
        patient_name: formName.trim(),
        patient_email: trimmedEmail || null,
        appointment_date: format(formDate, "yyyy-MM-dd"),
        appointment_time: formTime,
        duration_minutes: parseInt(formDuration) || 50,
        type: formType,
        notes: formNotes || null,
      };
      if (editingApt) {
        await (supabase.from("professional_appointments" as any) as any)
          .update(payload)
          .eq("id", editingApt.id);
      } else {
        await (supabase.from("professional_appointments" as any) as any).insert(payload);
        if (selectedPatientKey === "__new__" && trimmedEmail) {
          const { data: existing } = await supabase
            .from("assessments")
            .select("id")
            .eq("professional_id", professionalId)
            .eq("patient_email", trimmedEmail)
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from("assessments").insert({
              type: "professional",
              status: "completed",
              professional_id: professionalId,
              patient_name: formName.trim(),
              patient_email: trimmedEmail,
              anamnesis_data: { externalPatient: true },
            });
            window.dispatchEvent(new CustomEvent("reload-pro-patients"));
            toast({
              title: t("schedule.patient_created"),
              description: t("schedule.suggest_pre_assessment"),
              duration: 8000,
            });
          }
        }
      }
      toast({ title: editingApt ? t("schedule.updated") : t("schedule.created") });
      setModalOpen(false);
      setKnownPatients((prev) => {
        const trimmedEmail = formEmail.trim();
        if (trimmedEmail && !prev.find((p) => p.email === trimmedEmail)) {
          return [...prev, { name: formName.trim(), email: trimmedEmail }];
        }
        return prev;
      });
      fetchAppointments();
    } catch {
      toast({ title: t("schedule.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await (supabase.from("professional_appointments" as any) as any).delete().eq("id", deleteId);
      toast({ title: t("schedule.deleted") });
      setDeleteId(null);
      setModalOpen(false);
      fetchAppointments();
    } catch {
      toast({ title: t("schedule.error"), variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkComplete = async (id: string) => {
    await (supabase.from("professional_appointments" as any) as any)
      .update({ status: "completed" })
      .eq("id", id);
    fetchAppointments();
  };

  // --- Drag & Drop handlers ---
  const handleDragStart = (e: React.DragEvent, apt: Appointment) => {
    setDraggedApt(apt);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", apt.id);
    // Make ghost semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedApt(null);
    setDropTargetDate(null);
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetDate(dateStr);
  };

  const handleDragLeave = () => {
    setDropTargetDate(null);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDropTargetDate(null);
    if (!draggedApt || draggedApt.appointment_date === dateStr) {
      setDraggedApt(null);
      return;
    }
    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) => (a.id === draggedApt.id ? { ...a, appointment_date: dateStr } : a))
    );
    try {
      await (supabase.from("professional_appointments" as any) as any)
        .update({ appointment_date: dateStr })
        .eq("id", draggedApt.id);
      toast({
        title: language === "pt" ? "Agendamento movido" : language === "es" ? "Cita movida" : "Appointment moved",
      });
    } catch {
      // Revert on error
      fetchAppointments();
      toast({ title: t("schedule.error"), variant: "destructive" });
    }
    setDraggedApt(null);
  };

  // Long press handlers
  const startLongPress = (apt: Appointment) => {
    longPressTimer.current = setTimeout(async () => {
      setLongPressApt(apt);
      if (apt.patient_email) {
        setLongPressLoading(true);
        const { data } = await (supabase.from("session_notes" as any) as any)
          .select("*")
          .eq("professional_id", professionalId)
          .eq("patient_email", apt.patient_email)
          .eq("session_date", apt.appointment_date)
          .order("created_at", { ascending: false });
        setLongPressNotes(data || []);
        setLongPressLoading(false);
      }
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const isPt = language === "pt";

  return (
    <div className="space-y-4">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h3 className="text-sm font-semibold text-foreground">
            {format(days[0], "dd MMM", { locale })} — {format(days[days.length - 1], "dd MMM yyyy", { locale })}
          </h3>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => setViewDate(new Date())}
          >
            {t("schedule.today")}
          </Button>
          <Button size="sm" className="gap-1.5 rounded-xl text-xs" onClick={() => openNew()}>
            <Plus className="h-3.5 w-3.5" />
            {t("schedule.new")}
          </Button>
        </div>
      </div>

      {/* Drag hint */}
      {!isMobile && (
        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          {isPt ? "Arraste os cards para reagendar" : language === "es" ? "Arrastra las tarjetas para reprogramar" : "Drag cards to reschedule"}
        </p>
      )}

      {/* Calendar Grid */}
      <div className={cn("grid gap-3", isMobile ? "grid-cols-3" : "grid-cols-7")}>
        {days.map((day) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const isToday = isSameDay(day, new Date());
          const dayApts = appointments.filter((a) => a.appointment_date === dateStr);
          const timeGroups = groupByTimeSlot(dayApts);
          const isDragOver = dropTargetDate === dateStr;

          return (
            <div
              key={dateStr}
              className={cn("space-y-1.5 transition-colors rounded-lg", isDragOver && "bg-primary/5 ring-2 ring-primary/30")}
              onDragOver={(e) => handleDragOver(e, dateStr)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, dateStr)}
            >
              {/* Day header */}
              <div
                className={cn(
                  "text-center py-1.5 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors",
                  isToday && "bg-primary/10 border border-primary/30"
                )}
                onClick={() => openNew(day)}
              >
                <p className="text-[10px] uppercase text-muted-foreground font-medium">
                  {format(day, "EEE", { locale })}
                </p>
                <p className={cn("text-sm font-bold", isToday ? "text-primary" : "text-foreground")}>
                  {format(day, "dd")}
                </p>
              </div>

              {/* Appointments */}
              <div className="space-y-1 min-h-[60px]">
                {loading ? (
                  <div className="flex justify-center py-2">
                    <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : dayApts.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/40 text-center py-2">—</p>
                ) : (
                  timeGroups.map((group, gi) => {
                    const isConcurrent = group.length > 1;
                    return (
                      <div key={gi} className={cn(isConcurrent ? "flex gap-0.5" : "")}>
                        {group.map((apt) => (
                          <AppointmentCard
                            key={apt.id}
                            apt={apt}
                            isConcurrent={isConcurrent}
                            concurrentCount={group.length}
                            onEdit={openEdit}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            onLongPressStart={startLongPress}
                            onLongPressCancel={cancelLongPress}
                            isMobile={isMobile}
                          />
                        ))}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Appointment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingApt ? t("schedule.edit") : t("schedule.new")}</DialogTitle>
            <DialogDescription>{t("schedule.form_desc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("schedule.date")}</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-1.5 mt-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {format(formDate, "dd/MM/yyyy")}
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
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("schedule.time")}</label>
                <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="mt-1 text-xs h-9" />
              </div>
            </div>
            {/* Patient selector */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("schedule.select_patient")}</label>
              <Select value={selectedPatientKey} onValueChange={handleSelectPatient}>
                <SelectTrigger className="mt-1 text-xs h-9">
                  <SelectValue placeholder={t("schedule.select_patient_ph")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__">{t("schedule.new_patient")}</SelectItem>
                  {knownPatients.map((p) => (
                    <SelectItem key={p.email} value={p.email}>
                      {p.name} ({p.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("schedule.patient_name")} *</label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t("schedule.patient_name_ph")}
                className="mt-1 text-xs h-9"
                disabled={selectedPatientKey !== "__new__"}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                {t("schedule.patient_email")} {selectedPatientKey === "__new__" && "*"}
              </label>
              <Input
                value={formEmail}
                onChange={(e) => { setFormEmail(e.target.value); setEmailWarning(false); }}
                placeholder={t("schedule.patient_email_ph")}
                className={cn("mt-1 text-xs h-9", emailWarning && "border-destructive")}
                disabled={selectedPatientKey !== "__new__"}
              />
              {emailWarning && (
                <p className="text-[10px] text-destructive mt-1">{t("schedule.email_required")}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("schedule.type")}</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="mt-1 text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">{t("schedule.type_in_person")}</SelectItem>
                    <SelectItem value="video_call">{t("schedule.type_video_call")}</SelectItem>
                    <SelectItem value="external">{t("schedule.type_external")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("schedule.duration")}</label>
                <Input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} className="mt-1 text-xs h-9" min="15" max="180" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">{t("schedule.notes")}</label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={t("schedule.notes_ph")} className="mt-1 text-xs min-h-[60px]" />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingApt && (
              <div className="flex gap-2 mr-auto">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5"
                  onClick={() => { setDeleteId(editingApt.id); }}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  {t("schedule.delete")}
                </Button>
                {editingApt.status === "scheduled" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                    onClick={() => { handleMarkComplete(editingApt.id); setModalOpen(false); }}
                  >
                    {t("schedule.mark_complete")}
                  </Button>
                )}
              </div>
            )}
            {editingApt?.patient_email && onViewPatient && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => {
                onViewPatient(editingApt.patient_email!);
                setModalOpen(false);
              }}>
                {t("schedule.view_patient")}
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" className="gap-1.5 rounded-xl" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarIcon className="h-3.5 w-3.5" />}
              {editingApt ? t("schedule.save_edit") : t("schedule.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("schedule.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("schedule.delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t("session_notes.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("schedule.confirm_delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Long-press session notes popup */}
      <Dialog open={!!longPressApt} onOpenChange={(open) => { if (!open) setLongPressApt(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <NotebookPen className="h-4 w-4 text-primary" />
              {t("session_notes.title")} — {longPressApt?.patient_name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {longPressApt && format(new Date(longPressApt.appointment_date + "T12:00:00"), "dd/MM/yyyy")}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px]">
            {longPressLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : longPressNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">{t("session_notes.empty_day")}</p>
            ) : (
              <div className="space-y-2">
                {longPressNotes.map((n: any) => (
                  <div key={n.id} className="rounded-lg border p-2.5 space-y-1">
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(n.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-xs text-foreground whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/** Individual appointment card with drag support and concurrent tooltip */
const AppointmentCard = ({
  apt,
  isConcurrent,
  concurrentCount,
  onEdit,
  onDragStart,
  onDragEnd,
  onLongPressStart,
  onLongPressCancel,
  isMobile,
}: {
  apt: Appointment;
  isConcurrent: boolean;
  concurrentCount: number;
  onEdit: (apt: Appointment) => void;
  onDragStart: (e: React.DragEvent, apt: Appointment) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onLongPressStart: (apt: Appointment) => void;
  onLongPressCancel: () => void;
  isMobile: boolean;
}) => {
  const Icon = TYPE_ICONS[apt.type] || MapPin;
  const statusColor = STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled;
  const typeLabel = apt.type === "video_call" ? "Videochamada" : apt.type === "in_person" ? "Presencial" : "Externo";

  const cardContent = (
    <div
      className={cn(
        "rounded-lg border cursor-pointer transition-all hover:shadow-sm active:scale-[0.97]",
        statusColor,
        apt.status === "cancelled" && "opacity-50",
        isConcurrent ? "p-1 flex-1 min-w-0" : "p-1.5"
      )}
      draggable={!isMobile}
      onDragStart={(e) => onDragStart(e, apt)}
      onDragEnd={onDragEnd}
      onClick={() => onEdit(apt)}
      onTouchStart={() => onLongPressStart(apt)}
      onTouchEnd={onLongPressCancel}
      onTouchCancel={onLongPressCancel}
      onMouseDown={() => onLongPressStart(apt)}
      onMouseUp={onLongPressCancel}
      onMouseLeave={onLongPressCancel}
    >
      <div className="flex items-center gap-1">
        <Clock className="h-2.5 w-2.5 shrink-0" />
        <span className="text-[10px] font-bold tabular-nums">{apt.appointment_time?.slice(0, 5)}</span>
        {!isMobile && !isConcurrent && <GripVertical className="h-2.5 w-2.5 ml-auto text-muted-foreground/40" />}
      </div>
      {isConcurrent ? (
        // Minimized: only show first name + icon
        <div className="flex items-center gap-0.5 mt-0.5">
          <Icon className="h-2.5 w-2.5 shrink-0" />
          <p className="text-[9px] font-medium truncate leading-tight">
            {apt.patient_name.split(" ")[0]}
          </p>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-medium truncate leading-tight mt-0.5">{apt.patient_name}</p>
          <Icon className="h-2.5 w-2.5 mt-0.5" />
        </>
      )}
    </div>
  );

  // Wrap concurrent cards in a Tooltip for full details on hover
  if (isConcurrent && !isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {cardContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] space-y-1">
          <p className="text-xs font-semibold">{apt.patient_name}</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {apt.appointment_time?.slice(0, 5)} — {apt.duration_minutes}min
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Icon className="h-3 w-3" />
            {typeLabel}
          </div>
          {apt.patient_email && (
            <p className="text-[10px] text-muted-foreground truncate">{apt.patient_email}</p>
          )}
          {apt.notes && (
            <p className="text-[10px] text-muted-foreground italic line-clamp-2">{apt.notes}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
};

export default ProSchedule;
