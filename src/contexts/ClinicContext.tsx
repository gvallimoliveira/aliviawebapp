import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Database } from "@/integrations/supabase/types";

type ClinicRole = Database["public"]["Enums"]["clinic_role"];

interface ClinicMembership {
  clinic_id: string;
  clinic_name: string;
  role: ClinicRole;
  subscription_status: string;
  max_members: number;
  created_at: string;
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
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [memberships, setMemberships] = useState<ClinicMembership[]>([]);
  const [activeClinicId, setActiveClinicId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [contextDismissed, setContextDismissed] = useState(false);
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState(false);

  const fetchMemberships = useCallback(async () => {
    if (!user) { setMemberships([]); setLoading(false); return; }
    try {
      const { data: members } = await supabase
        .from("clinic_members")
        .select("clinic_id, role, clinics(name, subscription_status, max_members, created_at)")
        .eq("user_id", user.id)
        .eq("status", "active");

      const mapped: ClinicMembership[] = (members || []).map((m: any) => ({
        clinic_id: m.clinic_id,
        clinic_name: m.clinics?.name || "",
        role: m.role,
        subscription_status: m.clinics?.subscription_status || "inactive",
        max_members: m.clinics?.max_members || 3,
        created_at: m.clinics?.created_at || new Date().toISOString(),
      }));
      setMemberships(mapped);

      // Restore persisted clinic or auto-select if only one
      const stored = localStorage.getItem("activeClinicId");
      if (stored && mapped.some((m) => m.clinic_id === stored)) {
        setActiveClinicId(stored);
        setHasRestoredFromStorage(true);
      } else if (mapped.length === 1) {
        // Only one clinic and no stored preference — show selector
        setHasRestoredFromStorage(false);
      } else {
        setHasRestoredFromStorage(false);
      }
    } catch {
      setMemberships([]);
    }
    setLoading(false);
  }, [user]);

  // Reset dismissed state on user change (new login)
  useEffect(() => {
    setContextDismissed(false);
    setHasRestoredFromStorage(false);
  }, [user?.id]);

  useEffect(() => { fetchMemberships(); }, [fetchMemberships]);


  const activeClinic = memberships.find((m) => m.clinic_id === activeClinicId) || null;

  // Show context selection when user has clinics, hasn't chosen yet, and hasn't dismissed
  const needsContextSelection = !loading && memberships.length > 0 && !hasRestoredFromStorage && !contextDismissed;

  const dismissContextSelection = () => setContextDismissed(true);

  const handleSetClinicId = (id: string | null) => {
    setActiveClinicId(id);
    setContextDismissed(true);
    setHasRestoredFromStorage(true);
    if (id) localStorage.setItem("activeClinicId", id);
    else localStorage.removeItem("activeClinicId");
  };

  return (
    <ClinicContext.Provider
      value={{
        memberships,
        activeClinic,
        setActiveClinicId: handleSetClinicId,
        isClinicMode: !!activeClinic,
        loading,
        refetch: fetchMemberships,
        needsContextSelection,
        dismissContextSelection,
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
