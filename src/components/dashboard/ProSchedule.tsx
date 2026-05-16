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
  Loader2, Trash2, GripVertical, Upload, Check, Pencil,
} from "lucide-react";
import AgendaImportModal from "./AgendaImportModal";
import { formatCpf, formatPhone } from "@/utils/masks";

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
  service_type?: string;
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

const SERVICE_TYPE_COLORS: Record<string, string> = {
  fisioterapia: "border-l-4 border-l-teal-500",
  pilates: "border-l-4 border-l-purple-500",
  osteopatia: "border-l-4 border-l-orange-500",
  massoterapia: "border-l-4 border-l-pink-500",
  rpg: "border-l-4 border-l-indigo-500",
};

const SERVICE_TYPE_DOT: Record<string, string> = {
  fisioterapia: "bg-teal-500",
  pilates: "bg-purple-500",
  osteopatia: "bg-orange-500",
  massoterapia: "bg-pink-500",
  rpg: "bg-indigo-500",
};

const SERVICE_TYPE_LABELS: Record<string, Record<string, string>> = {
  fisioterapia: { pt: "Fisioterapia", en: "Physiotherapy", es: "Fisioterapia" },
  pilates: { pt: "Pilates", en: "Pilates", es: "Pilates" },
  osteopatia: { pt: "Osteopatia", en: "Osteopathy", es: "Osteopatía" },
  massoterapia: { pt: "Massoterapia", en: "Massage Therapy", es: "Masoterapia" },
  rpg: { pt: "RPG", en: "RPG", es: "RPG" },
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-card text-foreground border-border",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200",
  no_show: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-200",
  no_show_justified: "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  completed: { pt: "Feito", en: "Done", es: "Hecho" },
  scheduled: { pt: "Em aberto", en: "Open", es: "Abierto" },
  no_show: { pt: "Falta", en: "No-show", es: "Falta" },
  no_show_justified: { pt: "Falta just.", en: "Justified", es: "Justificada" },
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
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [knownPatients, setKnownPatients] = useState<KnownPatient[]>([]);
  const [selectedPatientKey, setSelectedPatientKey] = useState<string>("__new__");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [formServiceType, setFormServiceType] = useState("fisioterapia");
  const [formDate, setFormDate] = useState<Date>(new Date());
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState("50");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formType, setFormType] = useState("in_person");
  const [formNotes, setFormNotes] = useState("");
  const [emailWarning, setEmailWarning] = useState(false);
  const [formProfessionalId, setFormProfessionalId] = useState(professionalId || "");
  const [formCpf, setFormCpf] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");

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
        .in("role", ["owner", "therapist", "osteopath", "pilates_instructor", "doctor", "rpg_specialist", "massage_therapist"]);
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

  // Evolution markers: set of "email|yyyy-mm-dd" indicating that an assessment/note exists for that patient on that day
  const [evolutionSet, setEvolutionSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (isSimulated) { setEvolutionSet(new Set()); return; }
    const emails = Array.from(new Set(appointments.map(a => a.patient_email).filter(Boolean))) as string[];
    if (emails.length === 0) { setEvolutionSet(new Set()); return; }
    let cancelled = false;
    const load = async () => {
      const startISO = `${rangeStart}T00:00:00`;
      const endISO = `${rangeEnd}T23:59:59`;
      let aq = supabase
        .from("assessments")
        .select("patient_email, created_at")
        .in("patient_email", emails)
        .gte("created_at", startISO)
        .lte("created_at", endISO);
      if (clinicId) aq = aq.eq("clinic_id", clinicId);
      else if (professionalId) aq = aq.eq("professional_id", professionalId);
      const { data: assess } = await aq;
      const set = new Set<string>();
      (assess || []).forEach((r: any) => {
        const day = (r.created_at as string).slice(0, 10);
        set.add(`${r.patient_email}|${day}`);
      });
      // Notes via join: get notes whose assessment belongs to this scope, updated in window
      let nq = supabase
        .from("professional_notes")
        .select("updated_at, assessments!inner(patient_email, professional_id, clinic_id)")
        .gte("updated_at", startISO)
        .lte("updated_at", endISO);
      if (clinicId) nq = nq.eq("assessments.clinic_id", clinicId);
      else if (professionalId) nq = nq.eq("assessments.professional_id", professionalId);
      const { data: notes } = await nq;
      (notes || []).forEach((r: any) => {
        const email = r.assessments?.patient_email;
        if (!email) return;
        const day = (r.updated_at as string).slice(0, 10);
        set.add(`${email}|${day}`);
      });
      if (!cancelled) setEvolutionSet(set);
    };
    load();
    return () => { cancelled = true; };
  }, [appointments, rangeStart, rangeEnd, clinicId, professionalId, isSimulated]);

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
    setFormServiceType("fisioterapia");
    setFormNotes("");
    setFormCpf("");
    setFormBirthDate("");
    setFormPhone("");
    setFormAddress("");
    setSelectedPatientKey("__new__");
    setModalOpen(true);
  };

  const openEdit = async (apt: Appointment) => {
    setEditingApt(apt);
    setFormDate(new Date(apt.appointment_date + "T12:00:00"));
    setFormTime(apt.appointment_time?.slice(0, 5) || "09:00");
    setFormDuration(String(apt.duration_minutes));
    setFormName(apt.patient_name);
    setFormEmail(apt.patient_email || "");
    setFormType(apt.type);
    setFormServiceType(apt.service_type || "fisioterapia");
    setFormNotes(apt.notes || "");
    setFormCpf("");
    setFormBirthDate("");
    setFormPhone("");
    setFormAddress("");
    const match = knownPatients.find((p) => p.email === apt.patient_email);
    setSelectedPatientKey(match ? match.email : "__new__");
    setModalOpen(true);

    // Load extra fields from patients table
    if (apt.patient_name || apt.patient_email) {
      try {
        let query = (supabase.from("patients" as any) as any).select("*");
        if (clinicId) {
          query = query.eq("clinic_id", clinicId);
        } else if (professionalId) {
          query = query.eq("professional_id", professionalId);
        }
        if (apt.patient_email) {
          query = query.eq("email", apt.patient_email);
        } else {
          query = query.eq("full_name", apt.patient_name);
        }
        const { data } = await query.limit(1);
        if (data && data.length > 0) {
          const p = data[0];
          setFormCpf(p.cpf ? formatCpf(p.cpf) : "");
          setFormBirthDate(p.birth_date || "");
          setFormPhone(p.phone ? formatPhone(p.phone) : "");
          setFormAddress(p.address || "");
        }
      } catch {}
    }
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
        service_type: formServiceType,
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

      // Build patient data for upsert
      const patientRow: any = {
        full_name: formName.trim(),
        email: trimmedEmail || null,
        cpf: formCpf.replace(/\D/g, "") || null,
        birth_date: formBirthDate || null,
        phone: formPhone.replace(/\D/g, "") || null,
        address: formAddress.trim() || null,
      };
      if (clinicId) {
        patientRow.clinic_id = clinicId;
      } else {
        patientRow.professional_id = effectiveProfId;
      }

      if (editingApt) {
        await (supabase.from("professional_appointments" as any) as any)
          .update(payload)
          .eq("id", editingApt.id);

        // Also update patients table (match by email or name)
        if (trimmedEmail || formName.trim()) {
          let matchQuery = (supabase.from("patients" as any) as any).select("id");
          if (clinicId) matchQuery = matchQuery.eq("clinic_id", clinicId);
          else matchQuery = matchQuery.eq("professional_id", effectiveProfId);
          if (editingApt.patient_email) matchQuery = matchQuery.eq("email", editingApt.patient_email);
          else matchQuery = matchQuery.eq("full_name", editingApt.patient_name);
          const { data: existingPatients } = await matchQuery.limit(1);

          if (existingPatients && existingPatients.length > 0) {
            await (supabase.from("patients" as any) as any)
              .update(patientRow)
              .eq("id", existingPatients[0].id);
          } else {
            await (supabase.from("patients" as any) as any).insert(patientRow);
          }
          window.dispatchEvent(new CustomEvent("reload-pro-patients"));
        }
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
            const assessmentInsert: any = {
              type: "professional",
              status: "completed",
              professional_id: effectiveProfId,
              patient_name: formName.trim(),
              patient_email: trimmedEmail,
              anamnesis_data: { externalPatient: true },
            };
            if (clinicId) assessmentInsert.clinic_id = clinicId;
            await supabase.from("assessments").insert(assessmentInsert);
            window.dispatchEvent(new CustomEvent("reload-pro-patients"));
            toast({
              title: t("schedule.patient_created"),
              description: t("schedule.suggest_pre_assessment"),
              duration: 8000,
            });
          }
        }
        // Create/update patient record with extra fields
        if (selectedPatientKey === "__new__" && formName.trim()) {
          await (supabase.from("patients" as any) as any).upsert(patientRow, { ignoreDuplicates: true });
          window.dispatchEvent(new CustomEvent("reload-pro-patients"));
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

  const handleSetStatus = async (id: string, newStatus: string) => {
    if (isSimulated) {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      setEditingApt(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
      return;
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    setEditingApt(prev => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
    await (supabase.from("professional_appointments" as any) as any)
      .update({ status: newStatus })
      .eq("id", id);
  };

  // Batch confirm all scheduled appointments for today
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayScheduledCount = appointments.filter(a => a.appointment_date === todayStr && a.status === "scheduled").length;

  const handleBatchConfirm = async () => {
    const todayScheduled = appointments.filter(a => a.appointment_date === todayStr && a.status === "scheduled");
    if (todayScheduled.length === 0) return;
    setBatchConfirming(true);
    try {
      if (isSimulated) {
        setAppointments(prev => prev.map(a =>
          a.appointment_date === todayStr && a.status === "scheduled" ? { ...a, status: "completed" } : a
        ));
      } else {
        const ids = todayScheduled.map(a => a.id);
        await (supabase.from("professional_appointments" as any) as any)
          .update({ status: "completed" })
          .in("id", ids);
        await fetchAppointments();
      }
      toast({ title: isPt ? `${todayScheduled.length} atendimento(s) confirmado(s)` : `${todayScheduled.length} appointment(s) confirmed` });
    } catch {
      toast({ title: t("schedule.error"), variant: "destructive" });
    } finally {
      setBatchConfirming(false);
    }
  };

  // --- Drag & Drop (Pointer Events: works on mouse + touch) ---
  // We avoid HTML5 native DnD because it doesn't work on touch devices.
  const persistMove = async (apt: Appointment, dateStr: string, slotHour: string) => {
    const newTime = slotHour.slice(0, 2) + ":" + (apt.appointment_time?.slice(3, 5) || "00");
    const sameDate = apt.appointment_date === dateStr;
    const sameTime = apt.appointment_time?.slice(0, 2) === slotHour.slice(0, 2);
    if (sameDate && sameTime) return;

    setAppointments((prev) =>
      prev.map((a) => (a.id === apt.id ? { ...a, appointment_date: dateStr, appointment_time: newTime } : a))
    );
    if (isSimulated) {
      toast({ title: isPt ? "Agendamento movido" : "Appointment moved" });
      return;
    }
    try {
      await (supabase.from("professional_appointments" as any) as any)
        .update({ appointment_date: dateStr, appointment_time: newTime })
        .eq("id", apt.id);
      toast({ title: isPt ? "Agendamento movido" : "Appointment moved" });
    } catch {
      fetchAppointments();
      toast({ title: t("schedule.error"), variant: "destructive" });
    }
  };

  const handleCardPointerDown = (e: React.PointerEvent, apt: Appointment) => {
    // Only left mouse button or touch/pen
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();

    const cardEl = e.currentTarget as HTMLElement;
    const startX = e.clientX;
    const startY = e.clientY;
    const THRESHOLD = 6; // px before considered a drag (else click)
    let dragging = false;
    let ghost: HTMLElement | null = null;
    let didMove = false;
    let lastDropDate: string | null = null;
    let lastDropHour: string | null = null;
    let scrollRaf = 0;

    const beginDrag = () => {
      dragging = true;
      cardEl.style.opacity = "0.35";
      // Floating ghost preview
      ghost = cardEl.cloneNode(true) as HTMLElement;
      ghost.style.position = "fixed";
      ghost.style.pointerEvents = "none";
      ghost.style.zIndex = "9999";
      ghost.style.opacity = "0.9";
      ghost.style.width = `${cardEl.offsetWidth}px`;
      ghost.style.left = `${startX - cardEl.offsetWidth / 2}px`;
      ghost.style.top = `${startY - 12}px`;
      ghost.style.transform = "rotate(-1.5deg)";
      ghost.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
      document.body.appendChild(ghost);
      // Prevent text selection while dragging
      document.body.style.userSelect = "none";
    };

    const findCellAt = (x: number, y: number): { date: string; hour: string } | null => {
      // Hide ghost momentarily so elementFromPoint reads the cell beneath
      const prevDisplay = ghost?.style.display;
      if (ghost) ghost.style.display = "none";
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      if (ghost && prevDisplay !== undefined) ghost.style.display = prevDisplay;
      if (!el) return null;
      const cell = el.closest("[data-cell-date][data-cell-hour]") as HTMLElement | null;
      if (!cell) return null;
      return { date: cell.dataset.cellDate!, hour: cell.dataset.cellHour! };
    };

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging) {
        if (Math.hypot(dx, dy) < THRESHOLD) return;
        beginDrag();
      }
      didMove = true;
      ev.preventDefault();
      if (ghost) {
        ghost.style.left = `${ev.clientX - cardEl.offsetWidth / 2}px`;
        ghost.style.top = `${ev.clientY - 12}px`;
      }
      const target = findCellAt(ev.clientX, ev.clientY);
      if (target) {
        lastDropDate = target.date;
        lastDropHour = target.hour;
        setDropTarget({ date: target.date, hour: target.hour });
      } else {
        lastDropDate = null;
        lastDropHour = null;
        setDropTarget(null);
      }
      // Auto-scroll near viewport edges (helps on mobile)
      cancelAnimationFrame(scrollRaf);
      const margin = 60;
      const vh = window.innerHeight;
      let dyScroll = 0;
      if (ev.clientY < margin) dyScroll = -10;
      else if (ev.clientY > vh - margin) dyScroll = 10;
      if (dyScroll !== 0) {
        scrollRaf = requestAnimationFrame(() => window.scrollBy(0, dyScroll));
      }
    };

    const cleanup = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      cardEl.style.opacity = "1";
      document.body.style.userSelect = "";
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      cancelAnimationFrame(scrollRaf);
      setDropTarget(null);
    };

    const onUp = (ev: PointerEvent) => {
      if (dragging && didMove && lastDropDate && lastDropHour) {
        persistMove(apt, lastDropDate, lastDropHour);
        cleanup();
        // Suppress the synthetic click that would re-open the modal
        const blockClick = (cev: MouseEvent) => {
          cev.stopPropagation();
          cev.preventDefault();
          window.removeEventListener("click", blockClick, true);
        };
        window.addEventListener("click", blockClick, true);
        setTimeout(() => window.removeEventListener("click", blockClick, true), 50);
      } else if (!dragging) {
        // Treat as click → open editor
        cleanup();
        openEdit(apt);
      } else {
        cleanup();
      }
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors px-1 py-0.5 rounded-md hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
                aria-label={isPt ? "Selecionar data" : "Pick date"}
              >
                {format(days[0], "dd MMM", { locale })} — {format(days[days.length - 1], "dd MMM yyyy", { locale })}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="center">
              <Calendar
                mode="single"
                selected={viewDate}
                onSelect={(d) => d && setViewDate(d)}
                initialFocus
                locale={locale}
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs" onClick={() => setViewDate(new Date())}>
            {t("schedule.today")}
          </Button>
          {todayScheduledCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs text-emerald-600 border-emerald-200 hover:bg-emerald-50"
              onClick={handleBatchConfirm}
              disabled={batchConfirming}
            >
              {batchConfirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{isPt ? `Confirmar ${todayScheduledCount}` : `Confirm ${todayScheduledCount}`}</span>
            </Button>
          )}
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

      {/* Service filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setServiceFilter("all")}
          className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
            serviceFilter === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {isPt ? "Todos" : "All"}
        </button>
        {Object.entries(SERVICE_TYPE_LABELS).map(([key, labels]) => (
          <button
            key={key}
            onClick={() => setServiceFilter(key)}
            className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors flex items-center gap-1.5",
              serviceFilter === key ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            <span className={cn("w-2 h-2 rounded-full", SERVICE_TYPE_DOT[key])} />
            {labels[language] || labels.en}
          </button>
        ))}
        {!isMobile && (
          <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 ml-auto">
            <GripVertical className="h-3 w-3" />
            {isPt ? "Arraste os cards para reagendar" : "Drag cards to reschedule"}
          </p>
        )}
      </div>

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
                  const filteredApts = serviceFilter === "all"
                    ? appointments.filter((a) => a.appointment_date === dateStr)
                    : appointments.filter((a) => a.appointment_date === dateStr && (a.service_type || "fisioterapia") === serviceFilter);
                  const cellApts = getAptsForSlot(filteredApts, slot);
                  const isOver = dropTarget?.date === dateStr && dropTarget?.hour === slot;

                  return (
                    <div
                      key={`${dateStr}-${slot}`}
                      data-cell-date={dateStr}
                      data-cell-hour={slot}
                      className={cn(
                        "border-l border-border/20 min-h-[40px] p-0.5 transition-colors cursor-pointer hover:bg-muted/30",
                        isOver && "bg-primary/10 ring-1 ring-primary/40"
                      )}
                      onClick={() => {
                        if (cellApts.length === 0) openNew(day, slot);
                      }}
                    >
                      {cellApts.length > 0 && (
                        <div className={cn("flex gap-0.5", cellApts.length > 1 ? "flex-row" : "")}>
                          {cellApts.map((apt) => (
                            <AppointmentCard
                              key={apt.id}
                              apt={apt}
                              isConcurrent={cellApts.length > 1}
                              onPointerDownCard={handleCardPointerDown}
                              isMobile={isMobile}
                              isPt={isPt}
                              hasEvolution={!!apt.patient_email && evolutionSet.has(`${apt.patient_email}|${apt.appointment_date}`)}
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
              {selectedPatientKey === "__new__" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">CPF</label>
                      <Input value={formCpf} onChange={(e) => setFormCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" className="mt-1 text-xs h-9" maxLength={14} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{isPt ? "Nascimento" : "Birth date"}</label>
                      <Input type="date" value={formBirthDate} onChange={(e) => setFormBirthDate(e.target.value)} className="mt-1 text-xs h-9" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{isPt ? "Celular" : "Phone"}</label>
                      <Input value={formPhone} onChange={(e) => setFormPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="mt-1 text-xs h-9" maxLength={15} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">{isPt ? "Endereço" : "Address"}</label>
                      <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder={isPt ? "Rua, nº, bairro" : "Street, number"} className="mt-1 text-xs h-9" />
                    </div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{isPt ? "Serviço" : "Service"}</label>
                  <Select value={formServiceType} onValueChange={setFormServiceType}>
                    <SelectTrigger className="mt-1 text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SERVICE_TYPE_LABELS).map(([key, labels]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", SERVICE_TYPE_DOT[key])} />
                            {labels[language] || labels.en}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("schedule.duration")}</label>
                  <Input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} className="mt-1 text-xs h-9" min="15" max="180" />
                </div>
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
                <div />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">{t("schedule.notes")}</label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={t("schedule.notes_ph")} className="mt-1 text-xs min-h-[60px]" />
              </div>
              {editingApt && (
                <div className="pt-2 border-t border-border/40">
                  <label className="text-xs font-medium text-muted-foreground">
                    {isPt ? "Status do atendimento" : language === "es" ? "Estado de la cita" : "Appointment status"}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-1.5">
                    {(["completed", "scheduled", "no_show", "no_show_justified"] as const).map((st) => {
                      const active = editingApt.status === st;
                      const label = STATUS_LABELS[st]?.[language] || st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleSetStatus(editingApt.id, st)}
                          className={cn(
                            "text-[10px] font-medium px-2 py-1.5 rounded-md border transition-all",
                            STATUS_COLORS[st],
                            active ? "ring-2 ring-primary ring-offset-1 shadow-sm" : "opacity-70 hover:opacity-100"
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/40">
            {editingApt && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5 mr-auto"
                onClick={() => { setDeleteId(editingApt.id); }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                {t("schedule.delete")}
              </Button>
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

/** Appointment card with pointer-based drag (mouse + touch) */
const AppointmentCard = ({
  apt, isConcurrent, onPointerDownCard, isMobile, isPt, hasEvolution,
}: {
  apt: Appointment;
  isConcurrent: boolean;
  onPointerDownCard: (e: React.PointerEvent, apt: Appointment) => void;
  isMobile: boolean;
  isPt: boolean;
  hasEvolution?: boolean;
}) => {
  const Icon = TYPE_ICONS[apt.type] || MapPin;
  const statusColor = STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled;
  const serviceColor = SERVICE_TYPE_COLORS[apt.service_type || "fisioterapia"] || "";
  const typeLabel = apt.type === "video_call" ? "Videochamada" : apt.type === "in_person" ? "Presencial" : "Externo";

  const card = (
    <div
      className={cn(
        "relative rounded-md border cursor-grab active:cursor-grabbing transition-all hover:shadow-sm select-none",
        statusColor,
        serviceColor,
        apt.status === "cancelled" && "opacity-50",
        isConcurrent ? "p-0.5 flex-1 min-w-0" : "p-1"
      )}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => onPointerDownCard(e, apt)}
    >
      {hasEvolution && (
        <Pencil
          className="absolute top-0.5 right-0.5 h-2.5 w-2.5 text-emerald-600"
          aria-label={isPt ? "Evolução registrada" : "Evolution recorded"}
        />
      )}
      <div className="flex items-center gap-0.5">
        <span className="text-[9px] font-bold tabular-nums">{apt.appointment_time?.slice(0, 5)}</span>
        {!isConcurrent && !hasEvolution && <GripVertical className="h-2 w-2 ml-auto text-muted-foreground/40" />}
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
