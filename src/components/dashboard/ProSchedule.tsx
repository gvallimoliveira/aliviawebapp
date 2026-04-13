import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { DEMO_APPOINTMENTS, DEMO_TEAM } from "@/data/mockClinicData";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
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
  Loader2, Trash2, GripVertical, Upload,
} from "lucide-react";
import AgendaImportModal from "./AgendaImportModal";

interface Appointment {
  id: string;
  professional_id: string;
  clinic_id?: string | null;
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
  professionalId?: string;
  clinicId?: string | null;
  patientEmails?: string[];
  onViewPatient?: (email: string) => void;
  isSimulated?: boolean;
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

// Default time range 07:00-20:00, expanded if appointments exist outside
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 20;

function getTimeRange(apts: Appointment[]): string[] {
  let minH = DEFAULT_START_HOUR;
  let maxH = DEFAULT_END_HOUR;
  for (const a of apts) {
    const h = parseInt(a.appointment_time?.slice(0, 2) || "9", 10);
    if (h < minH) minH = h;
    const endH = h + Math.ceil(a.duration_minutes / 60);
    if (endH > maxH) maxH = endH;
  }
  const slots: string[] = [];
  for (let h = minH; h <= maxH; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
  }
  return slots;
}

function getAptsForSlot(apts: Appointment[], slotHour: string): Appointment[] {
  const h = parseInt(slotHour.slice(0, 2), 10);
  return apts.filter((a) => {
    const ah = parseInt(a.appointment_time?.slice(0, 2) || "0", 10);
    return ah === h;
  });
}

const ProSchedule = ({ professionalId, clinicId, patientEmails, onViewPatient, isSimulated = false }: ProScheduleProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const locale = language === "en" ? enUS : language === "es" ? es : ptBR;
  const isPt = language === "pt";

  const daysToShow = isMobile ? 3 : 7;
  const [viewDate, setViewDate] = useState(() => new Date());
  const startDate = isMobile ? viewDate : startOfWeek(viewDate, { weekStartsOn: 1 });

  const [appointments, setAppointments] = useState<Appointment[]>(isSimulated ? (DEMO_APPOINTMENTS as Appointment[]) : []);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApt, setEditingApt] = useState<Appointment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [knownPatients, setKnownPatients] = useState<KnownPatient[]>([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState<string>("__new__");

  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState("50");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState("in_person");
  const [formNotes, setFormNotes] = useState("");
  const [emailWarning, setEmailWarning] = useState(false);
  const [formProfessionalId, setFormProfessionalId] = useState(professionalId || "");

  // Clinic professionals for secretary mode
  const [clinicProfessionals, setClinicProfessionals] = useState<{ id: string; full_name: string }[]>([]);
  const isClinicOnlyMode = !professionalId && !!clinicId;

  useEffect(() => {
    if (!clinicId || isSimulated) {
      if (isSimulated) {
        const simPros = DEMO_TEAM.filter(t => t.role === "owner" || t.role === "therapist")
          .map(t => ({ id: t.id, full_name: t.full_name }));
        setClinicProfessionals(simPros);
        if (simPros.length > 0 && !professionalId) setFormProfessionalId(simPros[0].id);
      }
      return;
    }
    const fetchClinicPros = async () => {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("user_id")
        .eq("clinic_id", clinicId)
        .eq("status", "active")
        .in("role", ["owner", "therapist"]);
      if (!members || members.length === 0) return;
      const userIds = members.map((m) => m.user_id);
      const { data: pros } = await supabase
        .from("professionals")
        .select("id, full_name")
        .in("user_id", userIds);
      setClinicProfessionals(pros || []);
      if (pros && pros.length > 0 && !professionalId) {
        setFormProfessionalId(pros[0].id);
      }
    };
    fetchClinicPros();
  }, [clinicId, professionalId, isSimulated]);

  // Drag state
  const [draggedApt, setDraggedApt] = useState<Appointment | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; hour?: string } | null>(null);

  const days = Array.from({ length: daysToShow }, (_, i) => addDays(startDate, i));
  const rangeStart = format(days[0], "yyyy-MM-dd");
  const rangeEnd = format(days[days.length - 1], "yyyy-MM-dd");

  const timeSlots = getTimeRange(appointments);

  const fetchAppointments = useCallback(async () => {
    if (isSimulated) { setLoading(false); return; }
    setLoading(true);
    let query = (supabase.from("professional_appointments" as any) as any)
      .select("*")
      .gte("appointment_date", rangeStart)
      .lte("appointment_date", rangeEnd)
      .order("appointment_time", { ascending: true });
    if (clinicId) {
      query = query.eq("clinic_id", clinicId);
    } else {
      query = query.eq("professional_id", professionalId);
    }
    const { data } = await query;
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  }, [professionalId, clinicId, rangeStart, rangeEnd, isSimulated]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Realtime: auto-refresh appointments on changes
  useEffect(() => {
    if (isSimulated) return;
    const filter = clinicId
      ? `clinic_id=eq.${clinicId}`
      : professionalId
        ? `professional_id=eq.${professionalId}`
        : null;
    if (!filter) return;
    const channel = supabase
      .channel(`schedule-rt-${clinicId || professionalId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "professional_appointments", filter },
        () => { fetchAppointments(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [clinicId, professionalId, isSimulated, fetchAppointments]);

  useEffect(() => {
    if (isSimulated) return;
    const fetchPatients = async () => {
      const map = new Map<string, KnownPatient>();
      if (clinicId) {
        // Fetch patients from clinic assessments
        const { data: assessData } = await supabase
          .from("assessments")
          .select("patient_name, patient_email")
          .eq("clinic_id", clinicId)
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
          .eq("clinic_id", clinicId)
          .not("patient_email", "is", null);
        if (aptData) {
          (aptData as any[]).forEach((a) => {
            if (a.patient_email && a.patient_name && !map.has(a.patient_email)) {
              map.set(a.patient_email, { name: a.patient_name, email: a.patient_email });
            }
          });
        }
      } else if (professionalId) {
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
      }
      setKnownPatients(Array.from(map.values()));
    };
    fetchPatients();
  }, [professionalId, clinicId]);

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

  const openNew = (date?: Date, time?: string) => {
    setEditingApt(null);
    setFormDate(date || new Date());
    setFormTime(time || "09:00");
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
      const effectiveProfId = professionalId || formProfessionalId;
      if (!effectiveProfId) {
        toast({ title: isPt ? "Selecione um profissional" : "Select a professional", variant: "destructive" });
        setSaving(false);
        return;
      }
      const trimmedEmail = formEmail.trim();
      const payload: any = {
        professional_id: effectiveProfId,
        patient_name: formName.trim(),
        patient_email: trimmedEmail || null,
        appointment_date: format(formDate, "yyyy-MM-dd"),
        appointment_time: formTime,
        duration_minutes: parseInt(formDuration) || 50,
        type: formType,
        notes: formNotes || null,
      };
      if (clinicId) payload.clinic_id = clinicId;

      if (isSimulated) {
        if (editingApt) {
          setAppointments(prev => prev.map(a => a.id === editingApt.id ? { ...a, ...payload } : a));
        } else {
          const newApt: Appointment = { id: `sim-${Date.now()}`, ...payload, status: "scheduled", created_at: new Date().toISOString() };
          setAppointments(prev => [...prev, newApt]);
        }
        toast({ title: editingApt ? t("schedule.updated") : t("schedule.created") });
        setModalOpen(false);
        setSaving(false);
        return;
      }

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
            .eq("professional_id", effectiveProfId)
            .eq("patient_email", trimmedEmail)
            .limit(1);
          if (!existing || existing.length === 0) {
            await supabase.from("assessments").insert({
              type: "professional",
              status: "completed",
              professional_id: effectiveProfId,
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
        const te = formEmail.trim();
        if (te && !prev.find((p) => p.email === te)) {
          return [...prev, { name: formName.trim(), email: te }];
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
    if (isSimulated) {
      setAppointments(prev => prev.filter(a => a.id !== deleteId));
      toast({ title: t("schedule.deleted") });
      setDeleteId(null);
      setModalOpen(false);
      setDeleting(false);
      return;
    }
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
    if (isSimulated) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: "completed" } : a));
      return;
    }
    await (supabase.from("professional_appointments" as any) as any)
      .update({ status: "completed" })
      .eq("id", id);
    fetchAppointments();
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, apt: Appointment) => {
    setDraggedApt(apt);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", apt.id);
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.4";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDraggedApt(null);
    setDropTarget(null);
  };

  const handleCellDragOver = (e: React.DragEvent, dateStr: string, slotHour: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTarget({ date: dateStr, hour: slotHour });
  };

  const handleCellDragLeave = () => {
    setDropTarget(null);
  };

  const handleCellDrop = async (e: React.DragEvent, dateStr: string, slotHour: string) => {
    e.preventDefault();
    setDropTarget(null);
    if (!draggedApt) return;

    const newTime = slotHour.slice(0, 2) + ":" + (draggedApt.appointment_time?.slice(3, 5) || "00");
    const sameDate = draggedApt.appointment_date === dateStr;
    const sameTime = draggedApt.appointment_time?.slice(0, 2) === slotHour.slice(0, 2);
    if (sameDate && sameTime) { setDraggedApt(null); return; }

    // Optimistic update
    setAppointments((prev) =>
      prev.map((a) => (a.id === draggedApt.id ? { ...a, appointment_date: dateStr, appointment_time: newTime } : a))
    );
    if (isSimulated) {
      toast({ title: isPt ? "Agendamento movido" : "Appointment moved" });
      setDraggedApt(null);
      return;
    }
    try {
      await (supabase.from("professional_appointments" as any) as any)
        .update({ appointment_date: dateStr, appointment_time: newTime })
        .eq("id", draggedApt.id);
      toast({ title: isPt ? "Agendamento movido" : "Appointment moved" });
    } catch {
      fetchAppointments();
      toast({ title: t("schedule.error"), variant: "destructive" });
    }
    setDraggedApt(null);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
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
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setViewDate(new Date())}>
            {t("schedule.today")}
          </Button>
          {!isSimulated && (professionalId || isClinicOnlyMode) && (
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setImportModalOpen(true)}>
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isPt ? "Importar" : "Import"}</span>
            </Button>
          )}
          <Button size="sm" className="gap-1.5 rounded-xl text-xs" onClick={() => openNew()}>
            <Plus className="h-3.5 w-3.5" />
            {t("schedule.new")}
          </Button>
        </div>
      </div>

      {!isMobile && (
        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
          <GripVertical className="h-3 w-3" />
          {isPt ? "Arraste os cards para reagendar" : "Drag cards to reschedule"}
        </p>
      )}

      {/* Time-slot grid */}
      <div className="h-[420px] rounded-lg border border-border/40 overflow-auto">
        <div className={cn("min-w-0", isMobile && "min-w-[500px]")}>
          {/* Day headers — sticky */}
          <div className={cn("grid sticky top-0 z-10 bg-background border-b border-border/40", isMobile ? "grid-cols-[40px_repeat(3,1fr)]" : "grid-cols-[48px_repeat(7,1fr)]")}>
            <div className="py-2 px-1" /> {/* time gutter */}
            {days.map((day) => {
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className={cn(
                    "text-center py-2 border-l border-border/30",
                    isToday && "bg-primary/10"
                  )}
                >
                  <p className="text-[10px] uppercase text-muted-foreground font-medium">
                    {format(day, "EEE", { locale })}
                  </p>
                  <p className={cn("text-sm font-bold", isToday ? "text-primary" : "text-foreground")}>
                    {format(day, "dd")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Time rows */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            timeSlots.map((slot) => (
              <div
                key={slot}
                className={cn("grid border-b border-border/20", isMobile ? "grid-cols-[40px_repeat(3,1fr)]" : "grid-cols-[48px_repeat(7,1fr)]")}
              >
                {/* Time label */}
                <div className="py-2 px-1 text-[10px] text-muted-foreground font-medium text-right pr-2 tabular-nums border-r border-border/30">
                  {slot}
                </div>

                {/* Day cells */}
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const cellApts = getAptsForSlot(
                    appointments.filter((a) => a.appointment_date === dateStr),
                    slot
                  );
                  const isOver = dropTarget?.date === dateStr && dropTarget?.hour === slot;

                  return (
                    <div
                      key={`${dateStr}-${slot}`}
                      className={cn(
                        "border-l border-border/20 min-h-[40px] p-0.5 transition-colors cursor-pointer hover:bg-muted/30",
                        isOver && "bg-primary/10 ring-1 ring-primary/40"
                      )}
                      onClick={() => {
                        if (cellApts.length === 0) openNew(day, slot);
                      }}
                      onDragOver={(e) => handleCellDragOver(e, dateStr, slot)}
                      onDragLeave={handleCellDragLeave}
                      onDrop={(e) => handleCellDrop(e, dateStr, slot)}
                    >
                      {cellApts.length > 0 && (
                        <div className={cn("flex gap-0.5", cellApts.length > 1 ? "flex-row" : "")}>
                          {cellApts.map((apt) => (
                            <AppointmentCard
                              key={apt.id}
                              apt={apt}
                              isConcurrent={cellApts.length > 1}
                              onEdit={openEdit}
                              onDragStart={handleDragStart}
                              onDragEnd={handleDragEnd}
                              isMobile={isMobile}
                              isPt={isPt}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Appointment Modal — scrollable */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingApt ? t("schedule.edit") : t("schedule.new")}</DialogTitle>
            <DialogDescription>{t("schedule.form_desc")}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-3 pb-4">
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
              {isClinicOnlyMode && clinicProfessionals.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{isPt ? "Profissional" : "Professional"} *</label>
                  <Select value={formProfessionalId} onValueChange={setFormProfessionalId}>
                    <SelectTrigger className="mt-1 text-xs h-9">
                      <SelectValue placeholder={isPt ? "Selecione o profissional" : "Select professional"} />
                    </SelectTrigger>
                    <SelectContent>
                      {clinicProfessionals.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/40">
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

      {/* AI Agenda Import Modal */}
      {(professionalId || isClinicOnlyMode) && (
        <AgendaImportModal
          open={importModalOpen}
          onOpenChange={setImportModalOpen}
          professionalId={professionalId || formProfessionalId}
          clinicId={clinicId}
          onImported={() => {
            if (isSimulated) return;
            fetchAppointments();
          }}
        />
      )}
    </div>
  );
};

/** Appointment card with drag + tooltip for concurrent */
const AppointmentCard = ({
  apt, isConcurrent, onEdit, onDragStart, onDragEnd, isMobile, isPt,
}: {
  apt: Appointment;
  isConcurrent: boolean;
  onEdit: (apt: Appointment) => void;
  onDragStart: (e: React.DragEvent, apt: Appointment) => void;
  onDragEnd: (e: React.DragEvent) => void;
  isMobile: boolean;
  isPt: boolean;
}) => {
  const Icon = TYPE_ICONS[apt.type] || MapPin;
  const statusColor = STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled;
  const typeLabel = apt.type === "video_call" ? "Videochamada" : apt.type === "in_person" ? "Presencial" : "Externo";

  const card = (
    <div
      className={cn(
        "rounded-md border cursor-pointer transition-all hover:shadow-sm active:scale-[0.97]",
        statusColor,
        apt.status === "cancelled" && "opacity-50",
        isConcurrent ? "p-0.5 flex-1 min-w-0" : "p-1"
      )}
      draggable={!isMobile}
      onDragStart={(e) => { e.stopPropagation(); onDragStart(e, apt); }}
      onDragEnd={onDragEnd}
      onClick={(e) => { e.stopPropagation(); onEdit(apt); }}
    >
      <div className="flex items-center gap-0.5">
        <span className="text-[9px] font-bold tabular-nums">{apt.appointment_time?.slice(0, 5)}</span>
        {!isMobile && !isConcurrent && <GripVertical className="h-2 w-2 ml-auto text-muted-foreground/40" />}
      </div>
      {isConcurrent ? (
        <div className="flex items-center gap-0.5 mt-0.5">
          <Icon className="h-2 w-2 shrink-0" />
          <p className="text-[8px] font-medium truncate leading-tight">{apt.patient_name.split(" ")[0]}</p>
        </div>
      ) : (
        <>
          <p className="text-[9px] font-medium truncate leading-tight mt-0.5">{apt.patient_name}</p>
          <Icon className="h-2 w-2 mt-0.5" />
        </>
      )}
    </div>
  );

  if (isConcurrent && !isMobile) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] space-y-1">
          <p className="text-xs font-semibold">{apt.patient_name}</p>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {apt.appointment_time?.slice(0, 5)} — {apt.duration_minutes}min
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Icon className="h-3 w-3" /> {typeLabel}
          </div>
          {apt.patient_email && <p className="text-[10px] text-muted-foreground truncate">{apt.patient_email}</p>}
          {apt.notes && <p className="text-[10px] text-muted-foreground italic line-clamp-2">{apt.notes}</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return card;
};

export default ProSchedule;
