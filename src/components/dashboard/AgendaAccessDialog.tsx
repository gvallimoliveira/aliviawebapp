import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AGENDA_BASE_SERVICES, agendaServiceLabel, type AgendaScope } from "@/lib/agendaVisibility";

type Lang = "pt" | "en" | "es";
interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberId: string;
  memberName: string;
  scope: AgendaScope;
  services: string[];
  customServices: { id: string; name: string }[];
  lang: Lang;
  onSaved: () => void;
}

const tx = (lang: Lang, pt: string, en: string, es: string) => (lang === "en" ? en : lang === "es" ? es : pt);

/** Owner/admin sets what a clinical team member sees in the clinic Agenda. */
const AgendaAccessDialog = ({ open, onOpenChange, memberId, memberName, scope, services, customServices, lang, onSaved }: Props) => {
  const [draftScope, setDraftScope] = useState<AgendaScope>(scope);
  const [draftServices, setDraftServices] = useState<string[]>(services);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) { setDraftScope(scope); setDraftServices(services); } }, [open, memberId]); // eslint-disable-line react-hooks/exhaustive-deps

  const options: { value: AgendaScope; title: string; desc: string }[] = [
    { value: "own", title: tx(lang, "Só a própria agenda", "Own schedule only", "Solo la propia agenda"),
      desc: tx(lang, "Vê apenas os atendimentos marcados com ele(a).", "Sees only appointments booked with them.", "Ve solo las citas agendadas con él/ella.") },
    { value: "services", title: tx(lang, "Agenda dos serviços que opera", "Schedule of the services they work in", "Agenda de los servicios que opera"),
      desc: tx(lang, "Vê os próprios atendimentos e os de toda a equipe nos serviços marcados.", "Sees their own appointments plus the whole team's in the checked services.", "Ve sus citas y las de todo el equipo en los servicios marcados.") },
    { value: "clinic", title: tx(lang, "Agenda completa da clínica", "Whole clinic schedule", "Agenda completa de la clínica"),
      desc: tx(lang, "Vê todos os atendimentos de todos os serviços.", "Sees every appointment of every service.", "Ve todas las citas de todos los servicios.") },
  ];
  // Keep granted services whose catalog entry was removed visible, so they can be unchecked.
  const serviceKeys = Array.from(new Set([
    ...AGENDA_BASE_SERVICES.map((s) => s.key),
    ...customServices.map((c) => `svc:${c.id}`),
    ...draftServices,
  ]));
  const toggle = (key: string) => setDraftServices((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const missingService = draftScope === "services" && draftServices.length === 0;

  const save = async () => {
    if (missingService) return;
    setSaving(true);
    const { data, error } = await (supabase.from("clinic_members") as any)
      .update({ agenda_scope: draftScope, agenda_services: draftScope === "services" ? draftServices : [] })
      .eq("id", memberId)
      .select("id");
    setSaving(false);
    if (error || !data?.length) {
      toast({ title: tx(lang, "Não foi possível salvar o acesso à agenda", "Could not save agenda access", "No se pudo guardar el acceso a la agenda"),
        description: tx(lang, "Somente proprietário ou administrador pode alterar.", "Only the owner or an admin can change it.", "Solo el propietario o administrador puede cambiarlo."), variant: "destructive" });
      return;
    }
    toast({ title: tx(lang, "Acesso à agenda atualizado", "Agenda access updated", "Acceso a la agenda actualizado") });
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tx(lang, "Acesso à agenda", "Agenda access", "Acceso a la agenda")}</DialogTitle>
          <DialogDescription>
            {tx(lang, `O que ${memberName} enxerga na Agenda da clínica.`, `What ${memberName} sees in the clinic schedule.`, `Lo que ${memberName} ve en la Agenda de la clínica.`)}
          </DialogDescription>
        </DialogHeader>
        <div role="radiogroup" className="space-y-2">
          {options.map((o) => (
            <button key={o.value} type="button" role="radio" aria-checked={draftScope === o.value} onClick={() => setDraftScope(o.value)}
              className={cn("w-full text-left rounded-lg border p-3 transition-colors", draftScope === o.value ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50")}>
              <p className="text-sm font-medium">{o.title}</p>
              <p className="text-xs text-muted-foreground">{o.desc}</p>
            </button>
          ))}
        </div>
        {draftScope === "services" && (
          <div className="space-y-2">
            <p className="text-xs font-medium">{tx(lang, "Serviços liberados", "Allowed services", "Servicios permitidos")}</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {serviceKeys.map((key) => (
                <label key={key} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1.5 text-xs cursor-pointer min-w-0">
                  <Checkbox checked={draftServices.includes(key)} onCheckedChange={() => toggle(key)} />
                  <span className="truncate">{agendaServiceLabel(key, lang, customServices)}</span>
                </label>
              ))}
            </div>
            {missingService && (
              <p className="text-xs text-destructive">{tx(lang, "Marque ao menos um serviço ou escolha outra opção.", "Check at least one service or pick another option.", "Marque al menos un servicio o elija otra opción.")}</p>
            )}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          {tx(lang, "Proprietário, administrador e secretária sempre veem a agenda completa. Esta regra vale só para a Agenda; não muda o acesso a prontuários.",
            "Owner, admin and secretary always see the full schedule. This rule applies to the schedule only; it does not change access to patient records.",
            "Propietario, administrador y secretaria siempre ven la agenda completa. Esta regla vale solo para la Agenda; no cambia el acceso a las historias clínicas.")}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{tx(lang, "Cancelar", "Cancel", "Cancelar")}</Button>
          <Button type="button" onClick={save} disabled={saving || missingService}>{saving ? tx(lang, "Salvando...", "Saving...", "Guardando...") : tx(lang, "Salvar", "Save", "Guardar")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AgendaAccessDialog;
