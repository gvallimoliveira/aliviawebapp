import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { BLOCKABLE_TIERS } from "@/lib/aiCreditPolicy";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
export default function AiCreditRollout() {
  const { t } = useLanguage();
  const [enabled, setEnabled] = useState(false);
  const [tiers, setTiers] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => { void supabase.rpc("admin_ai_credit_rollout", {}).then(({ data, error }) => {
    if (error || !data) return;
    const s = data as { enabled: boolean; tiers: string[] };
    setEnabled(s.enabled); setTiers(s.tiers); setSaved(s.enabled ? s.tiers : []); setReady(true);
  }); }, []);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("admin_ai_credit_rollout", { _enabled: enabled, _tiers: tiers });
    setSaving(false); setConfirm(false);
    if (error) { toast.error(t("credits.saveError")); return; }
    setSaved(enabled ? tiers : []); toast.success(t("credits.saved"));
  };
  if (!ready) return null;
  return <section className="space-y-3 border-y border-border py-4">
    <h3 className="font-semibold">{t("credits.rolloutTitle")}</h3>
    <p className="text-sm text-muted-foreground">{saved.length ? `${t("credits.activeCategories")}: ${saved.join(", ")}` : t("credits.noBlocks")}</p>
    <label className="flex items-center gap-3 text-sm"><Switch checked={enabled} onCheckedChange={setEnabled} />{t("credits.master")}</label>
    <div className="grid gap-3 sm:grid-cols-3">{BLOCKABLE_TIERS.map(tier => <label key={tier} className="flex items-center gap-2 text-sm"><Checkbox checked={tiers.includes(tier)} onCheckedChange={value => setTiers(current => value ? [...current, tier] : current.filter(x => x !== tier))} />{t(`credits.tier.${tier}`)}</label>)}</div>
    <Button disabled={saving} onClick={() => enabled && tiers.length ? setConfirm(true) : void save()}>{t("credits.save")}</Button>
    <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t("credits.confirmTitle")}</AlertDialogTitle><AlertDialogDescription>{t("credits.confirmBody")}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>{t("credits.close")}</AlertDialogCancel><AlertDialogAction disabled={saving} onClick={() => void save()}>{t("credits.confirm")}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}
