import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getPublicOrigin } from "@/lib/getPublicOrigin";
import { Copy, Link2, Loader2, Plus, RefreshCw, ShieldAlert, Trash2, UserRound, Dumbbell } from "lucide-react";
import type { PeriodizationLink, PlanRestriction } from "@/lib/periodizationData";
import { addRestriction, createLink, deleteRestriction, revokeLink } from "@/lib/periodizationData";

interface Props {
  patientId: string;
  planId?: string | null;
  restrictions: PlanRestriction[];
  links: PeriodizationLink[];
  onChanged: () => void;
  readOnly?: boolean;
}

const BridgeCard = ({ patientId, planId, restrictions, links, onChanged, readOnly }: Props) => {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<"allow" | "avoid">("avoid");
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState<"patient" | "coach" | null>(null);

  const linkUrl = (token: string) => `${getPublicOrigin()}/carga/${token}`;

  const submit = async () => {
    if (!planId || text.trim().length < 3) return;
    setSaving(true);
    try {
      await addRestriction(planId, kind, text);
      setText("");
      onChanged();
    } catch (e: any) {
      toast({ title: "Não foi possível salvar", description: e?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const makeLink = async (audience: "patient" | "coach", renew = false) => {
    if (renew && !window.confirm("Gerar um novo link? O link atual deixará de funcionar.")) return;
    setCreating(audience);
    try {
      const link = await createLink({ patientId, planId, audience, renew });
      await navigator.clipboard.writeText(linkUrl(link.token)).catch(() => undefined);
      onChanged();
      toast({
        title: renew ? "Novo link gerado" : audience === "coach" ? "Link do preparador pronto" : "Link do paciente pronto",
        description: "Link copiado para a área de transferência.",
      });
    } catch (e: any) {
      toast({ title: "Não foi possível criar o link", description: e?.message, variant: "destructive" });
    } finally {
      setCreating(null);
    }
  };

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(linkUrl(token)).catch(() => undefined);
    toast({ title: "Link copiado" });
  };

  // Um link por público: mostra só o mais recente ativo de cada.
  const activeLinks = (["patient", "coach"] as const)
    .map((a) => links.filter((l) => l.active && l.audience === a)
      .sort((x: any, y: any) => String(y.created_at ?? "").localeCompare(String(x.created_at ?? "")))[0])
    .filter(Boolean) as PeriodizationLink[];
  const has = (a: "patient" | "coach") => activeLinks.some((l) => l.audience === a);

  return (
    <Card>
      <CardHeader className="pb-2 periodization-card-header">
        <CardTitle className="text-sm flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Links de check-in e orientações compartilhadas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!readOnly && (
          <div className="flex flex-wrap gap-2">
             {!has("patient") && <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => makeLink("patient")} disabled={creating !== null}>
              {creating === "patient" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserRound className="h-3.5 w-3.5" />}
              Link do paciente
            </Button>}
             {!has("coach") && <Button type="button" size="sm" variant="outline" className="rounded-xl gap-1 text-xs" onClick={() => makeLink("coach")} disabled={creating !== null}>
              {creating === "coach" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Dumbbell className="h-3.5 w-3.5" />}
              Link do preparador
            </Button>}
          </div>
        )}

        {activeLinks.length > 0 && (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {activeLinks.map((l) => (
              <div key={l.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-border px-3 py-2">
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {l.audience === "coach" ? "Preparador" : "Paciente"}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{linkUrl(l.token)}</span>
                 <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Copiar link de check-in" title="Copiar link de check-in" onClick={() => copy(l.token)}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                {!readOnly && (
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Gerar novo link" title="Gerar novo link (desativa o atual)" disabled={creating !== null} onClick={() => makeLink(l.audience as "patient" | "coach", true)}>
                    {creating === l.audience ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  </Button>
                )}
                {!readOnly && (
                   <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label="Desativar link" title="Desativar link" onClick={async () => { await revokeLink(l.id); onChanged(); }}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">
              O link não expira: serve para o check-in diário. Desative quando o acompanhamento terminar.
            </p>
          </div>
        )}

        {/* Restrições */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" /> Pode / evitar
          </p>
          {restrictions.map((r) => (
            <div key={r.id} className="flex items-start gap-2 rounded-xl border border-border px-3 py-2">
              <Badge
                variant="outline"
                className={r.kind === "allow"
                  ? "text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
                  : "text-[10px] text-rose-700 dark:text-rose-400 border-rose-500/40"}
              >
                {r.kind === "allow" ? "Pode" : "Evitar"}
              </Badge>
              <span className="text-xs text-foreground flex-1">{r.text}</span>
              {!readOnly && (
                 <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Excluir orientação" onClick={async () => { await deleteRestriction(r.id); onChanged(); }}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                 </Button>
              )}
            </div>
          ))}

          {!readOnly && planId && (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-xl text-[11px] shrink-0"
                onClick={() => setKind(kind === "avoid" ? "allow" : "avoid")}
              >
                {kind === "avoid" ? "Evitar" : "Pode"}
              </Button>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex.: evitar salto unipodal até 8 semanas"
                className="text-sm"
                 onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void submit(); } }}
              />
               <Button type="button" size="icon" className="rounded-xl shrink-0" onClick={submit} disabled={saving || text.trim().length < 3}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
          )}
          {restrictions.length === 0 && (
            <p className="text-[11px] text-muted-foreground">
              As orientações aparecem no link do paciente e do preparador, sem expor o prontuário.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default BridgeCard;
