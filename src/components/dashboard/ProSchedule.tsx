import { toMinutes, endTimeFrom, assignLanes, cardPixelHeight } from "@/lib/appointmentTime";
import { expandRecurrence, splitConflicts } from "@/lib/appointmentRecurrence";
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { DEMO_APPOINTMENTS, DEMO_TEAM } from "@/data/mockClinicData";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { ptBR, enUS, es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, Plus, CalendarIcon, Clock, Video, MapPin, ExternalLink,
  Loader2, Trash2, GripVertical, Upload, Check, Pencil,
} from "lucide-react";
import AgendaImportModal from "./AgendaImportModal";
import AppointmentEditorDialog, { AppointmentEditorPayload, AppointmentEditorExtras, AptInput } from "./AppointmentEditorDialog";

interface Appointment {
  id: string;
  professional_id: string | null;
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

type EvolutionKind = "assessment" | "note";

type EvolutionInfo = {
  at: string;
  content: string;
  kind: EvolutionKind;
};

type EvolutionEntry = {
  raw: string;
  stamp: string;
  content: string;
  appointmentDate: string | null;
  appointmentTime: string | null;
  at: string | null;
};

const normalizeEvolutionEmail = (email: string) => email.trim().toLowerCase();

const buildEvolutionKey = (email: string, date: string, time?: string | null) =>
  `${normalizeEvolutionEmail(email)}|${date}|${(time || "").slice(0, 5)}`;

const buildEvolutionDayKey = (email: string, date: string) => `${normalizeEvolutionEmail(email)}|${date}`;

const buildEvolutionRequestKey = (apt: Appointment) =>
  `${apt.id}|${normalizeEvolutionEmail(apt.patient_email || apt.patient_name || apt.id)}|${apt.appointment_date}|${(apt.appointment_time || "").slice(0, 5)}`;

const parseEvolutionStamp = (stamp: string) => {
  const normalized = stamp.trim();
  const isoMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/);
  if (isoMatch) {
    const appointmentDate = isoMatch[1];
    const appointmentTime = isoMatch[2] || null;
    return {
      appointmentDate,
      appointmentTime,
      at: `${appointmentDate}T${appointmentTime || "12:00"}:00`,
    };
  }

  const slashMatch = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s*(\d{2}):(\d{2}))?/);
  if (slashMatch) {
    const [, day, month, year, hour, minute] = slashMatch;
    const appointmentDate = `${year}-${month}-${day}`;
    const appointmentTime = hour && minute ? `${hour}:${minute}` : null;
    return {
      appointmentDate,
      appointmentTime,
      at: `${appointmentDate}T${appointmentTime || "12:00"}:00`,
    };
  }

  return {
    appointmentDate: null,
    appointmentTime: null,
    at: null,
  };
};

const parseEvolutionEntries = (content: string): EvolutionEntry[] => {
  if (!content) return [];

  return content
    .split(/\n\n(?=\[)/g)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((raw) => {
      const match = raw.match(/^\[([^\]]+)\]\s*\n?([\s\S]*)$/);
      const stamp = match?.[1]?.trim() || "";
      const body = (match?.[2] || raw).trim();
      const parsedStamp = stamp ? parseEvolutionStamp(stamp) : { appointmentDate: null, appointmentTime: null, at: null };

      return {
        raw,
        stamp,
        content: body,
        appointmentDate: parsedStamp.appointmentDate,
        appointmentTime: parsedStamp.appointmentTime,
        at: parsedStamp.at,
      };
    });
};

const matchesAppointmentEvolution = (entry: EvolutionEntry, apt: Appointment) => {
  if (!entry.appointmentDate || entry.appointmentDate !== apt.appointment_date) return false;
  const aptTime = apt.appointment_time?.slice(0, 5) || null;
  return !entry.appointmentTime || !aptTime || entry.appointmentTime === aptTime;
};




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
  avaliacao: "border-l-4 border-l-red-500",
  fisioterapia: "border-l-4 border-l-teal-500",
  pilates: "border-l-4 border-l-purple-500",
  osteopatia: "border-l-4 border-l-orange-500",
  massoterapia: "border-l-4 border-l-pink-500",
  rpg: "border-l-4 border-l-indigo-500",
  compromisso: "border-l-4 border-l-muted-foreground opacity-80",
};

const SERVICE_TYPE_DOT: Record<string, string> = {
  avaliacao: "bg-red-500",
  fisioterapia: "bg-teal-500",
  pilates: "bg-purple-500",
  osteopatia: "bg-orange-500",
  massoterapia: "bg-pink-500",
  rpg: "bg-indigo-500",
  compromisso: "bg-muted-foreground",
};

