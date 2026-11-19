import { lazy, Suspense, useEffect, useState } from "react";
import { Gauge, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { fetchLoadMonitoring, setLoadMonitoring, type LoadMonitoringScope } from "@/lib/loadMonitoringData";

const PeriodizationSection = lazy(() => import("./PeriodizationSection"));
type Props = LoadMonitoringScope & {
  assessments?: any[];
  latestAssessmentId?: string | null;
  readOnly?: boolean;
  isDemo?: boolean;
};

export default function LoadMonitoringGate(props: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [state, setState] = useState<{ patientId: string | null; enabled: boolean; canManage: boolean } | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retry, setRetry] = useState(0);
  const { patientId, patientName, patientEmail, professionalId, clinicId, isDemo } = props;

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setFailed(false);
    if (isDemo) {
      setState({ patientId: null, enabled: false, canManage: true });
      return;
    }
    fetchLoadMonitoring({ patientId, patientName, patientEmail, professionalId, clinicId })
      .then((next) => { if (!cancelled) setState(next); })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [patientId, patientName, patientEmail, professionalId, clinicId, isDemo, retry]);

  const change = async (enabled: boolean) => {
    if (!state || saving || props.readOnly || !state.canManage) return;
    setSaving(true);
    try {
      const id = isDemo ? null : await setLoadMonitoring({ patientId: state.patientId, patientName, patientEmail, professionalId, clinicId }, enabled);
      setState({ ...state, patientId: id, enabled });
      toast({ title: t(enabled ? "load_opt_in.activated" : "load_opt_in.deactivated") });
    } catch {
      toast({ title: t("load_opt_in.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="sec-periodizacao" className="scroll-mt-24 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Gauge className="h-4 w-4 shrink-0 text-primary" />
          {t("load_opt_in.title")}
        </h4>
        {failed ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setRetry((v) => v + 1)}>
            <RefreshCw className="h-4 w-4 mr-2" />{t("load_opt_in.retry")}
          </Button>
        ) : !state ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t("load_opt_in.loading")} />
        ) : !props.readOnly && state.canManage ? (
          state.enabled ? (
            <div className="flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              <label htmlFor="patient-load-opt-in" className="text-xs text-muted-foreground">{t("load_opt_in.active")}</label>
              <Switch id="patient-load-opt-in" checked={state.enabled} disabled={saving} onCheckedChange={change} aria-label={t("load_opt_in.title")} />
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => change(true)} className="max-w-full h-auto min-h-9 whitespace-normal text-left">
              {saving && <Loader2 className="h-4 w-4 mr-2 shrink-0 animate-spin" />}
              {t("load_opt_in.activate")}
            </Button>
          )
        ) : <span className="text-xs text-muted-foreground">{t(state.enabled ? "load_opt_in.active" : "load_opt_in.inactive")}</span>}
      </div>
      {failed && <p role="alert" className="text-xs text-destructive">{t("load_opt_in.error")}</p>}
      {state?.enabled && (
        <Suspense fallback={<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}>
          <PeriodizationSection {...props} patientId={state.patientId} readOnly={props.readOnly || !state.canManage} />
        </Suspense>
      )}
    </div>
  );
}