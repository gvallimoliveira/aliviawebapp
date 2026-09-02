import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, UserPlus, Users, Loader2, Stethoscope } from "lucide-react";
import AddPatientModal from "./AddPatientModal";
import ManualAssessmentModal from "./ManualAssessmentModal";

interface PatientRow {
  id: string;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  professionalId: string;
  clinicId?: string | null;
  isDemo?: boolean;
}

const LABELS = {
  pt: {
    title: "Iniciar nova avaliação",
    desc: "Selecione um paciente existente ou cadastre um novo para iniciar a avaliação manual.",
    search: "Buscar por nome ou e-mail...",
    addNew: "Adicionar novo paciente",
    empty: "Nenhum paciente encontrado.",
    emptyHint: "Cadastre o primeiro paciente para começar.",
    loading: "Carregando pacientes...",
    assess: "Avaliar",
  },
  en: {
    title: "Start new assessment",
    desc: "Pick an existing patient or add a new one to start the manual assessment.",
    search: "Search by name or email...",
    addNew: "Add new patient",
    empty: "No patients found.",
    emptyHint: "Add your first patient to get started.",
    loading: "Loading patients...",
    assess: "Assess",
  },
  es: {
    title: "Iniciar nueva evaluación",
    desc: "Elige un paciente existente o crea uno nuevo para iniciar la evaluación manual.",
    search: "Buscar por nombre o email...",
    addNew: "Agregar nuevo paciente",
    empty: "Ningún paciente encontrado.",
    emptyHint: "Agrega tu primer paciente para comenzar.",
    loading: "Cargando pacientes...",
    assess: "Evaluar",
  },
};

const AssessPatientPicker = ({ open, onOpenChange, professionalId, clinicId, isDemo }: Props) => {
  const { language } = useLanguage();
  const L = LABELS[(language as "pt" | "en" | "es") || "pt"] || LABELS.pt;

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [target, setTarget] = useState<{ name: string; email?: string; id?: string } | null>(null);

  useEffect(() => {
    if (!open || isDemo || !professionalId) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);

      // Load archived (hidden) patients. The hidden key (`patient_email` column)
      // actually stores the dashboard `groupKey` — which may be email, full_name
      // or id. So exclude any patient whose email OR full_name matches.
      const hiddenKeys = new Set<string>();
      try {
        if (clinicId) {
          const { data: hid } = await (supabase.from("clinic_hidden_patients" as any) as any)
            .select("patient_email")
            .eq("clinic_id", clinicId);
          (hid || []).forEach((h: any) => h?.patient_email && hiddenKeys.add(String(h.patient_email).toLowerCase()));
        } else {
          const { data: hid } = await (supabase.from("professional_hidden_patients" as any) as any)
            .select("patient_email")
            .eq("professional_id", professionalId);
          (hid || []).forEach((h: any) => h?.patient_email && hiddenKeys.add(String(h.patient_email).toLowerCase()));
        }
      } catch {
        // non-blocking — fall through with empty hidden set
      }

      let query = (supabase.from("patients" as any) as any)
        .select("id, full_name, email, phone, created_at, updated_at")
        .eq("is_study_case", false)
        .order("updated_at", { ascending: false })
        .limit(200);
      if (clinicId) {
        query = query.eq("clinic_id", clinicId);
      } else {
        query = query.eq("professional_id", professionalId);
      }
      const { data } = await query;
      if (!cancelled) {
        const rows = ((data as PatientRow[]) || []).filter((p) => {
          const emailKey = p.email ? String(p.email).toLowerCase() : "";
          const nameKey = p.full_name ? String(p.full_name).toLowerCase() : "";
          if (emailKey && hiddenKeys.has(emailKey)) return false;
          if (nameKey && hiddenKeys.has(nameKey)) return false;
          return true;
        });
        setPatients(rows);
        setLoading(false);
      }
    };
    load();
    const handler = () => load();
    window.addEventListener("reload-pro-patients", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("reload-pro-patients", handler);
    };
  }, [open, professionalId, clinicId, isDemo]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        (p.full_name || "").toLowerCase().includes(q) ||
        (p.email || "").toLowerCase().includes(q),
    );
  }, [patients, search]);

  const handlePick = (p: PatientRow) => {
    setTarget({ name: p.full_name, email: p.email || undefined, id: p.id });
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col rounded-t-2xl">
          <SheetHeader className="px-5 pt-5 pb-3 text-left">
            <SheetTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5 text-primary" />
              {L.title}
            </SheetTitle>
            <SheetDescription className="text-xs">{L.desc}</SheetDescription>
          </SheetHeader>

          <div className="px-5 pb-3 space-y-3 border-b border-border/40">
            <Button
              onClick={() => setAddOpen(true)}
              className="w-full rounded-xl gap-2 h-11 font-semibold"
            >
              <UserPlus className="h-4 w-4" />
              {L.addNew}
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={L.search}
                className="pl-9 rounded-xl h-10"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-3 py-3">
              {loading ? (
                <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {L.loading}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center px-6">
                  <Users className="h-8 w-8 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground">{L.empty}</p>
                  <p className="text-xs text-muted-foreground">{L.emptyHint}</p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {filtered.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => handlePick(p)}
                        className="w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl border border-border/60 bg-card hover:bg-muted/60 active:bg-muted transition-colors"
                      >
                        <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                          {(p.full_name || "?").trim().charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{p.full_name}</p>
                          {(p.email || p.phone) && (
                            <p className="text-xs text-muted-foreground truncate">
                              {p.email || p.phone}
                            </p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-primary shrink-0">{L.assess} →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <AddPatientModal
        open={addOpen}
        onOpenChange={setAddOpen}
        professionalId={professionalId}
        clinicId={clinicId || null}
        onAdded={() => { window.dispatchEvent(new CustomEvent("reload-pro-patients")); }}
        onCreateManualAssessment={(p) => {
          setTarget({ name: p.name, email: p.email });
          onOpenChange(false);
        }}
      />

      {target && (
        <ManualAssessmentModal
          open={!!target}
          onOpenChange={(o) => {
            if (!o) {
              setTarget(null);
              window.dispatchEvent(new CustomEvent("reload-pro-patients"));
            }
          }}
          professionalId={professionalId}
          clinicId={clinicId || null}
          patientName={target.name}
          patientEmail={target.email}
          patientId={target.id}
          demoMode={!!isDemo}
        />
      )}
    </>
  );
};

export default AssessPatientPicker;
