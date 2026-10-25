import { endTimeFrom, durationBetween, formatDuration } from "@/lib/appointmentTime";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import RecurrencePicker from "./RecurrencePicker";
import type { RecurrenceRule } from "@/lib/appointmentRecurrence";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  CalendarIcon, Loader2, Trash2, Pencil, Check, ChevronRight, ChevronsUpDown,
  CheckCircle2, XCircle, AlertCircle, Clock,
} from "lucide-react";
import { formatCpf, formatPhone } from "@/utils/masks";

export interface AptInput {
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
  service_id?: string | null;
  series_id?: string | null;
  recurrence_rule?: unknown;
}

interface KnownPatient { name: string; email: string }

interface ServiceMaps {
  labels: Record<string, Record<string, string>>;
  dot: Record<string, string>;
}

export interface AppointmentEditorPayload {
  professional_id: string | null;
  patient_name: string;
  patient_email: string | null;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  type: string;
  service_type: string;
  /** Catalog service (care_services) driving the price in financial insights. */
  service_id?: string | null;
  notes: string | null;
  clinic_id?: string;
}

interface CareServiceOption { id: string; name: string; price: number; billing_type: string }

export interface AppointmentEditorExtras {
  cpf: string;
  birth_date: string;
  phone: string;
  address: string;
  selectedPatientKey: string; // "__new__" or email
  recurrence?: RecurrenceRule;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Frozen snapshot at open. null = new appointment. */
  initialApt: AptInput | null;
  defaultDate: Date;
  defaultTime: string;
  /** Parent context */
  professionalId?: string;
  clinicId?: string | null;
  isSimulated: boolean;
  isClinicOnlyMode: boolean;
  clinicProfessionals: { id: string; full_name: string }[];
  knownPatients: KnownPatient[];
  /** i18n */
  language: string;
  isPt: boolean;
  t: (k: string) => string;
  serviceMaps: ServiceMaps;
  /** Callbacks back to parent */
  onSubmit: (args: {
    isEdit: boolean;
    editId: string | null;
    payload: AppointmentEditorPayload;
    extras: AppointmentEditorExtras;
  }) => Promise<boolean>;
  onRequestDelete: (id: string) => void;
  onSetStatus: (id: string, status: string) => Promise<void> | void;
  onViewPatient?: (email: string) => void;
  /** Called after evolution save/delete to refresh map/cards */
  onEvolutionChanged?: () => void;
}

const STATUS_OPTIONS = ["scheduled", "completed", "no_show", "no_show_justified"] as const;

const STATUS_BUTTON_STYLES: Record<string, { active: string; idle: string; icon: typeof Check }> = {
  scheduled: {
    active: "bg-card text-foreground border-foreground/30 ring-2 ring-foreground/50",
    idle: "bg-card text-muted-foreground border-border hover:border-foreground/30",
    icon: Clock,
  },
  completed: {
    active: "bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-300",
    idle: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    icon: CheckCircle2,
  },
  no_show: {
    active: "bg-red-500 text-white border-red-600 ring-2 ring-red-300",
    idle: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    icon: XCircle,
  },
  no_show_justified: {
    active: "bg-amber-500 text-white border-amber-600 ring-2 ring-amber-300",
    idle: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    icon: AlertCircle,
  },
};

const STATUS_LABELS: Record<string, Record<string, string>> = {
  scheduled: { pt: "Em aberto", en: "Open", es: "Abierto" },
  completed: { pt: "Compareceu", en: "Attended", es: "Asistió" },
  no_show: { pt: "Falta", en: "No-show", es: "Falta" },
  no_show_justified: { pt: "Falta just.", en: "Justified", es: "Justificada" },
};

const normalizeEvolutionEmail = (email: string) => email.trim().toLowerCase();

type EvolutionEntry = { raw: string; stamp: string; content: string; appointmentDate: string | null; appointmentTime: string | null };

const parseEvolutionStamp = (stamp: string) => {
  const normalized = stamp.trim();
  const iso = normalized.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/);
  if (iso) return { appointmentDate: iso[1], appointmentTime: iso[2] || null };
  const slash = normalized.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:,?\s*(\d{2}):(\d{2}))?/);
  if (slash) {
    const [, d, m, y, h, mm] = slash;
    return { appointmentDate: `${y}-${m}-${d}`, appointmentTime: h && mm ? `${h}:${mm}` : null };
  }
  return { appointmentDate: null, appointmentTime: null };
};

