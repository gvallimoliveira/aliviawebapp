import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";

interface ServiceRow {
  id: string;
  name: string;
  price: number;
  billing_type: "per_session" | "monthly";
  active: boolean;
}

/**
 * Catálogo de serviços da clínica: nome, valor e tipo (avulso/mensal).
 * Os valores alimentam os insights financeiros; mensalidades são diluídas
 * por sessão realizada no mês. Ao agendar, a equipe escolhe o serviço.
 */
const ClinicServicesCard = () => {
  const { activeClinic, canManageClinic } = useClinic();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es: string) => (lang === "pt" ? pt : lang === "es" ? es : en);

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [billing, setBilling] = useState<"per_session" | "monthly">("per_session");
  const [saving, setSaving] = useState(false);

  const clinicId = activeClinic?.clinic_id;
  const canEdit = !!canManageClinic && !!clinicId;

  const load = async () => {
    if (!clinicId) return;
    setLoading(true);
    const { data } = await (supabase.from("care_services" as any) as any)
      .select("id, name, price, billing_type, active")
      .eq("clinic_id", clinicId)
      .order("name");
    setRows((data as ServiceRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [clinicId]);

  if (!activeClinic || !canManageClinic) return null;

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const add = async () => {
    const p = Number(String(price).replace(",", "."));
    if (!name.trim() || !Number.isFinite(p) || p < 0) {
      toast({ title: t("Preencha nome e valor válido", "Enter a valid name and price", "Ingrese nombre y valor válidos"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("care_services" as any) as any)
      .insert({ clinic_id: clinicId, name: name.trim(), price: p, billing_type: billing });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setName(""); setPrice(""); setBilling("per_session");
    toast({ title: t("Serviço adicionado", "Service added", "Servicio añadido") });
    load();
  };

  const toggle = async (r: ServiceRow) => {
    await (supabase.from("care_services" as any) as any).update({ active: !r.active }).eq("id", r.id);
    load();
  };

  const remove = async (r: ServiceRow) => {
    const { error } = await (supabase.from("care_services" as any) as any).delete().eq("id", r.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    load();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-5 w-5" />
          {t("Serviços e valores", "Services & pricing", "Servicios y valores")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {t(
            "Cadastre os serviços com valor avulso ou mensal. Ao agendar, a equipe escolhe o serviço e os insights financeiros usam esses valores (mensalidade diluída por sessão realizada no mês).",
            "Register services with per-session or monthly pricing. When booking, the team picks the service and financial insights use these values (monthly fees diluted per realized session that month).",
            "Registre servicios con valor por sesión o mensual. Al agendar, el equipo elige el servicio y los insights financieros usan estos valores (mensualidad diluida por sesión realizada).")}
        </p>

        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-1.5">
            {rows.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("Nenhum serviço cadastrado ainda.", "No services yet.", "Ningún servicio aún.")}</p>
            )}
            {rows.map((r) => (
              <div key={r.id} className={`flex items-center gap-2 rounded-lg border border-border p-2 text-sm ${r.active ? "" : "opacity-50"}`}>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {brl(Number(r.price))}{r.billing_type === "monthly" ? t(" /mês", " /mo", " /mes") : t(" /sessão", " /session", " /sesión")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggle(r)}>
                  {r.active ? t("Desativar", "Disable", "Desactivar") : t("Ativar", "Enable", "Activar")}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => remove(r)} aria-label={t("Remover", "Remove", "Quitar")}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px_130px_auto] gap-2 items-end border-t border-border pt-3">
          <div>
            <Label className="text-xs">{t("Nome do serviço", "Service name", "Nombre del servicio")}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Ex.: Fisioterapia, Pilates...", "E.g.: Physio, Pilates...", "Ej.: Fisioterapia, Pilates...")} className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">{t("Valor (R$)", "Price", "Valor")}</Label>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="150" className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">{t("Cobrança", "Billing", "Cobro")}</Label>
            <Select value={billing} onValueChange={(v) => setBilling(v as any)}>
              <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="per_session">{t("Avulso", "Per session", "Por sesión")}</SelectItem>
                <SelectItem value="monthly">{t("Mensal", "Monthly", "Mensual")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={add} disabled={saving} className="gap-1.5 h-9">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("Adicionar", "Add", "Añadir")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClinicServicesCard;
