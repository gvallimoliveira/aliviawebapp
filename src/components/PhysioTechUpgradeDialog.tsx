// Soft paywall shown when the PhysioTech franchise (annual) or trial (monthly)
// is used up. Prices mirror mem://business/physiotech-commercial-model.
import { useEffect, useState } from "react";
import { PhysioTechIcon } from "@/components/PhysioTechShortcut";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Ent = { kind: string; base: "annual" | "monthly" | null };
const PRICES = { monthly: { essencial: 89, pro: 139 }, annual: { essencial: 59, pro: 99 } };

const PhysioTechUpgradeDialog = () => {
  const [ent, setEnt] = useState<Ent | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setEnt((e as CustomEvent).detail);
    window.addEventListener("physiotech:upgrade", on);
    return () => window.removeEventListener("physiotech:upgrade", on);
  }, []);

  const buy = async (tier: "essencial" | "pro") => {
    setBusy(tier);
    const { data, error } = await supabase.functions.invoke("physiotech-addon", {
      body: { action: "checkout", tier, return_origin: window.location.origin },
    });
    setBusy(null);
    if (error || !data?.url) { toast.error("Não foi possível abrir o pagamento."); return; }
    window.location.href = data.url;
  };

  const base = ent?.base;
  const p = base ? PRICES[base] : null;
  const title = ent?.kind === "monthly_trial" ? "Você já usou seu laudo de degustação" : "Seus laudos de cortesia deste mês acabaram";

  return (
    <Dialog open={!!ent} onOpenChange={(o) => !o && setEnt(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PhysioTechIcon className="h-5 w-5" /> {title}</DialogTitle>
          <DialogDescription>
            {p
              ? `Continue usando o PhysioTech com ${base === "annual" ? "~50%" : "30%"} de desconto por ser assinante Aliv.iA, na mesma fatura.`
              : "O PhysioTech está disponível para assinantes Aliv.iA PRO."}
          </DialogDescription>
        </DialogHeader>
        {p && (
          <div className="space-y-2">
            <Button className="w-full justify-between" disabled={!!busy} onClick={() => buy("essencial")}>
              <span>PhysioTech Essencial</span><span>+R$ {p.essencial}/mês</span>
            </Button>
            <Button variant="outline" className="w-full justify-between" disabled={!!busy} onClick={() => buy("pro")}>
              <span>PhysioTech Pro</span><span>+R$ {p.pro}/mês</span>
            </Button>
            {base === "annual" && <p className="text-xs text-muted-foreground">Cobrado anualmente (R$ {p.essencial * 10} ou R$ {p.pro * 10}/ano).</p>}
            {base === "monthly" && <p className="text-xs text-muted-foreground">No Aliv.iA Anual o desconto sobe para ~50% e você ganha 3 laudos/mês por 6 meses.</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
export default PhysioTechUpgradeDialog;
