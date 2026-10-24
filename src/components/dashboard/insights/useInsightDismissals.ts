import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Per-user, per-scope dismissals for insight lists.
 * Dismissed patients stay hidden for the current viewer; when `teamWide` is
 * set (clinic owner/admin), the dismissal hides the item for the whole team.
 * restoreAll() clears every dismissal the viewer is allowed to delete.
 */
export function useInsightDismissals(insightKey: string, scopeKey?: string, teamWide = false) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    setDismissed(new Set());
    if (!scopeKey) return;
    (async () => {
      const { data } = await supabase
        .from("insight_dismissals")
        .select("patient_key")
        .eq("insight_key", insightKey)
        .eq("scope_key", scopeKey);
      if (!cancelled && Array.isArray(data)) {
        setDismissed(new Set(data.map((d) => d.patient_key)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [insightKey, scopeKey]);

  const dismiss = useCallback(
    async (patientKey: string) => {
      if (!scopeKey) return;
      setDismissed((prev) => new Set(prev).add(patientKey));
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("insight_dismissals").upsert(
        {
          user_id: user.id,
          insight_key: insightKey,
          scope_key: scopeKey,
          patient_key: patientKey,
          scope_wide: teamWide,
        },
        { onConflict: "user_id,insight_key,scope_key,patient_key" },
      );
    },
    [insightKey, scopeKey, teamWide],
  );

  const restoreAll = useCallback(async () => {
    if (!scopeKey) return;
    setDismissed(new Set());
    await supabase
      .from("insight_dismissals")
      .delete()
      .eq("insight_key", insightKey)
      .eq("scope_key", scopeKey);
  }, [insightKey, scopeKey]);

  return { dismissed, dismiss, restoreAll };
}
