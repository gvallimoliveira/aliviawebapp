import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addDays, synthesizeNoteSessions, type MgmtAppt, type MgmtNote, type MgmtPatient, type MgmtService } from "@/lib/managementMetrics";
import { localISODate } from "@/lib/periodization";

export interface ManagementData {
  loading: boolean;
  today: string;
  price: number;
  appts: MgmtAppt[];
  notes: MgmtNote[];
  patients: MgmtPatient[];
  /** Service catalog of the scope (clinic or solo PRO). */
  services: MgmtService[];
  dischargedKeys: Set<string>;
  names: Record<string, string>;
  therapists: number;
  hours: { start: string | null; end: string | null; workingDays: number[] | null };
  /** Clinic owner's professional profile id (null in solo PRO or when unresolved). */
  ownerProfessionalId: string | null;
  /** Rooms/boxes configured for the clinic; null when not set (solo PRO counts as 1 chair). */
  rooms: number | null;
}

const PAGE = 1000;
async function fetchAll(build: (from: number, to: number) => any, max = 10000) {
  const out: any[] = [];
  for (let i = 0; i < max; i += PAGE) {
    const { data, error } = await build(i, i + PAGE - 1);
    if (error || !data) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

/** Loads the scoped raw data (clinic or solo PRO) once per Insights visit; metrics are computed locally. */
export function useManagementData(clinicId?: string, professionalId?: string): ManagementData {
  const today = localISODate();
  const [state, setState] = useState<ManagementData>({
    loading: true, today, price: 0, appts: [], notes: [], patients: [], services: [], dischargedKeys: new Set(), names: {}, therapists: 1,
    hours: { start: null, end: null, workingDays: null }, ownerProfessionalId: null, rooms: null,
  });

  useEffect(() => {
    if (!clinicId && !professionalId) return;
    let cancelled = false;
    const from = addDays(today, -365);
    const until = addDays(today, 90);
    const scope = (q: any) => (clinicId ? q.eq("clinic_id", clinicId) : q.is("clinic_id", null).eq("professional_id", professionalId));
    (async () => {
      const sb = supabase as any;
      const [rawAppts, notes, plans, cfg, patients, services] = await Promise.all([
        fetchAll((a, b) => scope(sb.from("professional_appointments")
          .select("id, appointment_date, appointment_time, status, status_changed_at, duration_minutes, service_type, service_id, professional_id, patient_email, patient_name")
          .gte("appointment_date", from).lte("appointment_date", until)).order("appointment_date").range(a, b)),
        fetchAll((a, b) => scope(sb.from("session_notes")
          .select("appointment_id, patient_email, session_date, created_at")
          .gte("created_at", addDays(today, -200))).order("created_at").range(a, b)),
        fetchAll((a, b) => scope(sb.from("periodization_plans").select("patient_id, status").eq("status", "completed")).range(a, b)),
        clinicId
          ? sb.from("clinics").select("default_session_price, operating_hours_start, operating_hours_end, working_days, owner_user_id, rooms_count").eq("id", clinicId).maybeSingle()
          : sb.from("professionals").select("default_session_price").eq("id", professionalId).maybeSingle(),
        fetchAll((a, b) => scope(sb.from("patients")
          .select("id, full_name, email, created_at, prescribed_weekly_frequency, referral_source")
          .eq("is_study_case", false)).order("created_at").range(a, b)),
        fetchAll((a, b) => scope(sb.from("care_services")
          .select("id, name, price, billing_type").eq("active", true)).range(a, b)),
      ]);
      // Evolution notes count as realized sessions when the agenda slot was never classified.
      const appts = synthesizeNoteSessions(rawAppts, notes);
      const patientIds = [...new Set(plans.map((p: any) => p.patient_id).filter(Boolean))];
      const discharged = new Set<string>();
      if (patientIds.length) {
        const { data: pts } = await sb.from("patients").select("id, email, full_name").in("id", patientIds.slice(0, 500));
        for (const p of pts || []) {
          const e = (p.email || "").trim().toLowerCase();
          if (e) discharged.add(e);
          else if (p.full_name) discharged.add(`name:${p.full_name.trim().toLowerCase()}`);
        }
      }
      const ids = [...new Set(appts.map((a: any) => a.professional_id).filter(Boolean))] as string[];
      const names: Record<string, string> = {};
      if (ids.length) {
        const { data } = await sb.rpc("get_professionals_basic_info", { _professional_ids: ids });
        for (const p of data || []) names[p.id] = p.full_name;
      }
      let therapists = 1;
      if (clinicId) {
        const { count } = await supabase.from("clinic_members").select("id", { count: "exact", head: true })
          .eq("clinic_id", clinicId).eq("status", "active").in("role", ["owner", "therapist"] as any);
        therapists = Math.max(1, count || 1);
      }
      let ownerProfessionalId: string | null = null;
      if (clinicId && cfg?.data?.owner_user_id) {
        const { data: own } = await sb.from("professionals").select("id").eq("user_id", cfg.data.owner_user_id).maybeSingle();
        ownerProfessionalId = own?.id ?? null;
      }
      if (cancelled) return;
      const c = cfg?.data || {};
      setState({
        loading: false, today, price: Number(c.default_session_price) || 0, appts, notes, patients,
        services: (services || []).map((s: any) => ({ id: s.id, name: s.name, price: Number(s.price) || 0, billing_type: s.billing_type === "monthly" ? "monthly" : "per_session" })),
        dischargedKeys: discharged, names, therapists,
        hours: { start: c.operating_hours_start ?? null, end: c.operating_hours_end ?? null, workingDays: c.working_days ?? null },
        ownerProfessionalId, rooms: clinicId ? (c.rooms_count ?? null) : null,
      });
    })();
    return () => { cancelled = true; };
  }, [clinicId, professionalId, today]);

  return state;
}