const parseEvolutionEntries = (content: string): EvolutionEntry[] => {
  if (!content) return [];
  return content.split(/\n\n(?=\[)/g).map(c => c.trim()).filter(Boolean).map(raw => {
    const m = raw.match(/^\[([^\]]+)\]\s*\n?([\s\S]*)$/);
    const stamp = m?.[1]?.trim() || "";
    const body = (m?.[2] || raw).trim();
    const parsed = stamp ? parseEvolutionStamp(stamp) : { appointmentDate: null, appointmentTime: null };
    return { raw, stamp, content: body, ...parsed };
  });
};

const matchesAppointmentEvolution = (entry: EvolutionEntry, apt: AptInput) => {
  if (!entry.appointmentDate || entry.appointmentDate !== apt.appointment_date) return false;
  const aptTime = apt.appointment_time?.slice(0, 5) || null;
  return !entry.appointmentTime || !aptTime || entry.appointmentTime === aptTime;
};

const AppointmentEditorDialog = ({
  open, onClose,
  initialApt, defaultDate, defaultTime,
  professionalId, clinicId, isSimulated, isClinicOnlyMode,
  clinicProfessionals, knownPatients,
  language, isPt, t, serviceMaps,
  onSubmit, onRequestDelete, onSetStatus, onViewPatient, onEvolutionChanged,
}: Props) => {
  const { toast } = useToast();
  const isEdit = !!initialApt;

  // ---- Form state, fully initialized from props on FIRST render ----
  const [currentApt, setCurrentApt] = useState<AptInput | null>(initialApt);
  const [formProfessionalId, setFormProfessionalId] = useState(
    initialApt?.professional_id || professionalId || (clinicProfessionals[0]?.id ?? "")
  );
  const [formDate, setFormDate] = useState<Date>(
    initialApt ? new Date(initialApt.appointment_date + "T12:00:00") : defaultDate
  );
  const [formTime, setFormTime] = useState(
    initialApt?.appointment_time?.slice(0, 5) || defaultTime
  );
  const [formDuration, setFormDuration] = useState(String(initialApt?.duration_minutes ?? 50));
  const [formName, setFormName] = useState(initialApt?.patient_name ?? "");
  const [formEmail, setFormEmail] = useState(initialApt?.patient_email ?? "");
  const [formType, setFormType] = useState(initialApt?.type ?? "in_person");
  const [formServiceType, setFormServiceType] = useState(initialApt?.service_type ?? "fisioterapia");
  const [formServiceId, setFormServiceId] = useState<string>(initialApt?.service_id ?? "__none__");
  const [careServices, setCareServices] = useState<CareServiceOption[]>([]);
  const [formNotes, setFormNotes] = useState(initialApt?.notes ?? "");

  // Catálogo de serviços do escopo (define o valor nas métricas financeiras).
  useEffect(() => {
    if (isSimulated || (!clinicId && !professionalId)) return;
    let alive = true;
    (async () => {
      let q = (supabase.from("care_services" as any) as any)
        .select("id, name, price, billing_type").eq("active", true).order("name");
      if (clinicId) q = q.eq("clinic_id", clinicId);
      else q = q.eq("professional_id", professionalId).is("clinic_id", null);
      const { data } = await q;
      if (alive && Array.isArray(data)) setCareServices(data);
    })();
    return () => { alive = false; };
  }, [clinicId, professionalId, isSimulated]);
  const [formCpf, setFormCpf] = useState("");
  const [formBirthDate, setFormBirthDate] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [recurrence, setRecurrenceState] = useState<RecurrenceRule>(
    () => (initialApt?.recurrence_rule as RecurrenceRule | null | undefined) || { freq: "none" }
  );
  const [recurrenceTouched, setRecurrenceTouched] = useState(false);
  const setRecurrence = (r: RecurrenceRule) => { setRecurrenceState(r); setRecurrenceTouched(true); };
  const [selectedPatientKey, setSelectedPatientKey] = useState<string>(() => {
    if (!initialApt) return "__new__";
    const em = (initialApt.patient_email || "").toLowerCase();
    const nm = (initialApt.patient_name || "").toLowerCase();
    const match = knownPatients.find(p =>
      (em && p.email.toLowerCase() === em) || (!em && nm && p.name.toLowerCase() === nm)
    );
    if (!match) return "__new__";
    return match.email ? `email:${match.email.toLowerCase()}` : `name:${match.name.toLowerCase()}`;
  });
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [emailWarning, setEmailWarning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const patientPickerContainerRef = useRef<HTMLDivElement | null>(null);

  // ---- Evolution state ----
  const hasEvolutionContext = !!(currentApt?.patient_email && (currentApt?.professional_id || professionalId));
  const [evoLoading, setEvoLoading] = useState(hasEvolutionContext);
  const [evoError, setEvoError] = useState(false);
  const [evoAssessmentId, setEvoAssessmentId] = useState<string | null>(null);
  const [evoExistingContent, setEvoExistingContent] = useState("");
  const [evoText, setEvoText] = useState("");
  const [evoSaving, setEvoSaving] = useState(false);
  const [evoDeleting, setEvoDeleting] = useState(false);
  const [evoDeleteConfirm, setEvoDeleteConfirm] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => () => { aliveRef.current = false; }, []);

  useEffect(() => {
    if (!patientPickerOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!patientPickerContainerRef.current?.contains(event.target as Node)) {
        setPatientPickerOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [patientPickerOpen]);

  // ---- Load patient extras + evolution on mount (component is keyed by parent) ----
  useEffect(() => {
    let cancelled = false;
    const apt = currentApt;
    if (!apt) return;

    // Patient extras
    (async () => {
      try {
        let query = (supabase.from("patients" as any) as any).select("*");
        if (clinicId) query = query.eq("clinic_id", clinicId);
        else if (professionalId) query = query.eq("professional_id", professionalId).is("clinic_id", null);
        if (apt.patient_email) query = query.eq("email", apt.patient_email);
        else query = query.eq("full_name", apt.patient_name);
        const { data } = await query.limit(1);
        if (cancelled || !aliveRef.current) return;
        if (data && data.length > 0) {
          const p = data[0];
          setFormCpf(p.cpf ? formatCpf(p.cpf) : "");
          setFormBirthDate(p.birth_date || "");
          setFormPhone(p.phone ? formatPhone(p.phone) : "");
          setFormAddress(p.address || "");
        }
      } catch { /* ignore */ }
    })();

    // Evolution
    if (hasEvolutionContext) {
      (async () => {
        const evolutionEmail = normalizeEvolutionEmail(apt.patient_email!);
        const effectiveProId = apt.professional_id || professionalId || "";
        try {
          const aptDayStart = `${apt.appointment_date}T00:00:00`;
          const aptDayEnd = `${apt.appointment_date}T23:59:59`;
          const aptCreatedAt = `${apt.appointment_date}T${apt.appointment_time?.slice(0, 5) || "12:00"}:00`;

          let sameDayQuery = supabase.from("assessments")
            .select("id, created_at")
            .eq("patient_email", evolutionEmail)
            .gte("created_at", aptDayStart).lte("created_at", aptDayEnd)
            .order("created_at", { ascending: false }).limit(1);
          if (clinicId) sameDayQuery = sameDayQuery.eq("clinic_id", clinicId);
          else sameDayQuery = sameDayQuery.eq("professional_id", effectiveProId).is("clinic_id", null);
          const { data: sameDayRows } = await sameDayQuery;

          let assessmentId = sameDayRows?.[0]?.id || null;
          if (!assessmentId) {
            let latestQuery = supabase.from("assessments")
              .select("id, created_at")
              .eq("patient_email", evolutionEmail)
              .order("created_at", { ascending: false }).limit(1);
            if (clinicId) latestQuery = latestQuery.eq("clinic_id", clinicId);
            else latestQuery = latestQuery.eq("professional_id", effectiveProId).is("clinic_id", null);
            const { data: latestRows } = await latestQuery;
            assessmentId = latestRows?.[0]?.id || null;
          }

          if (!assessmentId) {
            const ins: any = {
              type: "professional", status: "draft", user_id: null,
              professional_id: clinicId ? null : effectiveProId,
              clinic_id: clinicId || null,
              payment_status: "covered",
              patient_name: apt.patient_name || null,
              patient_email: evolutionEmail,
              anamnesis_data: { quickEvolutionOnly: true, placeholder: true, source: "schedule", appointment_id: apt.id },
              created_at: aptCreatedAt,
            };
            const { data: created, error } = await supabase.from("assessments").insert(ins).select("id").single();
            if (error) throw error;
            assessmentId = created.id;
          }


          const { data: existingRows } = await supabase.from("professional_notes")
            .select("content, professional_id, updated_at")
            .eq("assessment_id", assessmentId)
            .order("updated_at", { ascending: false }).limit(5);
          const matching = existingRows?.find((r: any) => r.professional_id === effectiveProId) || existingRows?.[0];

          if (cancelled || !aliveRef.current) return;
          setEvoAssessmentId(assessmentId);
          setEvoExistingContent(matching?.content || "");
          setEvoLoading(false);
        } catch (e: any) {
          if (cancelled || !aliveRef.current) return;
          setEvoError(true);
          setEvoLoading(false);
        }
      })();
    }

    return () => { cancelled = true; };
  // mount-only; component is keyed by parent on each open
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Derived ----
  const evoEntries = useMemo(() => parseEvolutionEntries(evoExistingContent), [evoExistingContent]);
  const appointmentEvoEntries = useMemo(
    () => currentApt ? evoEntries.filter(e => matchesAppointmentEvolution(e, currentApt)) : [],
    [evoEntries, currentApt]
  );
  const lastEvoEntry = appointmentEvoEntries[appointmentEvoEntries.length - 1] || null;

  // ---- Handlers ----
  const patientKeyOf = (p: { name: string; email: string }) =>
    p.email ? `email:${p.email.toLowerCase()}` : `name:${p.name.toLowerCase()}`;

  const handleSelectPatient = (key: string) => {
    setSelectedPatientKey(key);
    setEmailWarning(false);
    if (key === "__new__") {
      setFormName(""); setFormEmail("");
    } else {
      const p = knownPatients.find(k => patientKeyOf(k) === key);
      if (p) { setFormName(p.name); setFormEmail(p.email); }
    }
  };

  const handleSetStatusLocal = async (status: string) => {
    if (!currentApt) return;
    setStatusUpdating(status);
    try {
      await onSetStatus(currentApt.id, status);
      if (aliveRef.current) setCurrentApt(prev => prev ? { ...prev, status } : prev);
    } finally {
      if (aliveRef.current) setStatusUpdating(null);
    }
  };

  const isCommitment = formServiceType === "compromisso";
  const handleSave = async () => {
    if ((parseInt(formDuration) || 0) <= 0) {
      toast({ title: isPt ? "O fim deve ser depois do início" : "End must be after start", variant: "destructive" });
      return;
    }
    if (!formName.trim()) return;
    if (!isCommitment && selectedPatientKey === "__new__" && !formEmail.trim()) { setEmailWarning(true); return; }
    // professional is optional now — clinic owner/admin/secretary can schedule without assigning a therapist
    const rawProfId = (clinicId && formProfessionalId) ? formProfessionalId : (professionalId || formProfessionalId);
    const effectiveProfId = rawProfId && rawProfId !== "__none__" ? rawProfId : null;
    if (!clinicId && !effectiveProfId) {
      toast({ title: isPt ? "Selecione um profissional" : "Select a professional", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: AppointmentEditorPayload = {
      professional_id: effectiveProfId,
      patient_name: formName.trim(),
      patient_email: isCommitment ? null : formEmail.trim() || null,
      appointment_date: format(formDate, "yyyy-MM-dd"),
      appointment_time: formTime,
      duration_minutes: parseInt(formDuration) || 50,
      type: formType,
      service_type: formServiceType,
      notes: formNotes || null,
    };
    if (clinicId) payload.clinic_id = clinicId;
    const extras: AppointmentEditorExtras = {
      cpf: formCpf, birth_date: formBirthDate, phone: formPhone, address: formAddress,
      selectedPatientKey,
      recurrence: isEdit ? (recurrenceTouched ? recurrence : undefined) : recurrence,
    };
    const ok = await onSubmit({ isEdit, editId: currentApt?.id ?? null, payload, extras });
    if (aliveRef.current) setSaving(false);
    if (ok) onClose();
  };

  const handleSaveEvolution = async () => {
    if (!currentApt || !evoAssessmentId || !evoText.trim()) return;
    const effectiveProId = currentApt.professional_id || professionalId || "";
    if (!effectiveProId) return;
    setEvoSaving(true);
    try {
      const stamp = `${currentApt.appointment_date} ${currentApt.appointment_time?.slice(0, 5) || "12:00"}`;
      const entry = `[${stamp}]\n${evoText.trim()}`;
      const newContent = evoExistingContent ? `${evoExistingContent}\n\n${entry}` : entry;
      const { error } = await supabase.from("professional_notes").upsert(
        { professional_id: effectiveProId, assessment_id: evoAssessmentId, content: newContent, updated_at: new Date().toISOString() },
        { onConflict: "professional_id,assessment_id" }
      );
      if (error) throw error;

      // Also mirror to session_notes so it appears in the patient's evolution record
      if (currentApt.patient_email) {
        try {
          await (supabase.from("session_notes" as any) as any).insert({
            professional_id: effectiveProId,
            clinic_id: clinicId || null,
            patient_email: normalizeEvolutionEmail(currentApt.patient_email),
            appointment_id: currentApt.id,
            session_date: currentApt.appointment_date,
            content: evoText.trim(),
          });
        } catch (mirrorErr) {
          console.warn("[evolution] failed to mirror to session_notes", mirrorErr);
        }
      }

      if (!aliveRef.current) return;
      setEvoExistingContent(newContent);
      setEvoText("");
      toast({ title: isPt ? "Evolução registrada" : language === "es" ? "Evolución registrada" : "Evolution saved" });
      onEvolutionChanged?.();
    } catch (e: any) {
      toast({ title: isPt ? "Erro ao salvar evolução" : "Failed to save evolution", description: e?.message, variant: "destructive" });
    } finally {
      if (aliveRef.current) setEvoSaving(false);
    }
  };

  const handleDeleteLastEvolution = async () => {
    if (!currentApt || !evoAssessmentId || !lastEvoEntry) return;
    const effectiveProId = currentApt.professional_id || professionalId || "";
    setEvoDeleting(true);
    try {
      const targetIdx = evoEntries.lastIndexOf(lastEvoEntry);
      const remaining = evoEntries.filter((_, i) => i !== targetIdx).map(e => e.raw).join("\n\n");
      const { error } = await supabase.from("professional_notes").upsert(
        { professional_id: effectiveProId, assessment_id: evoAssessmentId, content: remaining, updated_at: new Date().toISOString() },
        { onConflict: "professional_id,assessment_id" }
      );
      if (error) throw error;

      // Mirror delete to session_notes (best-effort): remove matching entry for this appointment
      try {
        const targetContent = lastEvoEntry.content?.trim();
        let delQ: any = (supabase.from("session_notes" as any) as any).delete().eq("appointment_id", currentApt.id);
        if (targetContent) delQ = delQ.eq("content", targetContent);
        await delQ;
      } catch (mirrorErr) {
        console.warn("[evolution] failed to mirror delete to session_notes", mirrorErr);
      }

      if (!aliveRef.current) return;
      setEvoExistingContent(remaining);
      toast({ title: isPt ? "Última evolução excluída" : language === "es" ? "Última evolución eliminada" : "Last evolution deleted" });
      onEvolutionChanged?.();
    } catch (e: any) {
      toast({ title: isPt ? "Erro ao excluir evolução" : "Failed to delete evolution", description: e?.message, variant: "destructive" });
    } finally {
      if (aliveRef.current) { setEvoDeleting(false); setEvoDeleteConfirm(false); }
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="w-[calc(100vw-1.25rem)] max-w-md sm:max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-hidden p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 pt-5 pb-3 sm:px-6 sm:pt-6 border-b border-border/40">
            <DialogTitle className="text-base sm:text-lg">
              {isEdit ? t("schedule.edit") : t("schedule.new")}
            </DialogTitle>
            <DialogDescription className="text-xs">{t("schedule.form_desc")}</DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
            <div className="px-4 py-4 sm:px-6 space-y-4">
              {/* ---- STATUS (only when editing) ---- */}
              {isEdit && currentApt && (
                <section className="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {isPt ? "Classificação do atendimento" : language === "es" ? "Estado de la cita" : "Appointment status"}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {STATUS_OPTIONS.map((st) => {
                      const cfg = STATUS_BUTTON_STYLES[st];
                      const Icon = cfg.icon;
                      const active = currentApt.status === st;
                      const updating = statusUpdating === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={!!statusUpdating}
                          onClick={() => handleSetStatusLocal(st)}
                          className={cn(
                            "flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-[11px] font-medium transition-all",
                            active ? cfg.active : cfg.idle,
                            statusUpdating && !active && "opacity-50"
                          )}
                        >
                          {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
                          {STATUS_LABELS[st]?.[language] || st}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ---- BASIC DATA ---- */}
              <section className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("schedule.date")}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-1.5 mt-1 h-9">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          {format(formDate, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={formDate} onSelect={(d) => d && setFormDate(d)} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("schedule.time")}</label>
                    <Input type="time" value={formTime} onChange={(e) => setFormTime(e.target.value)} className="mt-1 text-xs h-9" />
                    <label className="text-xs font-medium text-muted-foreground mt-2 block">{isPt ? "Fim" : "End"}</label>
                    <Input
                      type="time"
                      value={endTimeFrom(formTime, parseInt(formDuration) || 0)}
                      onChange={(e) => {
                        const d = durationBetween(formTime, e.target.value);
                        setFormDuration(d ? String(d) : "0");
                      }}
                      className="mt-1 text-xs h-9"
                    />
                  </div>
                </div>

                {!isSimulated && (
                  <div className="space-y-1">
                    <RecurrencePicker value={recurrence} onChange={setRecurrence} startDate={format(formDate, "yyyy-MM-dd")} language={language} />
                    {isEdit && recurrenceTouched && (
                      <p className="text-[11px] text-muted-foreground">
                        {isPt
                          ? "Vale a partir desta data: os próximos agendamentos em aberto desta série serão refeitos. Sessões realizadas são mantidas."
                          : language === "es"
                            ? "Aplica desde esta fecha: se rehacen las próximas citas abiertas de la serie. Las realizadas se mantienen."
                            : "Applies from this date: upcoming open appointments in this series are rebuilt. Completed sessions are kept."}
                      </p>
                    )}
                  </div>
                )}

                {clinicId && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {isPt ? "Profissional (opcional)" : "Professional (optional)"}
                    </label>
                    <Select
                      value={formProfessionalId || "__none__"}
                      onValueChange={(v) => setFormProfessionalId(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="mt-1 text-xs h-9">
                        <SelectValue placeholder={isPt ? "Sem profissional vinculado" : "No professional assigned"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">
                          {isPt ? "Sem profissional vinculado" : "No professional assigned"}
                        </SelectItem>
                        {clinicProfessionals.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {clinicProfessionals.length === 0 && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {isPt
                          ? "Nenhum profissional cadastrado. Você pode agendar mesmo assim — vincule depois se desejar."
                          : "No professional registered yet. You can still schedule and assign one later."}
                      </p>
                    )}
                  </div>
                )}

                {isCommitment ? (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {isPt ? "Descrição do compromisso" : "Commitment description"} *
                    </label>
                    <Input
                      value={formName} onChange={(e) => setFormName(e.target.value)}
                      placeholder={isPt ? "Ex.: Reunião de equipe" : "e.g. Team meeting"}
                      className="mt-1 text-xs h-9"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {isPt ? "Entra só na agenda, sem cadastro de paciente." : "Calendar only — no patient record is created."}
                    </p>
                  </div>
                ) : (<>
                <div className="relative" ref={patientPickerContainerRef}>
                  <label className="text-xs font-medium text-muted-foreground">{t("schedule.select_patient")}</label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    role="combobox"
                    aria-expanded={patientPickerOpen}
                    onClick={() => setPatientPickerOpen((prev) => !prev)}
                    className="w-full justify-between mt-1 h-9 text-xs font-normal"
                  >
                    <span className="truncate">
                      {selectedPatientKey === "__new__"
                        ? t("schedule.new_patient")
                        : (() => {
                            const p = knownPatients.find(k => patientKeyOf(k) === selectedPatientKey);
                            return p ? `${p.name}${p.email ? ` (${p.email})` : ""}` : t("schedule.select_patient_ph");
                          })()}
                    </span>
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50 shrink-0 ml-2" />
                  </Button>
                  {patientPickerOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
                      <Command
                        className="rounded-md"
                        filter={(value, search) => {
                          if (!search) return 1;
                          return value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0;
                        }}
                      >
                        <CommandInput placeholder={isPt ? "Digite o nome para buscar..." : language === "es" ? "Escribe el nombre para buscar..." : "Type the name to search..."} className="h-9 text-xs" />
                        <div className="max-h-[180px] overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-y" }}>
                          <CommandList className="max-h-none overflow-visible">
                            <CommandEmpty>{isPt ? "Nenhum paciente encontrado" : language === "es" ? "Ningún paciente encontrado" : "No patient found"}</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                value="__novo paciente__"
                                onSelect={() => { handleSelectPatient("__new__"); setPatientPickerOpen(false); }}
                                className="text-xs"
                              >
                                <Check className={cn("mr-2 h-3.5 w-3.5", selectedPatientKey === "__new__" ? "opacity-100" : "opacity-0")} />
                                {t("schedule.new_patient")}
                              </CommandItem>
                              {[...knownPatients]
                                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                                .map(p => {
                                  const k = patientKeyOf(p);
                                  const label = `${p.name}${p.email ? ` ${p.email}` : ""}`;
                                  return (
                                    <CommandItem
                                      key={k}
                                      value={label}
                                      onSelect={() => { handleSelectPatient(k); setPatientPickerOpen(false); }}
                                      className="text-xs"
                                    >
                                      <Check className={cn("mr-2 h-3.5 w-3.5", selectedPatientKey === k ? "opacity-100" : "opacity-0")} />
                                      <span className="truncate">{p.name}{p.email ? <span className="text-muted-foreground"> · {p.email}</span> : null}</span>
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                          </CommandList>
                        </div>
                      </Command>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("schedule.patient_name")} *</label>
                    <Input
                      value={formName} onChange={(e) => setFormName(e.target.value)}
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
                      value={formEmail} onChange={(e) => { setFormEmail(e.target.value); setEmailWarning(false); }}
                      placeholder={t("schedule.patient_email_ph")}
                      className={cn("mt-1 text-xs h-9", emailWarning && "border-destructive")}
                      disabled={selectedPatientKey !== "__new__"}
                    />
                    {emailWarning && <p className="text-[10px] text-destructive mt-1">{t("schedule.email_required")}</p>}
                  </div>
                </div>

                {selectedPatientKey === "__new__" && (
                  <>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">CPF</label>
                        <Input value={formCpf} onChange={(e) => setFormCpf(formatCpf(e.target.value))} placeholder="000.000.000-00" className="mt-1 text-xs h-9" maxLength={14} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">{isPt ? "Nascimento" : "Birth"}</label>
                        <Input type="date" value={formBirthDate} onChange={(e) => setFormBirthDate(e.target.value)} className="mt-1 text-xs h-9" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">{isPt ? "Celular" : "Phone"}</label>
                        <Input value={formPhone} onChange={(e) => setFormPhone(formatPhone(e.target.value))} placeholder="(00) 00000-0000" className="mt-1 text-xs h-9" maxLength={15} />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground">{isPt ? "Endereço" : "Address"}</label>
                        <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder={isPt ? "Rua, nº" : "Street"} className="mt-1 text-xs h-9" />
                      </div>
                    </div>
                  </>
                )}
                </>)}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{isPt ? "Serviço" : "Service"}</label>
                    <Select value={formServiceType} onValueChange={setFormServiceType}>
                      <SelectTrigger className="mt-1 text-xs h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(serviceMaps.labels).map(([key, labels]) => (
                          <SelectItem key={key} value={key}>
                            <span className="flex items-center gap-2">
                              <span className={cn("w-2 h-2 rounded-full", serviceMaps.dot[key])} />
                              {labels[language] || labels.en}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">{t("schedule.duration")}</label>
                    <p className={cn("mt-1 text-xs h-9 flex items-center", (parseInt(formDuration) || 0) <= 0 && "text-destructive")}>
                      {(parseInt(formDuration) || 0) > 0 ? formatDuration(parseInt(formDuration)) : (isPt ? "Fim deve ser após o início" : "End must be after start")}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {[[30, "30 min"], [50, "50 min"], [60, "1h"], [120, "2h"]].map(([m, l]) => (
                        <button key={m} type="button" onClick={() => setFormDuration(String(m))} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">{l}</button>
                      ))}
                      <button type="button" onClick={() => { setFormTime("08:00"); setFormDuration("600"); }} className="text-[10px] px-2 py-0.5 rounded-full border border-border hover:bg-muted">{isPt ? "Dia inteiro" : "All day"}</button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">{t("schedule.type")}</label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger className="mt-1 text-xs h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_person">{t("schedule.type_in_person")}</SelectItem>
                      <SelectItem value="video_call">{t("schedule.type_video_call")}</SelectItem>
                      <SelectItem value="external">{t("schedule.type_external")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </section>

              {/* ---- EVOLUTION ---- */}
              {isEdit && hasEvolutionContext && (
                <section className="rounded-lg border border-emerald-200/60 bg-emerald-50/30 dark:bg-emerald-900/10 p-3 space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Pencil className="h-3.5 w-3.5 text-emerald-700" />
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
                      {isPt ? "Evolução do atendimento" : language === "es" ? "Evolución de la sesión" : "Session evolution"}
                    </p>
                    {appointmentEvoEntries.length > 0 && (
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-200/60 text-emerald-800">
                        {appointmentEvoEntries.length} {isPt ? "registro(s)" : "entries"}
                      </span>
                    )}
                  </div>

                  {evoLoading ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {isPt ? "Carregando evolução..." : "Loading evolution..."}
                    </div>
                  ) : evoError ? (
                    <p className="text-[11px] text-muted-foreground py-2">
                      {isPt ? "Não foi possível preparar a evolução agora." : "Couldn't prepare evolution right now."}
                    </p>
                  ) : (
                    <>
                      {evoExistingContent && (
                        <details className="text-[11px] rounded-md border border-border/40 bg-background/60 p-2">
                          <summary className="cursor-pointer text-muted-foreground">
                            {isPt ? "Ver evoluções anteriores" : language === "es" ? "Ver evoluciones" : "Show previous"}
                          </summary>
                          <pre className="whitespace-pre-wrap mt-2 max-h-40 overflow-y-auto font-sans text-foreground/80">{evoExistingContent}</pre>
                        </details>
                      )}
                      <Textarea
                        value={evoText}
                        onChange={(e) => setEvoText(e.target.value)}
                        placeholder={isPt ? "Descreva o que foi feito neste atendimento..." : language === "es" ? "Describa lo realizado..." : "Describe what was done..."}
                        className="text-xs min-h-[120px] w-full resize-y leading-relaxed"
                      />
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                        {appointmentEvoEntries.length > 0 && (
                          <Button
                            type="button" size="sm" variant="ghost"
                            className="text-xs h-8 gap-1.5 text-destructive hover:text-destructive sm:mr-auto"
                            disabled={evoDeleting}
                            onClick={() => setEvoDeleteConfirm(true)}
                          >
                            <Trash2 className="h-3 w-3" />
                            {isPt ? "Excluir última" : "Delete last"}
                          </Button>
                        )}
                        <Button
                          type="button" size="sm"
                          className="text-xs gap-1.5 h-8"
                          onClick={handleSaveEvolution}
                          disabled={evoSaving || !evoText.trim()}
                        >
                          {evoSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          {isPt ? "Salvar evolução" : language === "es" ? "Guardar" : "Save evolution"}
                        </Button>
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* ---- NOTES ---- */}
              <section>
                <label className="text-xs font-medium text-muted-foreground">{t("schedule.notes")}</label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={t("schedule.notes_ph")} className="mt-1 text-xs min-h-[60px]" />
              </section>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row px-4 py-3 sm:px-6 border-t border-border/40">
            {isEdit && currentApt && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5 sm:mr-auto" onClick={() => onRequestDelete(currentApt.id)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                {t("schedule.delete")}
              </Button>
            )}
            {isEdit && currentApt?.patient_email && onViewPatient && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={() => { onViewPatient(currentApt.patient_email!); onClose(); }}>
                {t("schedule.view_patient")}
                <ChevronRight className="h-3 w-3" />
              </Button>
            )}
            <Button size="sm" className="gap-1.5 rounded-xl text-xs" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarIcon className="h-3.5 w-3.5" />}
              {isEdit ? t("schedule.save_edit") : t("schedule.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={evoDeleteConfirm} onOpenChange={(o) => { if (!o && !evoDeleting) setEvoDeleteConfirm(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isPt ? "Excluir última evolução?" : language === "es" ? "¿Eliminar última evolución?" : "Delete last evolution?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span>
                {isPt ? "Esta ação remove permanentemente o último registro." : "This permanently removes the last entry."}
              </span>
              {lastEvoEntry && (
                <span className="block mt-2 rounded-md border border-border/40 bg-muted/40 p-2 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto font-mono">
                  {lastEvoEntry.raw}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={evoDeleting}>{t("session_notes.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={evoDeleting}
              onClick={(e) => { e.preventDefault(); handleDeleteLastEvolution(); }}
            >
              {evoDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : (isPt ? "Excluir" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default AppointmentEditorDialog;
