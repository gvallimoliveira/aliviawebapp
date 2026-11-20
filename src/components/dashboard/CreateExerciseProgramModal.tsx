import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { useRegistrationPending } from "@/hooks/useRegistrationPending";
import RegistrationRequiredDialog from "@/components/dashboard/RegistrationRequiredDialog";
import { useState, useEffect, useMemo, useRef } from "react";
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
  Loader2, Search, Plus, Minus, Dumbbell, Copy, Share2, Check, Link2, PenLine, Trash2, CloudUpload, Sparkles, Save, X, BookmarkPlus, GripVertical, Globe, Undo2,
} from "lucide-react";
import { useAutosaveDraft } from "@/hooks/useAutosaveDraft";
import DraftResumeBanner from "@/components/common/DraftResumeBanner";
import { HEP_TEMPLATES, type HepTemplate } from "@/data/hepTemplates";
import { shareTextNowOrOpenWhatsApp } from "@/lib/whatsappShare";
import { useAuth } from "@/contexts/AuthContext";
import { isFallbackVip } from "@/lib/vipEmails";
import { summarizeHep, spreadSessionDates, loadLevelFromTargetRpe } from "@/lib/hepLoad";
import HepLoadPanel from "./HepLoadPanel";

interface SavedTemplate {
  id: string;
  name: string;
  description: string | null;
  notes: string | null;
  body_region: string;
  professional_id: string | null;
  clinic_id: string | null;
  is_system?: boolean;
  items: Array<{
    exerciseId?: string;
    customName?: string;
    customVideoUrl?: string;
    sets: string;
    reps: string;
    frequency: string;
    observations?: string;
    stage?: string;
  }>;
}


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

interface LoadFields {
  /** Região de trabalho (vem da biblioteca, editável). */
  region?: string;
  /** "kg" | "bodyweight" | "band" */
  loadType?: string;
  loadKg?: string;
}

interface SelectedExercise extends LoadFields {
  exercise: Exercise;
  sets: string;
  reps: string;
  frequency: string;
  observations: string;
}

interface CustomExercise extends LoadFields {
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
  clinicId?: string | null;
  /** Demo mode: navigation works but the "Finalize" CTA is intercepted with an upsell. */
  demoMode?: boolean;
}



const categoryLabels: Record<string, Record<string, string>> = {
  strengthening: { pt: "Fortalecimento", en: "Strengthening", es: "Fortalecimiento" },
  stretching: { pt: "Alongamento", en: "Stretching", es: "Estiramiento" },
  mobility: { pt: "Mobilidade", en: "Mobility", es: "Movilidad" },
  proprioception: { pt: "Propriocepção", en: "Proprioception", es: "Propiocepción" },
  vestibular: { pt: "Vestibular", en: "Vestibular", es: "Vestibular" },
};

const regionLabels: Record<string, Record<string, string>> = {
  hip: { pt: "Quadril", en: "Hip", es: "Cadera" },
  knee: { pt: "Joelho", en: "Knee", es: "Rodilla" },
  shoulder: { pt: "Ombro", en: "Shoulder", es: "Hombro" },
  spine: { pt: "Coluna", en: "Spine", es: "Columna" },
  core: { pt: "Tronco/Core", en: "Trunk/Core", es: "Tronco/Core" },
  ankle: { pt: "Tornozelo", en: "Ankle", es: "Tobillo" },
  cervical: { pt: "Cervical", en: "Cervical", es: "Cervical" },
  wrist: { pt: "Punho", en: "Wrist", es: "Muñeca" },
  elbow: { pt: "Cotovelo", en: "Elbow", es: "Codo" },
  foot: { pt: "Pé", en: "Foot", es: "Pie" },
  vestibular: { pt: "Vestibular/Equilíbrio", en: "Vestibular/Balance", es: "Vestibular/Equilibrio" },
  general: { pt: "Geral", en: "General", es: "General" },
};

