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
  service_type: string | null;
}

const CATEGORIES: { v: string; dot: string; pt: string; en: string; es: string }[] = [
  { v: "avaliacao", dot: "bg-red-500", pt: "Avaliação", en: "Assessment", es: "Evaluación" },
  { v: "fisioterapia", dot: "bg-teal-500", pt: "Fisioterapia", en: "Physiotherapy", es: "Fisioterapia" },
  { v: "pilates", dot: "bg-purple-500", pt: "Pilates", en: "Pilates", es: "Pilates" },
  { v: "osteopatia", dot: "bg-orange-500", pt: "Osteopatia", en: "Osteopathy", es: "Osteopatía" },
  { v: "massoterapia", dot: "bg-pink-500", pt: "Massoterapia", en: "Massage Therapy", es: "Masoterapia" },
  { v: "rpg", dot: "bg-indigo-500", pt: "RPG", en: "RPG", es: "RPG" },
];

/**
 * Catálogo de serviços da clínica: nome, valor e tipo (avulso/mensal).
 * Os valores alimentam os insights financeiros; mensalidades são diluídas
 * por sessão realizada no mês. Ao agendar, a equipe escolhe o serviço.
 */
const ClinicServicesCard = ({ professionalId }: { professionalId?: string } = {}) => {
  const { activeClinic, canManageClinic } = useClinic();
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";
  const t = (pt: string, en: string, es: string) => (lang === "pt" ? pt : lang === "es" ? es : en);

  const [rows, setRows] = useState<ServiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [billing, setBilling] = useState<"per_session" | "monthly">("per_session");
  const [category, setCategory] = useState("fisioterapia");
  const [saving, setSaving] = useState(false);

  const clinicId = professionalId ? undefined : activeClinic?.clinic_id;
  const canEdit = !!professionalId || (!!canManageClinic && !!clinicId);

  const load = async () => {
    if (!canEdit) return;
    setLoading(true);
    let query = (supabase.from("care_services" as any) as any)
      .select("id, name, price, billing_type, active, service_type")
      .order("name");
    query = clinicId ? query.eq("clinic_id", clinicId) : query.is("clinic_id", null).eq("professional_id", professionalId);
    const { data, error } = await query;
    if (error) toast({ title: t("Erro ao carregar serviços", "Could not load services", "Error al cargar servicios"), description: error.message, variant: "destructive" });
    setRows((data as ServiceRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { setRows([]); void load(); }, [clinicId, professionalId, canEdit]);

  if (!canEdit) return null;

  const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const add = async () => {
    const p = Number(String(price).replace(",", "."));
    if (!name.trim() || !Number.isFinite(p) || p < 0) {
      toast({ title: t("Preencha nome e valor válido", "Enter a valid name and price", "Ingrese nombre y valor válidos"), variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await (supabase.from("care_services" as any) as any)
      .insert({ clinic_id: clinicId || null, professional_id: clinicId ? null : professionalId, name: name.trim(), price: p, billing_type: billing, service_type: category });
    setSaving(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setName(""); setPrice(""); setBilling("per_session"); setCategory("fisioterapia");
    toast({ title: t("Serviço adicionado", "Service added", "Servicio añadido") });
    load();
  };

  const toggle = async (r: ServiceRow) => {
    const { error } = await (supabase.from("care_services" as any) as any).update({ active: !r.active }).eq("id", r.id);
    if (error) { toast({ title: t("Erro", "Error", "Error"), description: error.message, variant: "destructive" }); return; }
    load();
  };

  const setType = async (r: ServiceRow, v: string) => {
    const { error } = await (supabase.from("care_services" as any) as any).update({ service_type: v }).eq("id", r.id);
    if (error) { toast({ title: t("Erro", "Error", "Error"), description: error.message, variant: "destructive" }); return; }
    load();
  };

  const catSelect = (value: string, onChange: (v: string) => void, cls: string) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cls} aria-label={t("Tipo na agenda", "Agenda type", "Tipo en agenda")}><SelectValue /></SelectTrigger>
      <SelectContent>
        {CATEGORIES.map((c) => (
          <SelectItem key={c.v} value={c.v}>
            <span className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${c.dot}`} />{c[lang]}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

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
            "Serviços ativos ficam disponíveis aos pacientes vinculados ao solicitar um horário. Valores avulsos ou mensais alimentam os indicadores financeiros.",
            "Active services are available to linked patients when requesting an appointment. Per-session or monthly prices feed financial indicators.",
            "Los servicios activos están disponibles para pacientes vinculados al solicitar una cita. Los precios por sesión o mensuales alimentan los indicadores financieros.")}
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
                  <p className="break-words font-medium">{r.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {brl(Number(r.price))}{r.billing_type === "monthly" ? t(" /mês", " /mo", " /mes") : t(" /sessão", " /session", " /sesión")}
                  </p>
                </div>
                {catSelect(r.service_type || "fisioterapia", (v) => setType(r, v), "h-8 w-[140px] text-xs")}
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

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px_110px_130px_auto] gap-2 items-end border-t border-border pt-3">
          <div>
            <Label className="text-xs">{t("Nome do serviço", "Service name", "Nombre del servicio")}</Label>
            <Input aria-label={t("Nome do serviço", "Service name", "Nombre del servicio")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Ex.: Fisioterapia, Pilates...", "E.g.: Physio, Pilates...", "Ej.: Fisioterapia, Pilates...")} className="h-9 mt-1" />
          </div>
          <div>
            <Label className="text-xs">{t("Tipo na agenda", "Agenda type", "Tipo en agenda")}</Label>
            {catSelect(category, setCategory, "h-9 mt-1")}
          </div>
          <div>
            <Label className="text-xs">{t("Valor (R$)", "Price", "Valor")}</Label>
            <Input aria-label={t("Valor (R$)", "Price", "Valor")} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="150" className="h-9 mt-1" />
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
