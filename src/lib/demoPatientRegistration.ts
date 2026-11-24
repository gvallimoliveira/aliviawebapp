import { useSyncExternalStore } from "react";

export interface DemoPatientRow {
  id: string;
  full_name: string;
  email?: string | null;
  cpf?: string | null;
  birth_date?: string | null;
  phone?: string | null;
  address?: string | null;
  sex?: string | null;
  occupation?: string | null;
  prescribed_weekly_frequency?: number | null;
  referral_source?: string | null;
  assessmentIds?: string[];
  created_at: string;
  sourceKey?: string;
}

const empty: DemoPatientRow[] = [];
const rowsByScope = new Map<string, DemoPatientRow[]>();
const listeners = new Set<() => void>();

// In memory only: no clinical data, tokens or demo drafts survive a page reload.
export function demoPatientScope(userId: string | undefined, professionalId?: string | null, clinicId?: string | null) {
  return JSON.stringify([userId || "anonymous", clinicId ? "clinic" : "solo", clinicId || professionalId || "demo"]);
}

export function getDemoPatientRows(scope: string) {
  return rowsByScope.get(scope) || empty;
}

export function saveDemoPatient(scope: string, values: Omit<DemoPatientRow, "id" | "created_at">, original?: { id: string; full_name: string; email?: string | null }) {
  const rows = getDemoPatientRows(scope);
  const previous = original?.id ? rows.find((row) => row.id === original.id) : undefined;
  const row: DemoPatientRow = {
    ...values,
    id: original?.id || crypto.randomUUID(),
    created_at: previous?.created_at || new Date().toISOString(),
    sourceKey: previous ? previous.sourceKey || `demo:${previous.id}` : original ? original.email || original.full_name : undefined,
  };
  rowsByScope.set(scope, [...rows.filter((item) => item.id !== row.id), row]);
  listeners.forEach((listener) => listener());
  return row;
}

export function useDemoPatientRows(scope: string, enabled: boolean) {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => enabled ? getDemoPatientRows(scope) : empty,
    () => empty,
  );
}

export function removeDemoPatient(scope: string, id: string) {
  rowsByScope.set(scope, getDemoPatientRows(scope).filter((row) => row.id !== id));
  listeners.forEach((listener) => listener());
}