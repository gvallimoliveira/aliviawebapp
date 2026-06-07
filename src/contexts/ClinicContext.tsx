import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type ClinicRole = Database["public"]["Enums"]["clinic_role"];

export type ActiveContextType = "personal" | "professional" | "professional_demo" | "clinic";

interface ClinicMembership {
  clinic_id: string;
  clinic_name: string;
  role: ClinicRole;
  subscription_status: string;
  max_members: number;
  created_at: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  operating_hours_start: string | null;
  operating_hours_end: string | null;
  saturday_hours_start: string | null;
  saturday_hours_end: string | null;
  working_days: number[] | null;
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

  const fetchMemberships = useCallback(async () => {
    if (!user) { setMemberships([]); setLoading(false); return; }

    // One-time migration: drop legacy unscoped keys so they cannot leak
    // a previous user's preference into this session.
    try {
      localStorage.removeItem(LEGACY_STORAGE_CTX_TYPE);
      localStorage.removeItem(LEGACY_STORAGE_CLINIC_ID);
    } catch { /* noop */ }

    try {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("clinic_id, role, clinics(name, subscription_status, max_members, created_at, logo_url, phone, address, operating_hours_start, operating_hours_end, saturday_hours_start, saturday_hours_end, working_days, brand_color)")
        .eq("user_id", user.id)
        .eq("status", "active");

      const mapped: ClinicMembership[] = (members || []).map((m: any) => ({
        clinic_id: m.clinic_id,
        clinic_name: m.clinics?.name || "",
        role: m.role,
        subscription_status: m.clinics?.subscription_status || "inactive",
        max_members: m.clinics?.max_members || 3,
        created_at: m.clinics?.created_at || new Date().toISOString(),
        logo_url: m.clinics?.logo_url || null,
        phone: m.clinics?.phone || null,
        address: m.clinics?.address || null,
        operating_hours_start: m.clinics?.operating_hours_start || null,
        operating_hours_end: m.clinics?.operating_hours_end || null,
        saturday_hours_start: m.clinics?.saturday_hours_start || null,
        saturday_hours_end: m.clinics?.saturday_hours_end || null,
        working_days: m.clinics?.working_days || null,
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
      } else if (storedType === "personal") {
        setActiveContextState("personal");
        setActiveClinicIdState(null);
        setHasRestoredFromStorage(true);
      } else if (mapped.length > 0) {
        // No explicit choice yet but the user belongs to one or more
        // clinics: pre-select the first clinic so the dashboard opens
        // in the most relevant context (the reason they were invited
        // in the first place). The selection modal will still appear
        // when there are 2+ contexts so the user can switch.
        const first = mapped[0];
        setActiveContextState("clinic");
        setActiveClinicIdState(first.clinic_id);
        setHasRestoredFromStorage(false);
      } else {
        setActiveContextState("personal");
        setActiveClinicIdState(null);
        setHasRestoredFromStorage(false);
      }
    } catch {
      setMemberships([]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    setContextDismissed(false);
    setHasRestoredFromStorage(false);
  }, [user?.id]);

  useEffect(() => { fetchMemberships(); }, [fetchMemberships]);

  const activeClinic = memberships.find((m) => m.clinic_id === activeClinicId) || null;

  // A clinic therapist (member of at least one clinic) WITHOUT their own
  // PRO profile can preview the autonomous-professional dashboard in demo
  // mode. This drives a conversion CTA to subscribe to PRO.
  const canAccessProDemo = !hasProfessionalProfile && memberships.length > 0;

  // total contexts = personal (always) + professional (real OR demo) + each clinic
  const availableContextsCount = useMemo(
    () => 1 + (hasProfessionalProfile || canAccessProDemo ? 1 : 0) + memberships.length,
    [hasProfessionalProfile, canAccessProDemo, memberships.length]
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
