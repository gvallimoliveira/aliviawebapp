import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  groupAssessmentsByCondition,
  PainCondition,
  PainConditionAssessment,
} from "@/lib/painConditions";

const STORAGE_KEY = "alivia_focus_condition";

/**
 * Agrupa as avaliações do usuário em condições clínicas e mantém a
 * "condição em foco" persistida entre sessões.
 */
export const usePainConditions = (assessments: PainConditionAssessment[]) => {
  const { language } = useLanguage() as any;
  const lang = (["pt", "en", "es"].includes(language) ? language : "pt") as "pt" | "en" | "es";

  const conditions = useMemo<PainCondition[]>(
    () => groupAssessmentsByCondition(assessments || [], lang),
    [assessments, lang],
  );

  const [focusKey, setFocusKey] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  // Garante que a condição em foco existe; senão usa a mais recente.
  useEffect(() => {
    if (conditions.length === 0) return;
    if (!focusKey || !conditions.some((c) => c.key === focusKey)) {
      setFocusKey(conditions[0].key);
    }
  }, [conditions, focusKey]);

  const selectCondition = (key: string) => {
    setFocusKey(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* ignore */
    }
  };

  const activeCondition =
    conditions.find((c) => c.key === focusKey) || conditions[0] || null;

  return {
    conditions,
    activeCondition,
    focusKey: activeCondition?.key ?? null,
    selectCondition,
    hasMultiple: conditions.length > 1,
  };
};

export default usePainConditions;
