import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClinic } from "@/contexts/ClinicContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export interface ClinicReportMember {
  id: string;
  user_id: string;
  full_name: string | null;
  council_type: string | null;
  council_number: string | null;
}

export function ClinicReportIdentityForm({ member, onSaved }: { member: ClinicReportMember; onSaved?: () => void }) {
  const { language } = useLanguage();
  const pt = language === "pt", es = language === "es";
  const [name, setName] = useState(member.full_name || "");
  const [council, setCouncil] = useState(member.council_type || "none");
  const [number, setNumber] = useState(member.council_number || "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("save_clinic_report_identity", {
      _member_id: member.id, _full_name: name.trim(),
      _council_type: council === "none" ? null : council,
      _council_number: council === "none" ? null : number.trim(),
    });
    setSaving(false);
    toast({ title: error ? (pt ? "Não foi possível salvar" : es ? "No se pudo guardar" : "Could not save") : (pt ? "Dados salvos" : es ? "Datos guardados" : "Details saved"), description: error?.message, variant: error ? "destructive" : "default" });
    if (!error) onSaved?.();
  };
  return <div className="space-y-4">
    <div className="space-y-2"><Label htmlFor="report-full-name">{pt ? "Nome completo" : es ? "Nombre completo" : "Full name"}</Label><Input id="report-full-name" value={name} maxLength={160} onChange={e => setName(e.target.value)} /></div>
    <div className="space-y-2"><Label>{pt ? "Conselho profissional" : es ? "Consejo profesional" : "Professional council"}</Label>
      <Select value={council} onValueChange={setCouncil}><SelectTrigger aria-label={pt ? "Conselho profissional" : "Professional council"}><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="none">{pt ? "Sem conselho" : es ? "Sin consejo" : "No council"}</SelectItem>
        <SelectItem value="CREFITO">CREFITO</SelectItem><SelectItem value="CREF">CREF</SelectItem><SelectItem value="CRM">CRM</SelectItem><SelectItem value="OTHER">{pt ? "Outro" : es ? "Otro" : "Other"}</SelectItem>
      </SelectContent></Select>
    </div>
    {council !== "none" && <div className="space-y-2"><Label htmlFor="report-council-number">{pt ? "Número e região do registro" : es ? "Número y región del registro" : "Registration number and region"}</Label><Input id="report-council-number" value={number} maxLength={60} onChange={e => setNumber(e.target.value)} /></div>}
    <Button onClick={save} disabled={saving || name.trim().length < 3 || (council !== "none" && !number.trim())}>{saving ? (pt ? "Salvando…" : es ? "Guardando…" : "Saving…") : (pt ? "Salvar dados" : es ? "Guardar datos" : "Save details")}</Button>
  </div>;
}

export default function ClinicReportIdentity() {
  const { user } = useAuth();
  const { activeClinic } = useClinic();
  const { language } = useLanguage();
  const [member, setMember] = useState<ClinicReportMember | null>(null);
  useEffect(() => {
    let alive = true;
    setMember(null);
    if (activeClinic?.clinic_id && user?.id) {
      supabase.rpc("get_clinic_report_members", { _clinic_id: activeClinic.clinic_id }).then(({ data }) => {
        if (alive && Array.isArray(data)) setMember((data as unknown as ClinicReportMember[]).find(m => m.user_id === user.id) || null);
      });
    }
    return () => { alive = false; };
  }, [activeClinic?.clinic_id, user?.id]);
  if (!member) return null;
  return <Card className="mb-6"><CardHeader><CardTitle className="text-base">{language === "pt" ? "Identificação nos relatórios da clínica" : language === "es" ? "Identificación en informes de la clínica" : "Clinic report identity"}</CardTitle></CardHeader><CardContent><ClinicReportIdentityForm key={member.id} member={member} /></CardContent></Card>;
}