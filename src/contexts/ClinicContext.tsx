import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type ClinicRole = Database["public"]["Enums"]["clinic_role"];

export type ActiveContextType = "personal" | "professional" | "clinic";

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
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

const STORAGE_CTX_TYPE = "activeContextType";
const STORAGE_CLINIC_ID = "activeClinicId";

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<ClinicMembership[]>([]);
  const [activeClinicId, setActiveClinicIdState] = useState<string | null>(null);
  const [activeContext, setActiveContextState] = useState<ActiveContextType>("personal");
  const [hasProfessionalProfile, setHasProfessionalProfileState] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contextDismissed, setContextDismissed] = useState(false);
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false);

  const fetchMemberships = useCallback(async () => {
    if (!user) { setMemberships([]); setLoading(false); return; }
    try {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("clinic_id, role, clinics(name, subscription_status, max_members, created_at, logo_url, phone, address, operating_hours_start, operating_hours_end, working_days, brand_color)")
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
        working_days: m.clinics?.working_days || null,
        brand_color: m.clinics?.brand_color || null,
      }));
      setMemberships(mapped);

      // Restore persisted context
      const storedType = localStorage.getItem(STORAGE_CTX_TYPE) as ActiveContextType | null;
      const storedClinic = localStorage.getItem(STORAGE_CLINIC_ID);

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
      } else if (storedClinic && mapped.some((m) => m.clinic_id === storedClinic)) {
        // Legacy: only clinic id stored
        setActiveContextState("clinic");
        setActiveClinicIdState(storedClinic);
        setHasRestoredFromStorage(true);
      } else {
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

  // total contexts = personal (always) + professional (if profile) + each clinic
  const availableContextsCount = useMemo(
    () => 1 + (hasProfessionalProfile ? 1 : 0) + memberships.length,
    [hasProfessionalProfile, memberships.length]
  );

  // Auto-pick when only one possible context exists (just personal) — no need to show modal
  // Show modal if 2+ contexts and user hasn't chosen yet
  const needsContextSelection =
    !loading && availableContextsCount >= 2 && !hasRestoredFromStorage && !contextDismissed;

  const dismissContextSelection = () => setContextDismissed(true);

  const setActiveContext = (type: ActiveContextType, clinicId: string | null = null) => {
    setActiveContextState(type);
    if (type === "clinic" && clinicId) {
      setActiveClinicIdState(clinicId);
      localStorage.setItem(STORAGE_CTX_TYPE, "clinic");
      localStorage.setItem(STORAGE_CLINIC_ID, clinicId);
    } else {
      setActiveClinicIdState(null);
      localStorage.setItem(STORAGE_CTX_TYPE, type);
      localStorage.removeItem(STORAGE_CLINIC_ID);
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
