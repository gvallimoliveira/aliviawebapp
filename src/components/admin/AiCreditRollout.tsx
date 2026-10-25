import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { BLOCKABLE_TIERS } from "@/lib/aiCreditPolicy";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function AiCreditRollout() {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [tiers, setTiers] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase.rpc("admin_ai_credit_rollout", {}).then(({ data, error }) => {
      if (error || !data) { setStatus("denied"); return; }
      const s = data as { enabled: boolean; tiers: string[] };
      setEnabled(!!s.enabled); setTiers(s.tiers || []); setSaved(s.enabled ? s.tiers || [] : []); setStatus("ready");
    });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("admin_ai_credit_rollout", { _enabled: enabled, _tiers: tiers });
    setSaving(false); setConfirm(false);
    if (error) { toast.error(t("credits.saveError")); return; }
    setSaved(enabled ? tiers : []); toast.success(t("credits.saved"));
  };

  const active = saved.length > 0;
  return (
    <Card className={active ? "border-destructive" : "border-primary/40"}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            {active ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-primary" />}
            {t("credits.rolloutTitle")}
          </CardTitle>
          {status === "ready" && (
            <Badge variant={active ? "destructive" : "secondary"}>
              {active ? t("credits.statusActive") : t("credits.statusShadow")}
            </Badge>
          )}
        </div>
        <CardDescription>{t("credits.rolloutDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "loading" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
        {status === "denied" && <p className="text-sm text-destructive">{t("credits.rolloutDenied")}</p>}
        {status === "ready" && (
          <>
            <p className="text-sm text-muted-foreground">
              {active ? `${t("credits.activeCategories")}: ${saved.map((x) => t(`credits.tier.${x}`)).join(", ")}` : t("credits.noBlocks")}
            </p>
            <label className="flex items-center gap-3 text-sm font-medium">
              <Switch checked={enabled} onCheckedChange={setEnabled} />{t("credits.master")}
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              {BLOCKABLE_TIERS.map((tier) => (
                <label key={tier} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={tiers.includes(tier)} onCheckedChange={(value) => setTiers((c) => value ? [...c, tier] : c.filter((x) => x !== tier))} />
                  {t(`credits.tier.${tier}`)}
                </label>
              ))}
            </div>
            <Button disabled={saving} onClick={() => enabled && tiers.length ? setConfirm(true) : void save()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{t("credits.save")}
            </Button>
          </>
        )}
        <AlertDialog open={confirm} onOpenChange={setConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("credits.confirmTitle")}</AlertDialogTitle>
              <AlertDialogDescription>{t("credits.confirmBody")}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("credits.close")}</AlertDialogCancel>
              <AlertDialogAction disabled={saving} onClick={() => void save()}>{t("credits.confirm")}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