const SERVICE_TYPE_LABELS: Record<string, Record<string, string>> = {
  avaliacao: { pt: "Avaliação", en: "Assessment", es: "Evaluación" },
  fisioterapia: { pt: "Fisioterapia", en: "Physiotherapy", es: "Fisioterapia" },
  pilates: { pt: "Pilates", en: "Pilates", es: "Pilates" },
  osteopatia: { pt: "Osteopatia", en: "Osteopathy", es: "Osteopatía" },
  massoterapia: { pt: "Massoterapia", en: "Massage Therapy", es: "Masoterapia" },
  rpg: { pt: "RPG", en: "RPG", es: "RPG" },
  compromisso: { pt: "Compromisso", en: "Commitment", es: "Compromiso" },
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
const HOUR_PX = 48;
const DEFAULT_END_HOUR = 20;

function getTimeRange(apts: Appointment[]): string[] {
  let minH = DEFAULT_START_HOUR;
  let maxH = DEFAULT_END_HOUR;
  for (const a of apts) {
    const h = parseInt(a.appointment_time?.slice(0, 2) || "9", 10);
    if (h < minH) minH = h;
    const endH = Math.ceil(((toMinutes(a.appointment_time) ?? h * 60) + (a.duration_minutes || 50)) / 60) - 1;
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

  const daysToShow = isSimulated ? (isMobile ? 3 : 5) : (isMobile ? 3 : 7);
  const [viewDate, setViewDate] = useState(() => new Date());
  // In simulated/demo mode, always anchor to Monday so weekends are excluded
  const startDate = isSimulated
    ? startOfWeek(viewDate, { weekStartsOn: 1 })
    : (isMobile ? viewDate : startOfWeek(viewDate, { weekStartsOn: 1 }));

  const [appointments, setAppointments] = useState<Appointment[]>(isSimulated ? (DEMO_APPOINTMENTS as Appointment[]) : []);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteScope, setDeleteScope] = useState<"one" | "following">("one");
  const [deleting, setDeleting] = useState(false);
  const [batchConfirming, setBatchConfirming] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [knownPatients, setKnownPatients] = useState<KnownPatient[]>([]);
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const isServiceVisible = (type?: string | null) =>
    serviceFilters.length === 0 || serviceFilters.includes(type || "fisioterapia");
  const toggleServiceFilter = (key: string) =>
    setServiceFilters((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const [formProfessionalId, setFormProfessionalId] = useState(professionalId || "");
  const [evolutionReloadTick, setEvolutionReloadTick] = useState(0);

  // ---- Appointment modal: single source of truth, fresh per open ----
  type ModalState = {
    open: boolean;
    sessionId: number;
    apt: Appointment | null;
    defaultDate: Date;
    defaultTime: string;
  };
  const [modalState, setModalState] = useState<ModalState>({
    open: false, sessionId: 0, apt: null, defaultDate: new Date(), defaultTime: "09:00",
  });
  const modalSessionRef = useRef(0);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);

  // Block iOS pinch / double-tap zoom while the schedule is open
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", prevent as EventListener, { passive: false } as any);
    document.addEventListener("gesturechange", prevent as EventListener, { passive: false } as any);
    // Reset any existing zoom by re-applying the viewport meta
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      const c = meta.getAttribute("content") || "";
      meta.setAttribute("content", c + ", user-scalable=no");
      setTimeout(() => meta.setAttribute("content", c), 300);
    }
    return () => {
      document.removeEventListener("gesturestart", prevent as EventListener);
      document.removeEventListener("gesturechange", prevent as EventListener);
    };
  }, []);

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
      query = query.eq("professional_id", professionalId).is("clinic_id", null);
    }
    const { data } = await query;
    setAppointments((data as Appointment[]) || []);
    setLoading(false);
  }, [professionalId, clinicId, rangeStart, rangeEnd, isSimulated]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const [evolutionMap, setEvolutionMap] = useState<Map<string, EvolutionInfo>>(new Map());
  useEffect(() => {
    if (isSimulated) { setEvolutionMap(new Map()); return; }
    const emails = Array.from(new Set(appointments.map(a => a.patient_email).filter(Boolean))) as string[];
    if (emails.length === 0) { setEvolutionMap(new Map()); return; }
    let cancelled = false;
    const load = async () => {
      const startISO = `${rangeStart}T00:00:00`;
      const endISO = `${rangeEnd}T23:59:59`;
      const scopedProfessionalId = professionalId || formProfessionalId || appointments[0]?.professional_id || null;
      let aq = supabase
        .from("assessments")
        .select("id, patient_email, created_at, diagnosis, anamnesis_data")
        .in("patient_email", emails)
        .gte("created_at", startISO)
        .lte("created_at", endISO);
      if (clinicId) aq = aq.eq("clinic_id", clinicId);
      else if (scopedProfessionalId) aq = aq.eq("professional_id", scopedProfessionalId).is("clinic_id", null);
      const { data: assess } = await aq;
      const map = new Map<string, EvolutionInfo>();
      const assessmentById = new Map<string, any>();
      const upsert = (key: string, info: EvolutionInfo) => {
        const prev = map.get(key);
        if (!prev || new Date(info.at).getTime() > new Date(prev.at).getTime()) map.set(key, info);
      };
      (assess || []).forEach((r: any) => {
        if (r.id) assessmentById.set(r.id, r);
        const day = (r.created_at as string).slice(0, 10);
        const diag = r.diagnosis?.primary_hypothesis || r.diagnosis?.hypothesis || r.diagnosis?.summary || "";
        const chief = r.anamnesis_data?.chief_complaint || "";
        const content = [diag, chief].filter(Boolean).join(" — ") || (isPt ? "Avaliação registrada" : "Assessment recorded");
        upsert(buildEvolutionDayKey(r.patient_email, day), { at: r.created_at, content, kind: "assessment" });
      });

      let noteAssessmentQuery = supabase
        .from("assessments")
        .select("id, patient_email")
        .in("patient_email", emails);

      if (clinicId) noteAssessmentQuery = noteAssessmentQuery.eq("clinic_id", clinicId);
      else if (scopedProfessionalId) noteAssessmentQuery = noteAssessmentQuery.eq("professional_id", scopedProfessionalId).is("clinic_id", null);

      const { data: noteAssessments } = await noteAssessmentQuery;
      (noteAssessments || []).forEach((r: any) => {
        if (r.id && r.patient_email && !assessmentById.has(r.id)) {
          assessmentById.set(r.id, r);
        }
      });

      const assessmentIds = Array.from(assessmentById.keys());
      let notes: any[] | null = null;
      if (assessmentIds.length > 0) {
        let nq = supabase
          .from("professional_notes")
          .select("assessment_id, updated_at, content")
          .in("assessment_id", assessmentIds);

        if (scopedProfessionalId) {
          nq = nq.eq("professional_id", scopedProfessionalId);
        }

        const { data } = await nq;
        notes = data;
      }

      (notes || []).forEach((r: any) => {
        const relatedAssessment = assessmentById.get(r.assessment_id);
        const email = relatedAssessment?.patient_email;
        if (!email) return;

        const entries = parseEvolutionEntries(r.content || "");
        entries.forEach((entry) => {
          if (!entry.appointmentDate || entry.appointmentDate < rangeStart || entry.appointmentDate > rangeEnd) return;
          const key = buildEvolutionKey(email, entry.appointmentDate, entry.appointmentTime);
          upsert(key, {
            at: entry.at || r.updated_at,
            content: entry.content || r.content || "",
            kind: "note",
          });
        });

        const fallbackDay = (r.updated_at as string).slice(0, 10);
        if (fallbackDay >= rangeStart && fallbackDay <= rangeEnd) {
          upsert(buildEvolutionDayKey(email, fallbackDay), { at: r.updated_at, content: r.content || "", kind: "note" });
        }
      });
      if (!cancelled) setEvolutionMap(map);
    };
    load();
    return () => { cancelled = true; };
  }, [appointments, rangeStart, rangeEnd, clinicId, professionalId, formProfessionalId, isSimulated, isPt, evolutionReloadTick]);

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
      const addEntry = (name?: string | null, email?: string | null) => {
        const nm = (name || "").trim();
        const em = (email || "").trim();
        if (!nm && !em) return;
        const key = em ? em.toLowerCase() : `name:${nm.toLowerCase()}`;
        if (!map.has(key)) map.set(key, { name: nm || em, email: em });
      };
      if (clinicId) {
        const { data: patientsData } = await (supabase.from("patients" as any) as any)
          .select("full_name, email")
          .eq("clinic_id", clinicId);
        (patientsData as any[] | null)?.forEach((p) => addEntry(p.full_name, p.email));
        const { data: assessData } = await supabase
          .from("assessments")
          .select("patient_name, patient_email")
          .eq("clinic_id", clinicId)
          .not("patient_email", "is", null);
        assessData?.forEach((a) => addEntry(a.patient_name, a.patient_email));
        const { data: aptData } = await (supabase.from("professional_appointments" as any) as any)
          .select("patient_name, patient_email")
          .eq("clinic_id", clinicId)
          .not("patient_email", "is", null);
        (aptData as any[] | null)?.forEach((a) => addEntry(a.patient_name, a.patient_email));
      } else if (professionalId) {
        const { data: patientsData } = await (supabase.from("patients" as any) as any)
          .select("full_name, email")
          .eq("professional_id", professionalId).is("clinic_id", null);
        (patientsData as any[] | null)?.forEach((p) => addEntry(p.full_name, p.email));
        const { data: assessData } = await supabase
          .from("assessments")
          .select("patient_name, patient_email")
          .eq("professional_id", professionalId).is("clinic_id", null)
          .not("patient_email", "is", null);
        assessData?.forEach((a) => addEntry(a.patient_name, a.patient_email));
        const { data: aptData } = await (supabase.from("professional_appointments" as any) as any)
          .select("patient_name, patient_email")
          .eq("professional_id", professionalId).is("clinic_id", null)
          .not("patient_email", "is", null);
        (aptData as any[] | null)?.forEach((a) => addEntry(a.patient_name, a.patient_email));
      }
      setKnownPatients(Array.from(map.values()));
    };
    fetchPatients();
  }, [professionalId, clinicId]);

  const navigateWeek = (dir: number) => setViewDate((prev) => addDays(prev, dir * daysToShow));

  // ---- Modal lifecycle ----
  const closeAppointmentModal = useCallback(() => {
    setModalState((s) => ({ ...s, open: false }));
  }, []);

  const openNew = useCallback((date?: Date, time?: string) => {
    modalSessionRef.current += 1;
    setModalState({
      open: true,
      sessionId: modalSessionRef.current,
      apt: null,
      defaultDate: date || new Date(),
      defaultTime: time || "09:00",
    });
  }, []);

  const openEdit = useCallback((apt: Appointment) => {
    modalSessionRef.current += 1;
    setModalState({
      open: true,
      sessionId: modalSessionRef.current,
      apt,
      defaultDate: new Date(apt.appointment_date + "T12:00:00"),
      defaultTime: apt.appointment_time?.slice(0, 5) || "09:00",
    });
  }, []);

  // ---- Mutations (called by child or local handlers) ----
  const handleSubmitAppointment = useCallback(async ({
    isEdit, editId, payload, extras,
  }: {
    isEdit: boolean;
    editId: string | null;
    payload: AppointmentEditorPayload;
    extras: AppointmentEditorExtras;
  }): Promise<boolean> => {
    try {
      const effectiveProfId = payload.professional_id;
      if (isSimulated) {
        if (isEdit && editId) {
          setAppointments(prev => prev.map(a => a.id === editId ? { ...a, ...payload } : a));
        } else {
          const newApt: Appointment = { id: `sim-${Date.now()}`, ...payload, status: "scheduled", created_at: new Date().toISOString() };
          setAppointments(prev => [...prev, newApt]);
        }
        toast({ title: isEdit ? t("schedule.updated") : t("schedule.created") });
        closeAppointmentModal();
        return true;
      }

      const isCommitmentPayload = payload.service_type === "compromisso";
      const trimmedEmail = (payload.patient_email || "").trim();
      const patientRow: any = {
        full_name: payload.patient_name,
        email: trimmedEmail || null,
        cpf: extras.cpf.replace(/\D/g, "") || null,
        birth_date: extras.birth_date || null,
        phone: extras.phone.replace(/\D/g, "") || null,
        address: extras.address.trim() || null,
      };
      if (clinicId) patientRow.clinic_id = clinicId;
      else if (effectiveProfId) patientRow.professional_id = effectiveProfId;

      if (isEdit && editId) {
        await (supabase.from("professional_appointments" as any) as any)
          .update(payload).eq("id", editId);
        const rule = extras.recurrence;
        if (rule) {
          const tbl = () => (supabase.from("professional_appointments" as any) as any);
          const current = appointments.find((a: any) => a.id === editId) as any;
          const existingSeries: string | null = current?.series_id ?? null;
          // Replace only future, still-scheduled occurrences of this series; realized sessions stay.
          if (existingSeries) {
            const { error: delErr } = await tbl().delete()
              .eq("series_id", existingSeries).gt("appointment_date", payload.appointment_date).eq("status", "scheduled");
            if (delErr) throw delErr;
          }
          if (rule.freq === "none") {
            await tbl().update({ series_id: null, recurrence_rule: null }).eq("id", editId);
          } else {
            const seriesId = existingSeries || crypto.randomUUID();
            await tbl().update({ series_id: seriesId, recurrence_rule: rule }).eq("id", editId);
            const all = expandRecurrence(payload.appointment_date, rule).filter((d) => d !== payload.appointment_date);
            let created = 0; let conflicts: string[] = [];
            if (all.length) {
              let q = tbl().select("appointment_date, appointment_time").in("appointment_date", all).neq("status", "cancelled");
              if (clinicId) q = q.eq("clinic_id", clinicId); else q = q.eq("professional_id", effectiveProfId).is("clinic_id", null);
              if (clinicId && effectiveProfId) q = q.eq("professional_id", effectiveProfId);
              const { data: taken } = await q;
              const split = splitConflicts(all, payload.appointment_time, taken || []);
              conflicts = split.conflicts;
              const rows = split.free.map((d) => ({ ...payload, appointment_date: d, service_type: payload.service_type || "fisioterapia", series_id: seriesId, recurrence_rule: rule, status: "scheduled" }));
              if (rows.length) {
                const { error } = await tbl().insert(rows);
                if (error) throw error;
              }
              created = rows.length;
            }
            toast({
              title: language === "pt" ? `Repetição ajustada: ${created} próximo(s) agendamento(s)` : `Recurrence updated: ${created} upcoming`,
              description: conflicts.length
                ? (language === "pt" ? `${conflicts.length} data(s) já ocupada(s) foram puladas: ${conflicts.map((d) => d.split("-").reverse().slice(0, 2).join("/")).join(", ")}` : `${conflicts.length} busy date(s) skipped`)
                : undefined,
              duration: conflicts.length ? 9000 : 4000,
            });
          }
        }
        if (!isCommitmentPayload && (trimmedEmail || payload.patient_name)) {
          let matchQuery = (supabase.from("patients" as any) as any).select("id");
          if (clinicId) matchQuery = matchQuery.eq("clinic_id", clinicId);
          else if (effectiveProfId) matchQuery = matchQuery.eq("professional_id", effectiveProfId).is("clinic_id", null);
          if (trimmedEmail) matchQuery = matchQuery.eq("email", trimmedEmail);
          else matchQuery = matchQuery.eq("full_name", payload.patient_name);
          const { data: existing } = await matchQuery.limit(1);
          if (existing && existing.length > 0) {
            await (supabase.from("patients" as any) as any).update(patientRow).eq("id", existing[0].id);
          } else if (clinicId || effectiveProfId) {
            await (supabase.from("patients" as any) as any).insert(patientRow);
          }
          window.dispatchEvent(new CustomEvent("reload-pro-patients"));
        }
      } else {
        const rule = extras.recurrence;
        if (rule && rule.freq !== "none") {
          const all = expandRecurrence(payload.appointment_date, rule);
          let q = (supabase.from("professional_appointments" as any) as any)
            .select("appointment_date, appointment_time")
            .in("appointment_date", all).neq("status", "cancelled");
          if (clinicId) q = q.eq("clinic_id", clinicId); else q = q.eq("professional_id", effectiveProfId).is("clinic_id", null);
          if (clinicId && effectiveProfId) q = q.eq("professional_id", effectiveProfId);
          const { data: taken } = await q;
          const { free, conflicts } = splitConflicts(all, payload.appointment_time, taken || []);
          const seriesId = crypto.randomUUID();
          const rows = free.map((d) => ({ ...payload, appointment_date: d, service_type: payload.service_type || "fisioterapia", series_id: seriesId, recurrence_rule: rule }));
          if (rows.length) {
            const { error } = await (supabase.from("professional_appointments" as any) as any).insert(rows);
            if (error) throw error;
          }
          toast({
            title: language === "pt" ? `${rows.length} atendimento(s) criados na série` : `${rows.length} appointment(s) created`,
            description: conflicts.length
              ? (language === "pt" ? `${conflicts.length} data(s) já ocupada(s) nesse horário foram puladas: ${conflicts.map((d) => d.split("-").reverse().slice(0, 2).join("/")).join(", ")}` : `${conflicts.length} busy date(s) skipped`)
              : undefined,
            duration: conflicts.length ? 9000 : 4000,
          });
        } else {
          const { error } = await (supabase.from("professional_appointments" as any) as any).insert(payload);
          if (error) throw error;
        }
        if (!isCommitmentPayload && extras.selectedPatientKey === "__new__" && payload.patient_name && (clinicId || effectiveProfId)) {
          // Cadastra o paciente na tabela `patients` para aparecer na aba Profissional.
          // NÃO cria mais um assessment placeholder com status "completed" — isso disparava
          // o toast de "Avaliação concluída" e fazia o card mostrar uma avaliação fantasma.
          await (supabase.from("patients" as any) as any).upsert(patientRow, { ignoreDuplicates: true });
          window.dispatchEvent(new CustomEvent("reload-pro-patients"));
          if (trimmedEmail) {
            toast({
              title: t("schedule.patient_created"),
              description: t("schedule.suggest_pre_assessment"),
              duration: 8000,
            });
          }
        }
      }

      toast({ title: isEdit ? t("schedule.updated") : t("schedule.created") });
      closeAppointmentModal();
      setKnownPatients((prev) => {
        if (trimmedEmail && !prev.find((p) => p.email === trimmedEmail)) {
          return [...prev, { name: payload.patient_name, email: trimmedEmail }];
        }
        return prev;
      });
      fetchAppointments();
      return true;
    } catch {
      toast({ title: t("schedule.error"), variant: "destructive" });
      return false;
    }
  }, [clinicId, closeAppointmentModal, fetchAppointments, isSimulated, language, t, toast]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    if (isSimulated) {
      setAppointments(prev => prev.filter(a => a.id !== deleteId));
      toast({ title: t("schedule.deleted") });
      setDeleteId(null);
      closeAppointmentModal();
      setDeleting(false);
      return;
    }
    try {
      const target = appointments.find((a: any) => a.id === deleteId) as any;
      if (deleteScope === "following" && target?.series_id) {
        // Only future scheduled sessions of the series; realized ones stay.
        const { data: rows } = await (supabase.from("professional_appointments" as any) as any)
          .select("id").eq("series_id", target.series_id).gte("appointment_date", target.appointment_date).eq("status", "scheduled");
        const ids = (rows || []).map((r: any) => r.id);
        if (!ids.includes(deleteId)) ids.push(deleteId);
        await (supabase.from("professional_appointments" as any) as any).delete().in("id", ids);
      } else {
        await (supabase.from("professional_appointments" as any) as any).delete().eq("id", deleteId);
      }
      setDeleteScope("one");
      toast({ title: t("schedule.deleted") });
      setDeleteId(null);
      closeAppointmentModal();
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
      return;
    }
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    await (supabase.from("professional_appointments" as any) as any)
      .update({ status: newStatus })
      .eq("id", id);
  };


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
    const THRESHOLD = 6; // px before considered a drag (else click) — mouse only
    const isTouch = e.pointerType !== "mouse";
    const LONG_PRESS_MS = 600;
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
      // Auto-scroll confined to the grid container (never the page/window)
      cancelAnimationFrame(scrollRaf);
      const container = gridScrollRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        const margin = 48;
        let dxScroll = 0;
        let dyScroll = 0;
        if (ev.clientY < rect.top + margin) dyScroll = -10;
        else if (ev.clientY > rect.bottom - margin) dyScroll = 10;
        if (ev.clientX < rect.left + margin) dxScroll = -10;
        else if (ev.clientX > rect.right - margin) dxScroll = 10;
        if (dxScroll !== 0 || dyScroll !== 0) {
          scrollRaf = requestAnimationFrame(() => container.scrollBy(dxScroll, dyScroll));
        }
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

    if (isTouch) {
      // Long-press: card only lifts after LONG_PRESS_MS without moving
      const blockTouchScroll = (tev: TouchEvent) => { if (dragging) tev.preventDefault(); };
      window.addEventListener("touchmove", blockTouchScroll, { passive: false });
      let pressTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
        pressTimer = null;
        beginDrag();
        cardEl.style.transform = "scale(1.04)";
        try { navigator.vibrate?.(15); } catch {}
      }, LONG_PRESS_MS);
      const cancelPress = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
      const onTouchMove = (ev: PointerEvent) => {
        if (!dragging) {
          if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) {
            cancelPress();
            endAll();
          }
          return;
        }
        onMove(ev);
      };
      const onTouchUp = (ev: PointerEvent) => {
        const wasPress = !!pressTimer;
        cancelPress();
        if (!dragging) {
          endAll();
          if (ev.type === "pointerup" && wasPress) openEdit(apt);
          return;
        }
        endAll();
        onUp(ev);
      };
      const endAll = () => {
        window.removeEventListener("pointermove", onTouchMove);
        window.removeEventListener("pointerup", onTouchUp);
        window.removeEventListener("pointercancel", onTouchUp);
        window.removeEventListener("touchmove", blockTouchScroll);
        cardEl.style.transform = "";
      };
      window.addEventListener("pointermove", onTouchMove, { passive: false });
      window.addEventListener("pointerup", onTouchUp);
      window.addEventListener("pointercancel", onTouchUp);
      return;
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  return (
    <div className="space-y-3 max-w-full min-w-0 overflow-x-hidden" style={{ touchAction: "pan-x pan-y" }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 min-w-0">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => navigateWeek(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="text-sm font-semibold text-foreground whitespace-nowrap hover:text-primary transition-colors px-1 py-0.5 rounded-md hover:bg-muted/60 focus:outline-none focus:ring-2 focus:ring-ring"
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
        <div className="flex items-center gap-1.5 shrink-0">
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
          <Button size="sm" className="gap-1.5 rounded-xl text-xs shrink-0" onClick={() => openNew()} aria-label={t("schedule.new") as string}>
            <Plus className="h-3.5 w-3.5" />
            {isMobile ? (isPt ? "Novo" : "New") : t("schedule.new")}
          </Button>
        </div>
      </div>

      {/* Service filter (multi-select) */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setServiceFilters([])}
          className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors",
            serviceFilters.length === 0 ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          {isPt ? "Todos" : "All"}
        </button>
        {Object.entries(SERVICE_TYPE_LABELS).map(([key, labels]) => {
          const active = serviceFilters.includes(key);
          return (
            <button
              key={key}
              aria-pressed={active}
              onClick={() => toggleServiceFilter(key)}
              className={cn("px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors flex items-center gap-1.5",
                active ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full", SERVICE_TYPE_DOT[key])} />
              {labels[language] || labels.en}
              {active && <Check className="h-3 w-3" />}
            </button>
          );
        })}
        {serviceFilters.length > 1 && (
          <span className="text-[10px] text-muted-foreground">
            {isPt ? `${serviceFilters.length} serviços exibidos` : `${serviceFilters.length} services shown`}
          </span>
        )}

        <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 ml-auto">
          <GripVertical className="h-3 w-3" />
          {isMobile
            ? (isPt ? "Toque e segure um card para reagendar" : "Touch and hold a card to reschedule")
            : (isPt ? "Arraste os cards para reagendar" : "Drag cards to reschedule")}
        </p>
      </div>

      {/* Time-slot grid */}
      <div ref={gridScrollRef} style={{ touchAction: "pan-x pan-y" }} className="h-[420px] max-w-full rounded-lg border border-border/40 overflow-auto overscroll-contain">
        <div className={cn("min-w-0", isMobile && "min-w-[500px]")}>
          {/* Day headers — sticky */}
          <div className={cn("grid sticky top-0 z-20 bg-background border-b border-border/40", isMobile ? "grid-cols-[40px_repeat(3,1fr)]" : "grid-cols-[48px_repeat(7,1fr)]")}>
            <div className="py-2 px-1 sticky left-0 z-10 bg-background" /> {/* time gutter */}
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
                <div className="py-2 px-1 text-[10px] text-muted-foreground font-medium text-right pr-2 tabular-nums border-r border-border/30 sticky left-0 z-10 bg-background">
                  {slot}
                </div>

                {/* Day cells */}
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const filteredApts = appointments.filter(
                    (a) => a.appointment_date === dateStr && isServiceVisible(a.service_type),
                  );
                  const cellApts = getAptsForSlot(filteredApts, slot);
                  const lanes = assignLanes(filteredApts.map((a) => {
                    const st = toMinutes(a.appointment_time) ?? 0;
                    return { id: a.id, start: st, end: st + Math.max(15, a.duration_minutes || 50) };
                  }));
                  const isOver = dropTarget?.date === dateStr && dropTarget?.hour === slot;

                  return (
                    <div
                      key={`${dateStr}-${slot}`}
                      data-cell-date={dateStr}
                      data-cell-hour={slot}
                      style={{ height: HOUR_PX }}
                      className={cn(
                        "relative border-l border-border/20 min-w-0 transition-colors cursor-pointer hover:bg-muted/30",
                        isOver && "bg-primary/10 ring-1 ring-primary/40"
                      )}
                      onClick={() => {
                        if (cellApts.length === 0) openNew(day, slot);
                      }}
                    >
                      {cellApts.map((apt) => {
                        const st = toMinutes(apt.appointment_time) ?? 0;
                        const dur = Math.max(15, apt.duration_minutes || 50);
                        const ln = lanes.get(apt.id) ?? { lane: 0, lanes: 1 };
                        const concurrent = ln.lanes > 1;
                        const h = cardPixelHeight(dur, HOUR_PX, concurrent);
                        const forcedMin = h > (dur / 60) * HOUR_PX - 2;
                        return (
                          <div
                            key={apt.id}
                            className={cn("absolute flex", forcedMin ? "z-[6]" : "z-[5]")}
                            style={{
                              top: ((st % 60) / 60) * HOUR_PX + 1,
                              height: h,
                              left: `calc(${(ln.lane / ln.lanes) * 100}% + 2px)`,
                              width: `calc(${100 / ln.lanes}% - 4px)`,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AppointmentCard
                              apt={apt}
                              isConcurrent={ln.lanes > 1}
                              onPointerDownCard={handleCardPointerDown}
                              isMobile={isMobile}
                              isPt={isPt}
                              evolution={apt.patient_email ? (evolutionMap.get(buildEvolutionKey(apt.patient_email, apt.appointment_date, apt.appointment_time)) || evolutionMap.get(buildEvolutionDayKey(apt.patient_email, apt.appointment_date))) : undefined}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Appointment Editor — fully isolated, fresh per open */}
      {modalState.open && (
        <AppointmentEditorDialog
          key={`apt-editor-${modalState.sessionId}`}
          open={modalState.open}
          onClose={closeAppointmentModal}
          initialApt={modalState.apt as unknown as AptInput | null}
          defaultDate={modalState.defaultDate}
          defaultTime={modalState.defaultTime}
          professionalId={professionalId}
          clinicId={clinicId}
          isSimulated={isSimulated}
          isClinicOnlyMode={isClinicOnlyMode}
          clinicProfessionals={clinicProfessionals}
          knownPatients={knownPatients}
          language={language}
          isPt={isPt}
          t={t}
          serviceMaps={{ labels: SERVICE_TYPE_LABELS, dot: SERVICE_TYPE_DOT }}
          onSubmit={handleSubmitAppointment}
          onRequestDelete={(id) => setDeleteId(id)}
          onSetStatus={handleSetStatus}
          onViewPatient={onViewPatient}
          onEvolutionChanged={() => setEvolutionReloadTick((v) => v + 1)}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteScope("one"); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("schedule.delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("schedule.delete_desc")}</AlertDialogDescription>
          </AlertDialogHeader>
          {(appointments.find((a: any) => a.id === deleteId) as any)?.series_id && (
            <div className="space-y-1.5 text-sm">
              <p className="text-xs text-muted-foreground">{language === "pt" ? "Este atendimento faz parte de uma série." : "This appointment is part of a series."}</p>
              {(["one", "following"] as const).map((sc) => (
                <label key={sc} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="del-scope" checked={deleteScope === sc} onChange={() => setDeleteScope(sc)} className="accent-primary" />
                  {sc === "one" ? (language === "pt" ? "Só este" : "Only this one") : (language === "pt" ? "Este e os seguintes (sessões realizadas são mantidas)" : "This and following (completed sessions are kept)")}
                </label>
              ))}
            </div>
          )}
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
  apt, isConcurrent, onPointerDownCard, isMobile, isPt, evolution,
}: {
  apt: Appointment;
  isConcurrent: boolean;
  onPointerDownCard: (e: React.PointerEvent, apt: Appointment) => void;
  isMobile: boolean;
  isPt: boolean;
  evolution?: { at: string; content: string; kind: "assessment" | "note" };
}) => {
  const Icon = TYPE_ICONS[apt.type] || MapPin;
  const statusColor = STATUS_COLORS[apt.status] || STATUS_COLORS.scheduled;
  const serviceColor = SERVICE_TYPE_COLORS[apt.service_type || "fisioterapia"] || "";
  const typeLabel = apt.type === "video_call" ? "Videochamada" : apt.type === "in_person" ? "Presencial" : "Externo";
  const hasEvolution = !!evolution;

  const card = (
      <div
      className={cn(
        "relative rounded-md border cursor-grab active:cursor-grabbing transition-all hover:shadow-sm select-none",
        statusColor,
        serviceColor,
        apt.status === "cancelled" && "opacity-50",
        "h-full w-full min-w-0 overflow-hidden", isConcurrent ? "p-0.5" : "p-1"
      )}
        style={{ touchAction: "pan-x pan-y", WebkitTouchCallout: "none", WebkitUserSelect: "none" } as React.CSSProperties}
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => onPointerDownCard(e, apt)}
    >
      {hasEvolution && evolution && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-0.5 right-0.5 p-0.5 rounded hover:bg-emerald-200/60"
              aria-label={isPt ? "Ver última evolução" : "View last evolution"}
            >
              <Pencil className="h-2.5 w-2.5 text-emerald-600" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            className="w-72 p-3 text-xs"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-emerald-700">
                {evolution.kind === "assessment"
                  ? (isPt ? "Avaliação" : "Assessment")
                  : (isPt ? "Evolução" : "Evolution note")}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(evolution.at).toLocaleString(isPt ? "pt-BR" : "en-US", {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-foreground/90 max-h-48 overflow-y-auto">
              {evolution.content?.trim() || (isPt ? "(sem conteúdo)" : "(no content)")}
            </p>
          </PopoverContent>
        </Popover>
      )}
      <div className="flex items-center gap-0.5">
        <span className="text-[9px] font-bold tabular-nums">{apt.appointment_time?.slice(0, 5)}{apt.duration_minutes > 60 && !isConcurrent ? `–${endTimeFrom(apt.appointment_time, apt.duration_minutes)}` : ""}</span>
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
            <Clock className="h-3 w-3" /> {apt.appointment_time?.slice(0, 5)}–{endTimeFrom(apt.appointment_time, apt.duration_minutes)}
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