const CreateExerciseProgramModalInner = ({ open, onOpenChange, professionalId, patientName, assessmentId, editProgramId, clinicId, demoMode = false }: Props) => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<SelectedExercise[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [notes, setNotes] = useState("");
  const [domain, setDomain] = useState("physio");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [shortHepLink, setShortHepLink] = useState<string | null>(null);

  // Prepare the short link right after creation so the share tap needs no await
  // (iOS drops the share sheet when the tap gesture expires).
  useEffect(() => {
    setShortHepLink(null);
    if (!generatedLink) return;
    let cancelled = false;
    import("@/lib/shortLink")
      .then(({ createShortAppLink }) => createShortAppLink(generatedLink, { ttlSeconds: 60 * 60 * 24 * 90 }))
      .then((short) => { if (!cancelled && short) setShortHepLink(short); })
      .catch((err) => console.warn("[hep] short link failed", err));
    return () => { cancelled = true; };
  }, [generatedLink]);
  const [copied, setCopied] = useState(false);
  const isEditing = !!editProgramId;
  const [demoDialogOpen, setDemoDialogOpen] = useState(false);


  // Autosave (rascunho local + nuvem). Desligado em modo edição (já está salvo).
  const draftScope = `${professionalId}:${(patientName || "").trim().toLowerCase()}:${assessmentId || ""}`;
  const draft = useAutosaveDraft<{
    selected: SelectedExercise[];
    customExercises: CustomExercise[];
    notes: string;
  }>({
    formKey: "hep",
    scopeKey: open && !isEditing && !generatedLink ? draftScope : null,
    state: { selected, customExercises, notes },
    enabled: open && !isEditing && !generatedLink,
  });

  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<SavedTemplate[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showManageTemplates, setShowManageTemplates] = useState(false);

  const handleRestoreDraft = () => {
    const payload = draft.restore();
    if (!payload) return;
    setSelected(payload.selected || []);
    setCustomExercises(payload.customExercises || []);
    setNotes(payload.notes || "");
  };

  // Admin (VIP) detection — enables promoting/removing system-wide templates
  useEffect(() => {
    if (!open || !user?.email) { setIsAdmin(false); return; }
    const email = user.email.toLowerCase();
    if (isFallbackVip(email)) { setIsAdmin(true); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("vip_users").select("id").eq("email", email).maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => { cancelled = true; };
  }, [open, user?.email]);



  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from("exercise_library")
        .select("id, name_pt, name_en, name_es, body_region, category, difficulty, video_url")
        // Só exercícios com vídeo aprovado/validado entram na seleção do HEP;
        // pendentes de auditoria (mismatch, needs_replacement, broken, unknown) ficam ocultos.
        .in("video_status", ["ok", "approved"])
        .order("body_region")
        .order("category");
      setExercises(data || []);

      // Load templates: own professional + (if in clinic mode) clinic templates + system-wide ones
      const tplCols = "id, name, description, notes, body_region, items, professional_id, clinic_id, is_system";
      let tplsQuery = (supabase as any)
        .from("hep_templates")
        .select(tplCols)
        .eq("is_system", false)
        .order("created_at", { ascending: false });
      if (clinicId) {
        tplsQuery = tplsQuery.or(`professional_id.eq.${professionalId},clinic_id.eq.${clinicId}`);
      } else {
        tplsQuery = tplsQuery.eq("professional_id", professionalId);
      }
      const [{ data: tpls }, { data: sysTpls }] = await Promise.all([
        tplsQuery,
        (supabase as any)
          .from("hep_templates")
          .select(tplCols)
          .eq("is_system", true)
          .order("created_at", { ascending: false }),
      ]);
      setSavedTemplates((tpls || []) as SavedTemplate[]);
      setSystemTemplates((sysTpls || []) as SavedTemplate[]);



      // If editing, load existing program items
      if (editProgramId) {
        const { data: program } = await (supabase as any)
          .from("exercise_programs")
          .select("notes, domain")
          .eq("id", editProgramId)
          .single();
        if (program?.notes) setNotes(program.notes);
        if (program?.domain) setDomain(program.domain);

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
                  region: item.body_region || ex.body_region || "general",
                  loadType: item.load_type || "bodyweight",
                  loadKg: item.load_kg != null ? String(item.load_kg) : "",
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
                region: item.body_region || "general",
                loadType: item.load_type || "bodyweight",
                loadKg: item.load_kg != null ? String(item.load_kg) : "",
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
  }, [open, editProgramId, professionalId, clinicId]);

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
      setSelected([...selected, { exercise: ex, sets: "3", reps: "10", frequency: "3x/semana", observations: "", region: ex.body_region || "general", loadType: "bodyweight", loadKg: "" }]);
    }
  };

  const updateSelected = (id: string, field: string, value: string) => {
    setSelected(selected.map((s) => s.exercise.id === id ? { ...s, [field]: value } : s));
  };

  const removeSelected = (id: string) => {
    setSelected(selected.filter((s) => s.exercise.id !== id));
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
      region: "general",
      loadType: "bodyweight",
      loadKg: "",
    }]);
  };

  const updateCustom = (tempId: string, field: keyof CustomExercise, value: string) => {
    setCustomExercises(customExercises.map((c) => c.tempId === tempId ? { ...c, [field]: value } : c));
  };

  const removeCustom = (tempId: string) => {
    setCustomExercises(customExercises.filter((c) => c.tempId !== tempId));
  };

  // ---------- Drag-and-drop reorder (native HTML5) ----------
  const [dragSelectedIdx, setDragSelectedIdx] = useState<number | null>(null);
  const [overSelectedIdx, setOverSelectedIdx] = useState<number | null>(null);
  const [dragCustomIdx, setDragCustomIdx] = useState<number | null>(null);
  const [overCustomIdx, setOverCustomIdx] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const autoScrollRafRef = useRef<number | null>(null);
  const autoScrollSpeedRef = useRef<number>(0);
  const touchDragRef = useRef<{ list: "selected" | "custom"; fromIdx: number } | null>(null);

  const stopAutoScroll = () => {
    if (autoScrollRafRef.current !== null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    autoScrollSpeedRef.current = 0;
  };

  const runAutoScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || autoScrollSpeedRef.current === 0) {
      autoScrollRafRef.current = null;
      return;
    }
    el.scrollTop += autoScrollSpeedRef.current;
    autoScrollRafRef.current = requestAnimationFrame(runAutoScroll);
  };

  const updateAutoScrollFromY = (y: number) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const edge = 70;
    const maxSpeed = 20;
    let speed = 0;
    if (y < rect.top + edge) {
      const intensity = (rect.top + edge - y) / edge;
      speed = -Math.max(2, Math.min(maxSpeed, intensity * maxSpeed));
    } else if (y > rect.bottom - edge) {
      const intensity = (y - (rect.bottom - edge)) / edge;
      speed = Math.max(2, Math.min(maxSpeed, intensity * maxSpeed));
    }
    autoScrollSpeedRef.current = speed;
    if (speed !== 0 && autoScrollRafRef.current === null) {
      autoScrollRafRef.current = requestAnimationFrame(runAutoScroll);
    }
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    updateAutoScrollFromY(e.clientY);
  };

  useEffect(() => {
    if (dragSelectedIdx === null && dragCustomIdx === null) {
      stopAutoScroll();
    }
  }, [dragSelectedIdx, dragCustomIdx]);

  useEffect(() => () => stopAutoScroll(), []);

  // ---------- Touch-based drag (mobile/tablet) ----------
  const startTouchDrag = (list: "selected" | "custom", idx: number) => (e: React.TouchEvent) => {
    e.stopPropagation();
    touchDragRef.current = { list, fromIdx: idx };
    if (list === "selected") setDragSelectedIdx(idx);
    else setDragCustomIdx(idx);
  };

  useEffect(() => {
    if (dragSelectedIdx === null && dragCustomIdx === null) return;

    const findOverIdx = (clientX: number, clientY: number, list: "selected" | "custom"): number | null => {
      const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
      if (!el) return null;
      const card = el.closest<HTMLElement>(`[data-drag-list="${list}"]`);
      if (!card) return null;
      const idxStr = card.dataset.dragIdx;
      if (!idxStr) return null;
      return Number(idxStr);
    };

    const onTouchMove = (e: TouchEvent) => {
      const drag = touchDragRef.current;
      if (!drag) return;
      const touch = e.touches[0];
      if (!touch) return;
      e.preventDefault();
      updateAutoScrollFromY(touch.clientY);
      const overIdx = findOverIdx(touch.clientX, touch.clientY, drag.list);
      if (drag.list === "selected") {
        setOverSelectedIdx(overIdx);
      } else {
        setOverCustomIdx(overIdx);
      }
    };

    const onTouchEnd = () => {
      const drag = touchDragRef.current;
      stopAutoScroll();
      if (drag) {
        if (drag.list === "selected") {
          const to = overSelectedIdxRef.current;
          if (to !== null && to !== drag.fromIdx) {
            setSelected((prev) => reorder(prev, drag.fromIdx, to));
          }
          setDragSelectedIdx(null);
          setOverSelectedIdx(null);
        } else {
          const to = overCustomIdxRef.current;
          if (to !== null && to !== drag.fromIdx) {
            setCustomExercises((prev) => reorder(prev, drag.fromIdx, to));
          }
          setDragCustomIdx(null);
          setOverCustomIdx(null);
        }
      }
      touchDragRef.current = null;
    };

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [dragSelectedIdx, dragCustomIdx]);

  // Refs to read the latest "over" indices inside touchend without re-binding
  const overSelectedIdxRef = useRef<number | null>(null);
  const overCustomIdxRef = useRef<number | null>(null);
  useEffect(() => { overSelectedIdxRef.current = overSelectedIdx; }, [overSelectedIdx]);
  useEffect(() => { overCustomIdxRef.current = overCustomIdx; }, [overCustomIdx]);

  const reorder = <T,>(arr: T[], from: number, to: number): T[] => {
    if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
    const copy = arr.slice();
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    return copy;
  };

  const onSelectedDrop = (toIdx: number) => {
    if (dragSelectedIdx === null) return;
    setSelected((prev) => reorder(prev, dragSelectedIdx, toIdx));
    setDragSelectedIdx(null);
    setOverSelectedIdx(null);
  };

  const onCustomDrop = (toIdx: number) => {
    if (dragCustomIdx === null) return;
    setCustomExercises((prev) => reorder(prev, dragCustomIdx, toIdx));
    setDragCustomIdx(null);
    setOverCustomIdx(null);
  };

  const totalCount = selected.length + customExercises.filter(c => c.name.trim()).length;

  const loadSummary = useMemo(() => summarizeHep([
    ...selected.map((s) => ({ name: s.exercise.name_pt, region: s.region || s.exercise.body_region || "general", sets: s.sets, reps: s.reps, frequency: s.frequency, loadType: s.loadType, category: s.exercise.category, loadKg: s.loadKg ? Number(String(s.loadKg).replace(",", ".")) : null })),
    ...customExercises.filter((c) => c.name.trim()).map((c) => ({ name: c.name, region: c.region || "general", sets: c.sets, reps: c.reps, frequency: c.frequency, loadType: c.loadType, loadKg: c.loadKg ? Number(String(c.loadKg).replace(",", ".")) : null })),
  ]), [selected, customExercises]);

  const renderLoadFields = (x: LoadFields, set: (field: string, value: string) => void) => (
    <div className="grid grid-cols-3 gap-2">
      <div>
        <Label className="text-[10px]">Região</Label>
        <Select value={x.region || "general"} onValueChange={(v) => set("region", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(regionLabels).map(([k, l]) => <SelectItem key={k} value={k}>{l[language] || l.pt}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px]">Carga</Label>
        <Select value={x.loadType || "bodyweight"} onValueChange={(v) => set("loadType", v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="bodyweight">Peso corporal</SelectItem>
            <SelectItem value="band">Elástico</SelectItem>
            <SelectItem value="kg">Carga (kg)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-[10px]">kg</Label>
        <Input inputMode="decimal" disabled={x.loadType !== "kg"} value={x.loadKg || ""} onChange={(e) => set("loadKg", e.target.value)} className="h-8 text-xs" placeholder="—" />
      </div>
    </div>
  );

  /** Grava a dose planejada do HEP no microciclo do paciente (próximos 7 dias). */
  const syncPlannedDose = async (programId: string) => {
    if (!loadSummary.targetRpe || !loadSummary.sessionsPerWeek) return;
    const sb = supabase as any;
    const { data: pt } = await sb.from("patients").select("id").eq("professional_id", professionalId).ilike("full_name", patientName).limit(1).maybeSingle();
    if (!pt?.id) return;
    const { data: plan } = await sb.from("periodization_plans").select("id").eq("patient_id", pt.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const today = spreadSessionDates(1)[0];
    await sb.from("periodization_sessions").delete().eq("exercise_program_id", programId).gte("session_date", today);
    const level = loadLevelFromTargetRpe(loadSummary.targetRpe);
    const rows = spreadSessionDates(loadSummary.sessionsPerWeek).map((d) => ({
      patient_id: pt.id,
      plan_id: plan?.id ?? null,
      session_date: d,
      track: domain,
      planned_load: level,
      planned_duration_min: loadSummary.durationMin,
      planned_rpe: loadSummary.targetRpe,
      exercise_program_id: programId,
      title: "Programa de exercícios (HEP)",
      created_source: "hep",
    }));
    const { error } = await sb.from("periodization_sessions").insert(rows);
    if (error) throw error;
  };

  const applyTemplate = (tpl: HepTemplate) => {
    const lib = exercises;
    const newSelected: SelectedExercise[] = [];
    const missing: string[] = [];
    tpl.items.forEach((it) => {
      const ex = lib.find((e) => e.id === it.exerciseId);
      if (!ex) {
        missing.push(it.exerciseId);
        return;
      }
      // Skip duplicates already selected
      if (selected.some((s) => s.exercise.id === ex.id)) return;
      const obsParts: string[] = [];
      if (it.stage) obsParts.push(`[${it.stage}]`);
      if (it.observations) obsParts.push(it.observations);
      newSelected.push({
        exercise: ex,
        sets: it.sets,
        reps: it.reps,
        frequency: it.frequency,
        observations: obsParts.join(" "),
      });
    });
    setSelected([...selected, ...newSelected]);
    const tplNotes = language === "en" ? tpl.notes_en : tpl.notes_pt;
    setNotes((prev) => (prev ? `${prev}\n\n${tplNotes}` : tplNotes));
    toast({
      title: language === "en" ? "Template applied" : "Template aplicado",
      description: `${newSelected.length} ${language === "en" ? "exercises added" : "exercícios adicionados"}${missing.length ? ` (${missing.length} ${language === "en" ? "missing in library" : "ausentes na biblioteca"})` : ""}`,
    });
  };

  const applySavedTemplate = (tpl: SavedTemplate) => {
    const lib = exercises;
    const newSelected: SelectedExercise[] = [];
    const newCustom: CustomExercise[] = [];
    let missing = 0;
    (tpl.items || []).forEach((it) => {
      if (it.exerciseId) {
        const ex = lib.find((e) => e.id === it.exerciseId);
        if (!ex) { missing++; return; }
        if (selected.some((s) => s.exercise.id === ex.id)) return;
        const obsParts: string[] = [];
        if (it.stage) obsParts.push(`[${it.stage}]`);
        if (it.observations) obsParts.push(it.observations);
        newSelected.push({
          exercise: ex,
          sets: it.sets,
          reps: it.reps,
          frequency: it.frequency,
          observations: obsParts.join(" "),
        });
      } else if (it.customName) {
        newCustom.push({
          tempId: crypto.randomUUID(),
          name: it.customName,
          sets: it.sets,
          reps: it.reps,
          frequency: it.frequency,
          observations: it.observations || "",
          videoUrl: it.customVideoUrl || "",
        });
      }
    });
    setSelected([...selected, ...newSelected]);
    if (newCustom.length) setCustomExercises([...customExercises, ...newCustom]);
    if (tpl.notes) setNotes((prev) => (prev ? `${prev}\n\n${tpl.notes}` : tpl.notes!));
    toast({
      title: language === "en" ? "Template applied" : "Template aplicado",
      description: `${newSelected.length + newCustom.length} ${language === "en" ? "exercises added" : "exercícios adicionados"}${missing ? ` (${missing} ${language === "en" ? "missing" : "ausentes"})` : ""}`,
    });
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim() || totalCount === 0) return;
    setSavingTemplate(true);
    try {
      const items = [
        ...selected.map((s) => ({
          exerciseId: s.exercise.id,
          sets: s.sets,
          reps: s.reps,
          frequency: s.frequency,
          observations: s.observations || undefined,
        })),
        ...customExercises.filter((c) => c.name.trim()).map((c) => ({
          customName: c.name.trim(),
          customVideoUrl: c.videoUrl.trim() || undefined,
          sets: c.sets,
          reps: c.reps,
          frequency: c.frequency,
          observations: c.observations || undefined,
        })),
      ];
      const { data, error } = await (supabase as any)
        .from("hep_templates")
        .insert({
          professional_id: professionalId || null,
          clinic_id: clinicId || null,
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          notes: notes || null,
          body_region: selected[0]?.exercise.body_region || "general",
          items,
        })
        .select("id, name, description, notes, body_region, items, professional_id, clinic_id")
        .single();
      if (error) throw error;

      setSavedTemplates([data as SavedTemplate, ...savedTemplates]);
      setShowSaveTemplate(false);
      setTemplateName("");
      setTemplateDescription("");
      toast({ title: language === "en" ? "Template saved" : "Template salvo" });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro ao salvar template", description: err?.message, variant: "destructive" });
    } finally {
      setSavingTemplate(false);
    }
  };

  const deleteSavedTemplate = async (id: string, isSystem = false) => {
    const ok = window.confirm(
      isSystem
        ? (language === "en" ? "Delete this SYSTEM template for everyone?" : "Excluir este template PADRÃO do sistema para todos?")
        : (language === "en" ? "Delete this template?" : "Excluir este template?")
    );
    if (!ok) return;
    const { error } = await (supabase as any).from("hep_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    if (isSystem) setSystemTemplates(systemTemplates.filter((t) => t.id !== id));
    else setSavedTemplates(savedTemplates.filter((t) => t.id !== id));
    toast({ title: language === "en" ? "Template deleted" : "Template excluído" });
  };

  /** Admin-only: promote a personal/clinic template to a system-wide default (or revert it). */
  const toggleSystemTemplate = async (tpl: SavedTemplate, makeSystem: boolean) => {
    if (!isAdmin) return;
    setPromotingId(tpl.id);
    try {
      const patch = makeSystem
        ? { is_system: true, professional_id: null, clinic_id: null }
        : { is_system: false, professional_id: professionalId || null, clinic_id: null };
      const { data, error } = await (supabase as any)
        .from("hep_templates")
        .update(patch)
        .eq("id", tpl.id)
        .select("id, name, description, notes, body_region, items, professional_id, clinic_id, is_system")
        .single();
      if (error) throw error;
      const updated = data as SavedTemplate;
      if (makeSystem) {
        setSavedTemplates(savedTemplates.filter((t) => t.id !== tpl.id));
        setSystemTemplates([updated, ...systemTemplates]);
        toast({ title: language === "en" ? "Now a system template" : "Agora é template padrão do sistema" });
      } else {
        setSystemTemplates(systemTemplates.filter((t) => t.id !== tpl.id));
        setSavedTemplates([updated, ...savedTemplates]);
        toast({ title: language === "en" ? "Reverted to personal template" : "Voltou a ser template pessoal" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message, variant: "destructive" });
    } finally {
      setPromotingId(null);
    }
  };


  const handleCreate = async () => {
    if (totalCount === 0) return;
    if (demoMode) {
      setDemoDialogOpen(true);
      return;
    }
    setCreating(true);
    try {

      let programId: string;
      let programToken: string;

      if (isEditing && editProgramId) {
        // Update existing program
        programId = editProgramId;
        const { error: updateError } = await (supabase as any).from("exercise_programs").update({ notes: notes || null, domain }).eq("id", editProgramId);
        if (updateError) throw updateError;
        // Delete old items and re-insert
        const { error: deleteError } = await (supabase as any).from("exercise_program_items").delete().eq("program_id", editProgramId);
        if (deleteError) throw deleteError;
        // Get token
        const { data: prog, error: tokenError } = await (supabase as any).from("exercise_programs").select("token").eq("id", editProgramId).single();
        if (tokenError) throw tokenError;
        programToken = prog.token;
      } else {
        // Create new program
        const { data: program, error } = await (supabase as any)
          .from("exercise_programs")
          .insert({
            professional_id: professionalId,
            clinic_id: clinicId || null,
            assessment_id: assessmentId || null,
            patient_name: patientName,
            notes: notes || null,
            domain,
          })
          .select("id, token")
          .single();
        if (error) throw error;
        programId = program.id;
        programToken = program.token;
      }

      const items: any[] = [];
      let sortOrder = 0;

      const loadCols = (x: LoadFields) => ({
        load_kg: x.loadType === "kg" && x.loadKg ? Number(String(x.loadKg).replace(",", ".")) || null : null,
        load_type: x.loadType || null,
        body_region: x.region || null,
      });

      selected.forEach((s) => {
        items.push({
          program_id: programId,
          exercise_id: s.exercise.id,
          sets: s.sets,
          reps: s.reps,
          frequency: s.frequency,
          observations: s.observations || null,
          sort_order: sortOrder++,
          ...loadCols(s),
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
          ...loadCols(c),
        });
      });

      if (items.length > 0) {
        const { error: itemsError } = await (supabase as any)
          .from("exercise_program_items")
          .insert(items);
        if (itemsError) throw itemsError;
      }

      // Dose planejada automática no microciclo (próximos 7 dias)
      try {
        await syncPlannedDose(programId);
      } catch (err) {
        console.warn("[hep] planned dose sync failed", err);
      }

      const link = `${getPublicOrigin()}/hep/${programToken}`;
      setGeneratedLink(link);
      void draft.discard();

      // Notify the patient that a new HEP is available (push, resolved by email)
      if (!isEditing) {
        try {
          const { data: patientRow } = await (supabase as any)
            .from("patients")
            .select("email")
            .eq("professional_id", professionalId)
            .ilike("full_name", patientName)
            .maybeSingle();
          const email = patientRow?.email;
          if (email) {
            await supabase.functions.invoke("send-push-notification", {
              body: {
                email,
                title: "🏃 Novo programa de exercícios",
                body: "Seu fisioterapeuta enviou um novo HEP. Toque para iniciar.",
                url: link,
                tag: `hep-${programId}`,
                category: "questionnaires",
              },
            });
          }
        } catch (err) {
          console.warn("HEP push failed:", err);
        }
      }

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
    // HEP links expire in 3 months (the program is meant to be refreshed)
    await navigator.clipboard.writeText(shortHepLink ?? generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    if (!generatedLink) return;
    // No await here: iOS only opens its share sheet while the tap is active.
    // The short link is prepared as soon as the program is created; until it
    // is ready, the full program link is shared instead.
    const link = shortHepLink ?? generatedLink;
    const text = `Olá ${patientName}! Preparei seu programa de exercícios domiciliares. Acesse aqui: ${link}`;
    shareTextNowOrOpenWhatsApp(text, "Programa de exercícios");
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
        <DialogContent className="max-w-md h-auto max-h-[90vh] flex flex-col p-0 gap-0">
          <div className="px-4 sm:px-6 py-6">
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
            <div className="flex flex-col sm:flex-row gap-2">
              <Button onClick={handleWhatsApp} className="flex-1 gap-1.5 rounded-xl" variant="outline">
                <Share2 className="h-4 w-4" />
                Enviar via WhatsApp
              </Button>
              <Button onClick={handleClose} className="flex-1 rounded-xl">
                Fechar
              </Button>
            </div>
          </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>

      <DialogContent className="max-w-2xl h-[95vh] sm:h-[90vh] flex flex-col p-0 gap-0">
        <div className="px-4 sm:px-6 pt-6 pb-2 shrink-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 pr-8 sm:pr-10">
              <Dumbbell className="h-5 w-5 text-primary shrink-0" />
              <span className="min-w-0 truncate">{isEditing ? "Editar Programa de Exercícios" : "Criar Programa de Exercícios"}</span>
            </DialogTitle>
            <DialogDescription className="pr-8 sm:pr-10">
              Selecione exercícios do banco ou adicione manualmente para <span className="font-semibold break-words">{patientName}</span>
            </DialogDescription>
          </DialogHeader>
        </div>

        <div
          ref={scrollContainerRef}
          onDragOver={handleContainerDragOver}
          onDragLeave={(e) => {
            // stop if leaving the container entirely
            const rect = scrollContainerRef.current?.getBoundingClientRect();
            if (!rect) return;
            if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) {
              stopAutoScroll();
            }
          }}
          onDrop={stopAutoScroll}
          className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-4"
        >
          <div className="space-y-4 pt-2">
          {draft.hasDraft && draft.draftMeta && (
            <DraftResumeBanner
              updatedAt={draft.draftMeta.updatedAt}
              source={draft.draftMeta.source}
              onRestore={handleRestoreDraft}
              onDiscard={() => void draft.discard()}
            />
          )}
          {draft.lastSavedAt && !draft.hasDraft && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <CloudUpload className="h-3 w-3" />
              {draft.saving ? "Salvando rascunho..." : "Rascunho salvo"}
            </div>
          )}

          {/* HEP templates */}
          {!loading && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  {language === "en" ? "Reusable templates" : "Templates reutilizáveis"}
                </div>
                <div className="flex items-center gap-1">
                  {(savedTemplates.length > 0 || (isAdmin && systemTemplates.length > 0)) && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[11px]"
                      onClick={() => setShowManageTemplates((v) => !v)}
                    >
                      {showManageTemplates
                        ? (language === "en" ? "Done" : "Concluir")
                        : (language === "en" ? "Manage" : "Gerenciar")}
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] gap-1 bg-background"
                    onClick={() => setShowSaveTemplate((v) => !v)}
                    disabled={totalCount === 0}
                    title={totalCount === 0 ? (language === "en" ? "Add exercises first" : "Adicione exercícios primeiro") : ""}
                  >
                    <BookmarkPlus className="h-3 w-3" />
                    {language === "en" ? "Save as template" : "Salvar como template"}
                  </Button>
                </div>
              </div>

              {/* Built-in + system-wide (DB) templates */}
              {(HEP_TEMPLATES.length > 0 || systemTemplates.length > 0) && (
                <Select onValueChange={(id) => {
                  if (id.startsWith("sys:")) {
                    const sys = systemTemplates.find((t) => t.id === id.slice(4));
                    if (sys) applySavedTemplate(sys);
                    return;
                  }
                  const tpl = HEP_TEMPLATES.find((t) => t.id === id);
                  if (tpl) applyTemplate(tpl);
                }}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder={language === "en" ? "Apply a built-in template..." : "Aplicar um template padrão..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {HEP_TEMPLATES.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium">{language === "en" ? tpl.name_en : tpl.name_pt}</span>
                          <span className="text-[10px] text-muted-foreground">{tpl.items.length} {language === "en" ? "exercises" : "exercícios"}</span>
                        </div>
                      </SelectItem>
                    ))}
                    {systemTemplates.map((tpl) => (
                      <SelectItem key={tpl.id} value={`sys:${tpl.id}`} className="text-xs">
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium flex items-center gap-1.5">
                            {tpl.name}
                            <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-1">
                              <Globe className="h-2.5 w-2.5" />
                              {language === "en" ? "System" : "Sistema"}
                            </Badge>
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {(tpl.items?.length ?? 0)} {language === "en" ? "exercises" : "exercícios"}
                            {tpl.description ? ` · ${tpl.description}` : ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Saved (user) templates */}
              {savedTemplates.length > 0 && !showManageTemplates && (
                <Select onValueChange={(id) => {
                  const tpl = savedTemplates.find((t) => t.id === id);
                  if (tpl) applySavedTemplate(tpl);
                }}>
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue placeholder={language === "en" ? "Apply one of your templates..." : "Aplicar um dos seus templates..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {savedTemplates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                        <div className="flex flex-col py-0.5">
                          <span className="font-medium flex items-center gap-1.5">
                            {tpl.name}
                            {tpl.clinic_id && (
                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                                {language === "en" ? "Clinic" : "Clínica"}
                              </Badge>
                            )}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {(tpl.items?.length ?? 0)} {language === "en" ? "exercises" : "exercícios"}
                            {tpl.description ? ` · ${tpl.description}` : ""}
                          </span>
                        </div>
                      </SelectItem>
                    ))}

                  </SelectContent>
                </Select>
              )}

              {/* Manage templates (personal/clinic + system for admins) */}
              {showManageTemplates && (savedTemplates.length > 0 || (isAdmin && systemTemplates.length > 0)) && (
                <div className="space-y-1 max-h-[180px] overflow-y-auto bg-background rounded-md p-1.5 border border-border">
                  {savedTemplates.map((tpl) => (
                    <div key={tpl.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate flex items-center gap-1.5">
                          {tpl.name}
                          {tpl.clinic_id && (
                            <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">
                              {language === "en" ? "Clinic" : "Clínica"}
                            </Badge>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {(tpl.items?.length ?? 0)} {language === "en" ? "exercises" : "exercícios"}
                          {tpl.description ? ` · ${tpl.description}` : ""}
                        </p>
                      </div>
                      {isAdmin && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] gap-1 shrink-0 text-primary"
                          disabled={promotingId === tpl.id}
                          onClick={() => toggleSystemTemplate(tpl, true)}
                          title={language === "en" ? "Make it a system default" : "Tornar template padrão do sistema"}
                        >
                          {promotingId === tpl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Globe className="h-3 w-3" />}
                          {language === "en" ? "System" : "Padrão"}
                        </Button>
                      )}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive shrink-0"
                        onClick={() => deleteSavedTemplate(tpl.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}

                  {isAdmin && systemTemplates.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold text-muted-foreground px-2 pt-1">
                        {language === "en" ? "System templates (all users)" : "Templates padrão do sistema (todos os usuários)"}
                      </p>
                      {systemTemplates.map((tpl) => (
                        <div key={tpl.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-muted">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate flex items-center gap-1.5">
                              {tpl.name}
                              <Badge variant="secondary" className="h-4 px-1.5 text-[9px] gap-1">
                                <Globe className="h-2.5 w-2.5" />
                                {language === "en" ? "System" : "Sistema"}
                              </Badge>
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {(tpl.items?.length ?? 0)} {language === "en" ? "exercises" : "exercícios"}
                              {tpl.description ? ` · ${tpl.description}` : ""}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[10px] gap-1 shrink-0"
                            disabled={promotingId === tpl.id}
                            onClick={() => toggleSystemTemplate(tpl, false)}
                            title={language === "en" ? "Revert to personal template" : "Voltar a template pessoal"}
                          >
                            {promotingId === tpl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Undo2 className="h-3 w-3" />}
                            {language === "en" ? "Personal" : "Pessoal"}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive shrink-0"
                            onClick={() => deleteSavedTemplate(tpl.id, true)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}

              {/* Save form */}
              {showSaveTemplate && (
                <div className="space-y-2 bg-background rounded-md p-2.5 border border-border">
                  <Input
                    placeholder={language === "en" ? "Template name *" : "Nome do template *"}
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <Input
                    placeholder={language === "en" ? "Short description (optional)" : "Descrição curta (opcional)"}
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    {language === "en" ? "Saves the current selection" : "Salva a seleção atual"} ({totalCount})
                    {notes ? ` · ${language === "en" ? "incl. general notes" : "inclui observações gerais"}` : ""}
                  </p>
                  {clinicId && (
                    <p className="text-[10px] text-primary flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {language === "en"
                        ? "Shared with the whole clinic (owners, therapists & secretaries)."
                        : "Compartilhado com toda a clínica (proprietário, fisioterapeutas e secretárias)."}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-[11px] gap-1 flex-1"
                      onClick={saveAsTemplate}
                      disabled={!templateName.trim() || savingTemplate || totalCount === 0}
                    >
                      {savingTemplate ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      {language === "en" ? "Save template" : "Salvar template"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[11px]"
                      onClick={() => { setShowSaveTemplate(false); setTemplateName(""); setTemplateDescription(""); }}
                    >
                      {language === "en" ? "Cancel" : "Cancelar"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_130px_140px] gap-2 items-start">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercício..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full">
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
              <SelectTrigger className="w-full">
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
              {customExercises.map((c, idx) => (
                <Card
                  key={c.tempId}
                  data-drag-list="custom"
                  data-drag-idx={idx}
                  className={`overflow-hidden border-dashed transition-all ${dragCustomIdx === idx ? "opacity-50" : ""} ${overCustomIdx === idx && dragCustomIdx !== idx ? "ring-2 ring-primary" : ""}`}
                  draggable
                  onDragStart={(e) => { setDragCustomIdx(idx); e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overCustomIdx !== idx) setOverCustomIdx(idx); }}
                  onDragLeave={() => { if (overCustomIdx === idx) setOverCustomIdx(null); }}
                  onDrop={(e) => { e.preventDefault(); onCustomDrop(idx); }}
                  onDragEnd={() => { setDragCustomIdx(null); setOverCustomIdx(null); }}
                >
                  <CardContent className="py-2.5 px-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <GripVertical
                        className="h-5 w-5 text-muted-foreground/60 shrink-0 cursor-grab active:cursor-grabbing"
                        style={{ touchAction: "none" }}
                        onTouchStart={startTouchDrag("custom", idx)}
                      />
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Séries</Label>
                        <Input value={c.sets} onChange={(e) => updateCustom(c.tempId, "sets", e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Repetições ou tempo (ex.: 30s)</Label>
                        <Input value={c.reps} onChange={(e) => updateCustom(c.tempId, "reps", e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Frequência</Label>
                        <Input value={c.frequency} onChange={(e) => updateCustom(c.tempId, "frequency", e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    {renderLoadFields(c, (f, v) => updateCustom(c.tempId, f as keyof CustomExercise, v))}
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
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{selected.length} exercício(s) do banco selecionado(s)</p>
                {selected.length > 1 && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <GripVertical className="h-3 w-3" />
                    {language === "en" ? "Drag to reorder" : "Arraste para reordenar"}
                  </p>
                )}
              </div>
              {selected.map((s, idx) => (
                <Card
                  key={s.exercise.id}
                  data-drag-list="selected"
                  data-drag-idx={idx}
                  className={`overflow-hidden transition-all ${dragSelectedIdx === idx ? "opacity-50" : ""} ${overSelectedIdx === idx && dragSelectedIdx !== idx ? "ring-2 ring-primary" : ""}`}
                  draggable
                  onDragStart={(e) => { setDragSelectedIdx(idx); e.dataTransfer.effectAllowed = "move"; }}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; if (overSelectedIdx !== idx) setOverSelectedIdx(idx); }}
                  onDragLeave={() => { if (overSelectedIdx === idx) setOverSelectedIdx(null); }}
                  onDrop={(e) => { e.preventDefault(); onSelectedDrop(idx); }}
                  onDragEnd={() => { setDragSelectedIdx(null); setOverSelectedIdx(null); }}
                >
                  <CardContent className="py-2.5 px-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <GripVertical
                        className="h-5 w-5 text-muted-foreground/60 mt-0.5 shrink-0 cursor-grab active:cursor-grabbing"
                        style={{ touchAction: "none" }}
                        onTouchStart={startTouchDrag("selected", idx)}
                      />
                      <p className="text-sm font-medium text-foreground flex-1 min-w-0">{getName(s.exercise)}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10"
                        onClick={() => removeSelected(s.exercise.id)}
                        title={language === "en" ? "Remove exercise" : "Remover exercício"}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px]">Séries</Label>
                        <Input value={s.sets} onChange={(e) => updateSelected(s.exercise.id, "sets", e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Repetições ou tempo (ex.: 30s)</Label>
                        <Input value={s.reps} onChange={(e) => updateSelected(s.exercise.id, "reps", e.target.value)} className="h-8 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px]">Frequência</Label>
                        <Input value={s.frequency} onChange={(e) => updateSelected(s.exercise.id, "frequency", e.target.value)} className="h-8 text-xs" />
                      </div>
                    </div>
                    {renderLoadFields(s, (f, v) => updateSelected(s.exercise.id, f, v))}
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

          {totalCount > 0 && (
            <HepLoadPanel
              summary={loadSummary}
              regionLabel={(r) => regionLabels[r]?.[language] || regionLabels[r]?.pt || r}
              professionalId={professionalId}
              patientName={patientName}
              editProgramId={editProgramId}
            />
          )}

          {/* Domínio no microciclo */}
          <div className="space-y-1.5">
            <Label className="text-xs">{language === "en" ? "Session domain in the microcycle" : "Domínio da sessão no microciclo"}</Label>
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="physio">{language === "en" ? "Physiotherapy" : "Fisioterapia"}</SelectItem>
                <SelectItem value="gym">{language === "en" ? "Gym / strength" : "Academia / força"}</SelectItem>
                <SelectItem value="sport">{language === "en" ? "Other sport" : "Outro esporte"}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              {language === "en"
                ? "The planned dose sent to the microcycle will be classified with this domain."
                : "A dose planejada enviada ao microciclo será classificada com este domínio."}
            </p>
          </div>

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
            {creating ? (isEditing ? "Salvando..." : "Criando...") : (isEditing ? `Salvar Alterações (${totalCount})` : `Gerar Link do Programa (${totalCount})`)}
          </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

      {/* Demo upsell — intercepts the "Finalize" CTA in demo mode */}
      <Dialog open={demoDialogOpen} onOpenChange={setDemoDialogOpen}>
        <DialogContent className="max-w-md">

          <DialogHeader>
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {language === "pt" ? "Isto é uma demonstração" : language === "es" ? "Esto es una demostración" : "This is a demonstration"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {language === "pt"
                ? "No PRO real, este botão gera um link único para o paciente. Veja abaixo como uma série de exercícios fica montada no link entregue ao paciente."
                : language === "es"
                  ? "En el PRO real, este botón genera un enlace único para el paciente. Vea cómo queda armada una serie de ejercicios en el enlace entregado."
                  : "In real PRO, this button generates a unique link for the patient. See how an exercise series is presented in the link delivered to the patient."}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1.5 text-sm">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Dumbbell className="h-4 w-4 text-primary" />
              {language === "pt" ? "Exemplo: Programa de Ombro" : language === "es" ? "Ejemplo: Programa de Hombro" : "Example: Shoulder Program"}
            </p>
            <p className="text-xs text-muted-foreground">
              {language === "pt"
                ? "Progressão completa em 6 estágios: mobilidade → kettlebell bottom-up. Vídeos, séries e observações por exercício."
                : language === "es"
                  ? "Progresión completa en 6 etapas: movilidad → kettlebell bottom-up. Videos, series y observaciones por ejercicio."
                  : "Full 6-stage progression: mobility → kettlebell bottom-up. Videos, sets and notes per exercise."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDemoDialogOpen(false)} className="rounded-xl flex-1">
              {language === "pt" ? "Continuar explorando" : language === "es" ? "Seguir explorando" : "Keep exploring"}
            </Button>
            <Button
              onClick={() => { window.open("/hep/demo-shoulder", "_blank"); }}
              className="rounded-xl gap-1.5 flex-1"
            >
              <Link2 className="h-4 w-4" />
              {language === "pt" ? "Ver exemplo (Ombro)" : language === "es" ? "Ver ejemplo (Hombro)" : "View example (Shoulder)"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>

  );



};

const CreateExerciseProgramModal = (props: Props) => {
  const gated = props.open && !props.demoMode && !props.clinicId;
  const pending = useRegistrationPending(gated);
  if (gated && pending === null) return null;
  if (gated && pending) {
    return <RegistrationRequiredDialog open onOpenChange={props.onOpenChange} feature="A prescrição de exercícios" />;
  }
  return <CreateExerciseProgramModalInner {...props} />;
};

export default CreateExerciseProgramModal;
