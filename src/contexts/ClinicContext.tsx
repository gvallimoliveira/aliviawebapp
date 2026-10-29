import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";
import { clinicTrialTiming } from "@/lib/clinicTrial";

type ClinicRole = Database["public"]["Enums"]["clinic_role"];

export type ActiveContextType = "personal" | "professional" | "professional_demo" | "clinic";

interface ClinicMembership {
  clinic_id: string;
  clinic_name: string;
  role: ClinicRole;
  subscription_status: string;
  max_members: number;
  created_at: string;
  trial_started_at: string | null;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  operating_hours_start: string | null;
  operating_hours_end: string | null;
  saturday_hours_start: string | null;
  saturday_hours_end: string | null;
  working_days: number[] | null;
  rooms_count: number | null;
  brand_color: string | null;

}

interface ClinicContextType {
  memberships: ClinicMembership[];
  activeClinic: ClinicMembership | null;
  setActiveClinicId: (id: string | null) => void;
  isClinicMode: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
  needsContextSelection: boolean;
  dismissContextSelection: () => void;
  // New: unified context selector
  hasProfessionalProfile: boolean;
  setHasProfessionalProfile: (v: boolean) => void;
  // True when the professional profile is in Alivia Acadêmico (student) mode.
  // Drives label/icon swap in ContextSelectionModal & ClinicContextSelector.
  isStudentProfessional: boolean;
  setIsStudentProfessional: (v: boolean) => void;
  activeContext: ActiveContextType;
  setActiveContext: (type: ActiveContextType, clinicId?: string | null) => void;
  availableContextsCount: number;
  // Convenience role helpers (derived from activeClinic.role)
  isClinicOwner: boolean;
  isClinicSecretary: boolean;
  isClinicTherapist: boolean;
  canManageClinic: boolean;
  // Pro demo: clinic therapist without own PRO profile can preview the autonomous mode
  canAccessProDemo: boolean;
  // Set by Dashboard when the user came from the professional landing but
  // hasn't filled the professional registration yet. Surfaces an extra
  // "Cadastrar como profissional" option in the context selection modal.
  pendingProfessionalSignup: boolean;
  setPendingProfessionalSignup: (v: boolean) => void;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

// Storage keys are scoped per-user to prevent context bleed between
// different accounts that log in on the same device. The legacy global
// keys are migrated/cleaned on first load to avoid a previous user's
// "personal" preference silently hiding the clinic profile selector for
// a new clinic member that just signed in (e.g. a therapist invited by
// the clinic owner).
const LEGACY_STORAGE_CTX_TYPE = "activeContextType";
const LEGACY_STORAGE_CLINIC_ID = "activeClinicId";
const ctxTypeKey = (userId: string) => `activeContextType:${userId}`;
const clinicIdKey = (userId: string) => `activeClinicId:${userId}`;

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<ClinicMembership[]>([]);
  const [activeClinicId, setActiveClinicIdState] = useState<string | null>(null);
  const [activeContext, setActiveContextState] = useState<ActiveContextType>("personal");
  const [hasProfessionalProfile, setHasProfessionalProfileState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contextDismissed, setContextDismissed] = useState(false);
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false);
  const [pendingProfessionalSignup, setPendingProfessionalSignup] = useState(false);
  const [isStudentProfessional, setIsStudentProfessional] = useState(false);

  const fetchMemberships = useCallback(async () => {
    if (!user) { setMemberships([]); setLoading(false); return; }

    // One-time migration: drop legacy unscoped keys so they cannot leak
    // a previous user's preference into this session.
    try {
      localStorage.removeItem(LEGACY_STORAGE_CTX_TYPE);
      localStorage.removeItem(LEGACY_STORAGE_CLINIC_ID);
    } catch { /* noop */ }

    try {
      // Server validates the exclusive owner + clinic; ordinary accounts are a no-op.
      const { error: renewalError } = await supabase.rpc("renew_my_admin_clinic_trial");
      if (renewalError) console.error("Clinic trial renewal failed", renewalError.code);
      const { data: members } = await supabase
        .from("clinic_members")
        .select("clinic_id, role, clinics(name, subscription_status, max_members, created_at, trial_started_at, logo_url, phone, address, operating_hours_start, operating_hours_end, saturday_hours_start, saturday_hours_end, working_days, rooms_count, brand_color)")
        .eq("user_id", user.id)
        .eq("status", "active");

      const mapped: ClinicMembership[] = (members || []).map((m: any) => ({
        clinic_id: m.clinic_id,
        clinic_name: m.clinics?.name || "",
        role: m.role,
        subscription_status: m.clinics?.subscription_status || "inactive",
        max_members: m.clinics?.max_members || 3,
        created_at: m.clinics?.created_at || new Date().toISOString(),
        trial_started_at: m.clinics?.trial_started_at || null,
        logo_url: m.clinics?.logo_url || null,
        phone: m.clinics?.phone || null,
        address: m.clinics?.address || null,
        operating_hours_start: m.clinics?.operating_hours_start || null,
        operating_hours_end: m.clinics?.operating_hours_end || null,
        saturday_hours_start: m.clinics?.saturday_hours_start || null,
        saturday_hours_end: m.clinics?.saturday_hours_end || null,
        working_days: m.clinics?.working_days || null,
        rooms_count: m.clinics?.rooms_count ?? null,
        brand_color: m.clinics?.brand_color || null,
      }));
      setMemberships(mapped);

      // Restore persisted context (per-user)
      const storedType = localStorage.getItem(ctxTypeKey(user.id)) as ActiveContextType | null;
      const storedClinic = localStorage.getItem(clinicIdKey(user.id));

      if (storedType === "clinic" && storedClinic && mapped.some((m) => m.clinic_id === storedClinic)) {
        setActiveContextState("clinic");
        setActiveClinicIdState(storedClinic);
        setHasRestoredFromStorage(true);
      } else if (storedType === "professional") {
        setActiveContextState("professional");
        setActiveClinicIdState(null);
        setHasRestoredFromStorage(true);
      } else if (storedType === "professional_demo") {
        // Terapeuta de clínica sem PRO próprio que escolheu o demo:
        // restaura a escolha para não reabrir o seletor a cada login.
        setActiveContextState("professional_demo");
        setActiveClinicIdState(null);
        setHasRestoredFromStorage(true);
      } else if (storedType === "personal") {
        setActiveContextState("personal");
        setActiveClinicIdState(null);
        setHasRestoredFromStorage(true);
      } else {
        // Sem escolha explícita ainda: mantém "personal" e deixa o
        // ContextSelectionModal aparecer quando houver 2+ contextos.
        // Isto evita que telas abertas antes da escolha mostrem dados
        // da clínica errada (quando há múltiplas memberships).
        setActiveContextState("personal");
        setActiveClinicIdState(null);
        setHasRestoredFromStorage(false);
      }
    } catch {
      setMemberships([]);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    setContextDismissed(false);
    setHasRestoredFromStorage(false);
  }, [user?.id]);

  useEffect(() => { fetchMemberships(); }, [fetchMemberships]);

  const activeClinic = memberships.find((m) => m.clinic_id === activeClinicId) || null;

  useEffect(() => {
    if (activeClinic?.subscription_status !== "trialing") return;
    const { expiresAt } = clinicTrialTiming(activeClinic.trial_started_at || activeClinic.created_at);
    if (expiresAt <= Date.now()) return;
    const timer = window.setTimeout(() => { void fetchMemberships(); }, expiresAt - Date.now() + 100);
    const refreshOnReturn = () => {
      if (document.visibilityState === "visible" && Date.now() >= expiresAt) void fetchMemberships();
    };
    document.addEventListener("visibilitychange", refreshOnReturn);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", refreshOnReturn);
    };
  }, [activeClinic, fetchMemberships]);

  // A clinic therapist (member of at least one clinic) WITHOUT their own
  // PRO profile can preview the autonomous-professional dashboard in demo
  // mode. This drives a conversion CTA to subscribe to PRO.
  const canAccessProDemo = !hasProfessionalProfile && memberships.length > 0;

  // total contexts = personal (always) + professional (real OR demo OR pending signup) + each clinic
  const availableContextsCount = useMemo(
    () => 1 + (hasProfessionalProfile || canAccessProDemo || pendingProfessionalSignup ? 1 : 0) + memberships.length,
    [hasProfessionalProfile, canAccessProDemo, pendingProfessionalSignup, memberships.length]
  );

  // Auto-pick when only one possible context exists (just personal) — no need to show modal
  // Show modal if 2+ contexts and user hasn't chosen yet
  const needsContextSelection =
    !loading
    && (availableContextsCount >= 2 || pendingProfessionalSignup)
    && !hasRestoredFromStorage
    && !contextDismissed;

  const dismissContextSelection = () => setContextDismissed(true);

  const setActiveContext = (type: ActiveContextType, clinicId: string | null = null) => {
    setActiveContextState(type);
    const uid = user?.id;
    if (type === "clinic" && clinicId) {
      setActiveClinicIdState(clinicId);
      if (uid) {
        localStorage.setItem(ctxTypeKey(uid), "clinic");
        localStorage.setItem(clinicIdKey(uid), clinicId);
      }
    } else {
      setActiveClinicIdState(null);
      if (uid) {
        localStorage.setItem(ctxTypeKey(uid), type);
        localStorage.removeItem(clinicIdKey(uid));
      }
    }
    setContextDismissed(true);
    setHasRestoredFromStorage(true);
  };

  // Backward-compat: setActiveClinicId(null) -> personal, setActiveClinicId(uuid) -> clinic
  const setActiveClinicId = (id: string | null) => {
    if (id) setActiveContext("clinic", id);
    else setActiveContext("personal");
  };

  const setHasProfessionalProfile = (v: boolean) => setHasProfessionalProfileState(v);

  const role = activeClinic?.role ?? null;
  const isClinicOwner = role === "owner" || role === "admin";
  const isClinicSecretary = role === "secretary";
  const isClinicTherapist = role === "therapist";
  const canManageClinic = role === "owner" || role === "admin" || role === "secretary";

  return (
    <ClinicContext.Provider
      value={{
        memberships,
        activeClinic,
        setActiveClinicId,
        isClinicMode: activeContext === "clinic" && !!activeClinic,
        loading,
        refetch: fetchMemberships,
        needsContextSelection,
        dismissContextSelection,
        hasProfessionalProfile,
        setHasProfessionalProfile,
        activeContext,
        setActiveContext,
        availableContextsCount,
        isClinicOwner,
        isClinicSecretary,
        isClinicTherapist,
        canManageClinic,
        canAccessProDemo,
        pendingProfessionalSignup,
        setPendingProfessionalSignup,
        isStudentProfessional,
        setIsStudentProfessional,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};

export const useClinic = () => {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic must be used within ClinicProvider");
  return ctx;
};
