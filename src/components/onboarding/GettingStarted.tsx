import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Copy, ListChecks, Loader2, RefreshCw, Search, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { fetchGettingStartedFacts, fetchGettingStartedPatients } from "@/lib/gettingStartedData";
import { gettingStartedDestination, gettingStartedKey, gettingStartedSteps, readGettingStartedPreferences, writeGettingStartedPreferences,
  type GettingStartedPreferences,
  type GettingStartedAction, type GettingStartedFacts, type GettingStartedScope } from "@/lib/gettingStarted";

type Props = GettingStartedScope & {
  clinical: boolean;
  canSchedule: boolean;
  hasAgent: boolean;
  registrationPending?: boolean;
  manager?: boolean;
  onNavigate?: (destination: string) => void;
};
const emptyFacts: GettingStartedFacts = { patients: null, assessments: null, notes: null, heps: null, loads: null, conversations: null, appointments: null };

export default function GettingStarted({ clinical, canSchedule, hasAgent, registrationPending, manager = false, onNavigate, ...scope }: Props) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const goTo = onNavigate ?? navigate;
  const key = gettingStartedKey(scope);
  const [preferences, setPreferences] = useState(() => readGettingStartedPreferences(key));
  const [picker, setPicker] = useState<GettingStartedAction | null>(null);
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [copying, setCopying] = useState(false);
  useEffect(() => {
    const update = () => setPreferences(readGettingStartedPreferences(key));
    const changed = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; preferences?: GettingStartedPreferences }>).detail;
      if (detail?.key === key) setPreferences(detail.preferences ?? readGettingStartedPreferences(key));
    };
    const stored = (event: StorageEvent) => { if (!event.key || event.key === key) update(); };
    update();
    window.addEventListener("alivia:first-steps-changed", changed);
    window.addEventListener("storage", stored);
    return () => {
      window.removeEventListener("alivia:first-steps-changed", changed);
      window.removeEventListener("storage", stored);
    };
  }, [key]);

  const factsQuery = useQuery({
    queryKey: ["first-steps", key, clinical, manager],
    queryFn: () => fetchGettingStartedFacts(scope, clinical, hasAgent, manager),
    enabled: !preferences.dismissed,
    staleTime: 15_000,
    refetchInterval: (query) => {
      const facts = query.state.data;
      return facts && gettingStartedSteps(facts, !!preferences.copiedLink, clinical, canSchedule, hasAgent, manager).every((step) => step.complete === true) ? false : 30_000;
    },
  });
  useEffect(() => {
    const refresh = () => { if (!preferences.dismissed) void factsQuery.refetch(); };
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("reload-pro-patients", refresh);
    window.addEventListener("alivia:first-steps-refresh", refresh);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("reload-pro-patients", refresh);
      window.removeEventListener("alivia:first-steps-refresh", refresh);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [key, preferences.dismissed, factsQuery.refetch]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(search), 200);
    return () => window.clearTimeout(timer);
  }, [search]);
  const patientsQuery = useQuery({
    queryKey: ["first-steps-patients", key, searchTerm],
    queryFn: () => fetchGettingStartedPatients(scope, searchTerm),
    enabled: !!picker,
    staleTime: 0,
  });

  const facts = factsQuery.data ?? emptyFacts;
  const steps = gettingStartedSteps(facts, !!preferences.copiedLink, clinical, canSchedule, hasAgent, manager);
  const completed = steps.filter((step) => step.complete === true).length;
  const unknown = steps.some((step) => step.complete === null);
  if (preferences.dismissed || (completed === steps.length && !preferences.review)) return null;

  const updatePreferences = (next: typeof preferences) => {
    setPreferences(next);
    writeGettingStartedPreferences(key, next);
  };
  const copyLink = async () => {
    if (registrationPending) { navigate("/professional/register"); return; }
    if (copying) return;
    setCopying(true);
    try {
      const path = scope.clinicId ? `clinic/${scope.clinicId}` : `professional/${scope.professionalId}`;
      await navigator.clipboard.writeText(`${getPublicOrigin()}/assessment/${path}`);
      updatePreferences({ ...preferences, copiedLink: true });
      toast({ title: t("referral.copied") });
    } catch {
      toast({ title: t("first_steps.copy_error"), variant: "destructive" });
    } finally { setCopying(false); }
  };
  const start = (action: GettingStartedAction) => {
    if (action === "hep" && registrationPending) { navigate("/professional/register"); return; }
    if (["patient", "appointment", "identity", "team", "services"].includes(action)) {
      goTo(gettingStartedDestination(scope.clinicId, action));
    } else {
      setSearch("");
      setSearchTerm("");
      setPicker(action);
    }
  };
  const hasPatient = (facts.patients ?? 0) > 0;
  const actionButton = (action: GettingStartedAction, label: string) => (
    <Button type="button" size="sm" variant="outline" className="min-h-9 h-auto max-w-full gap-1.5 whitespace-normal text-left py-2" onClick={() => start(action)}>
      {t(label)}<ChevronRight className="h-3.5 w-3.5" />
    </Button>
  );

  return (
    <>
      <section aria-label={t(manager ? "first_steps.operations_title" : "first_steps.title")} className="border-y border-border bg-muted/20 px-3 py-4 sm:px-5">
        <div className="flex items-center gap-2.5">
          <ListChecks className="h-5 w-5 text-primary shrink-0" />
          <h2 className="min-w-0 flex-1 text-base font-semibold text-foreground">{t(manager ? "first_steps.operations_title" : "first_steps.title")}</h2>
          <span aria-live="polite" className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            {factsQuery.isPending ? t("first_steps.loading") : `${completed}/${steps.length}`}
          </span>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" title={t("first_steps.dismiss")}
            aria-label={t("first_steps.dismiss")} onClick={() => updatePreferences({ ...preferences, dismissed: true, review: false })}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Progress value={completed / steps.length * 100} aria-label={t("first_steps.progress")} className="mt-3 h-1.5" />
        <ol className="mt-2 divide-y divide-border">
          {steps.map((step, index) => (
            <li key={step.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${step.complete ? "bg-primary/10 text-primary" : "border border-border text-muted-foreground"}`}>
                {step.complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <h3 className="text-sm font-medium text-foreground">{t(`first_steps.${step.id === "link" && scope.clinicId ? "clinic_link" : step.id}.title`)}</h3>
                {!step.complete && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t(`first_steps.${step.id === "link" && scope.clinicId ? "clinic_link" : step.id}.desc`)}</p>}
              </div>
              {step.complete && !preferences.review ? <span className="text-xs text-primary">{t("first_steps.done")}</span> :
                <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
                  {step.id === "link" && <Button type="button" size="sm" variant="outline" className="h-9 gap-1.5" disabled={copying} onClick={copyLink}>
                    {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
                    {t(registrationPending ? "first_steps.registration" : "first_steps.copy")}
                  </Button>}
                  {step.id === "patient" && actionButton("patient", "first_steps.add")}
                  {step.id === "record" && <>
                    {actionButton("record", "first_steps.record_visit")}
                    {actionButton("manual-assessment", "first_steps.manual_assessment")}
                  </>}
                  {step.id === "hep" && actionButton(hasPatient ? "hep" : "patient", hasPatient ? (registrationPending ? "first_steps.registration" : "first_steps.create_hep") : "first_steps.add")}
                  {step.id === "identity" && actionButton("identity", "first_steps.configure")}
                  {step.id === "team" && actionButton("team", "first_steps.invite")}
                  {step.id === "services" && actionButton("services", "first_steps.services")}
                  {step.id === "appointment" && actionButton("appointment", "first_steps.agenda")}
                </div>}
            </li>
          ))}
        </ol>
        {unknown && !factsQuery.isPending && <div role="status" className="flex items-center gap-2 border-t border-border pt-2">
          <p className="flex-1 text-xs text-muted-foreground">{t("first_steps.check_error")}</p>
          <Button type="button" variant="ghost" size="icon" title={t("load_opt_in.retry")} aria-label={t("load_opt_in.retry")}
            disabled={factsQuery.isFetching} onClick={() => void factsQuery.refetch()}><RefreshCw className="h-4 w-4" /></Button>
        </div>}
      </section>
      <Dialog open={!!picker} onOpenChange={(open) => { if (!open) setPicker(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("first_steps.pick_patient")}</DialogTitle>
            <DialogDescription>{t(`first_steps.pick_${picker ?? "record"}`)}</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("first_steps.search")}
              aria-label={t("first_steps.search")} className="pl-9" />
          </div>
          <div className="max-h-[45vh] overflow-y-auto space-y-1">
            {patientsQuery.isPending ? <Loader2 className="mx-auto my-5 h-5 w-5 animate-spin text-muted-foreground" /> : patientsQuery.isError ?
              <div role="alert" className="space-y-2 py-4 text-sm text-destructive">
                {t("first_steps.check_error")}<Button type="button" variant="outline" onClick={() => void patientsQuery.refetch()}>{t("load_opt_in.retry")}</Button>
              </div> : patientsQuery.data?.length ? patientsQuery.data.map((patient) => (
                <Button type="button" key={patient.id} variant="ghost" className="w-full h-auto min-h-11 justify-between gap-3 py-3 text-left whitespace-normal"
                  onClick={() => {
                    if (!picker) return;
                    goTo(gettingStartedDestination(scope.clinicId, picker, patient.email || patient.full_name || patient.id));
                    setPicker(null);
                  }}>
                  <span className="min-w-0 break-words">{patient.full_name}</span><ChevronRight className="h-4 w-4 shrink-0" />
                </Button>
              )) : <p className="py-4 text-sm text-muted-foreground">{t("first_steps.no_patient")}</p>}
          </div>
          <Button type="button" variant="outline" onClick={() => { setPicker(null); start("patient"); }}>{t("first_steps.add")}</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}