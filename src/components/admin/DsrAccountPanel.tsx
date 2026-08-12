import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Search, Trash2, UserSearch } from "lucide-react";

type InventoryItem = { table: string; match: string; count: number };

type Dossier = {
  account: {
    email: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    phone: string | null;
    providers: string[];
    full_name: string | null;
    banned: boolean;
  } | null;
  classification: {
    account_type: string;
    signup_origin: string | null;
    occupation: string | null;
    preferred_language: string | null;
    has_professional_record: boolean;
    professional_approved: boolean | null;
    professional_crefito: string | null;
    subscription_status: string | null;
    subscription_stripe_id: string | null;
    clinic_memberships: { id: string; clinic_id: string; role: string; status: string }[];
    granted_premium: boolean;
    assessments_total: number;
    assessments_completed: number;
    assessments_via_professional: number;
    patient_records_as_email: number;
    first_activity: string | null;
  };
  inventory: InventoryItem[];
};

const TYPE_LABEL: Record<string, string> = {
  patient: "Paciente (conta pessoal)",
  professional: "Profissional (PRO)",
  student: "Estudante (Acadêmico)",
  clinic_staff: "Equipe de clínica",
};

const PROVIDER_LABEL: Record<string, string> = {
  email: "E-mail e senha",
  google: "Google",
  apple: "Apple",
  azure: "Microsoft",
  phone: "Telefone (SMS)",
};

function fmt(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border border-border p-3">
    <p className="text-muted-foreground mb-1">{label}</p>
    <p className="font-medium break-words">{value ?? "—"}</p>
  </div>
);

const DsrAccountPanel = ({
  userId,
  requestId,
  requestType,
  onPurged,
}: {
  userId: string;
  requestId: string;
  requestType: string;
  onPurged: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [dossier, setDossier] = useState<Dossier | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [reason, setReason] = useState("Pedido de exclusão do titular (LGPD, art. 18, VI).");
  const [purging, setPurging] = useState(false);

  const inspect = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("admin-dsr-account", {
      body: { action: "inspect", user_id: userId },
    });
    setLoading(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Erro ao inspecionar conta",
        description: (data as any)?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    setDossier(data as Dossier);
  };

  const purge = async () => {
    setPurging(true);
    const { data, error } = await supabase.functions.invoke("admin-dsr-account", {
      body: { action: "purge", user_id: userId, request_id: requestId, reason },
    });
    setPurging(false);
    setConfirmOpen(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Falha na exclusão",
        description: (data as any)?.error || error?.message,
        variant: "destructive",
      });
      return;
    }
    const deleted = (data as any)?.report?.deleted ?? {};
    const total = Object.values(deleted).reduce((a: number, b: any) => a + Number(b || 0), 0);
    toast({
      title: "Dados excluídos",
      description: `${total} registro(s) apagados em ${Object.keys(deleted).length} tabela(s). Login ${
        (data as any)?.auth_user_deleted ? "removido" : "NÃO removido"
      }.`,
    });
    setDossier(null);
    onPurged();
  };

  const c = dossier?.classification;
  const a = dossier?.account;

  return (
    <div className="rounded-xl border border-border p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold flex items-center gap-1.5">
          <UserSearch className="h-3.5 w-3.5 text-primary" />
          Origem da conta e dados vinculados
        </p>
        <Button size="sm" variant="outline" onClick={inspect} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Search className="h-3.5 w-3.5 mr-1" />}
          {dossier ? "Atualizar" : "Investigar conta"}
        </Button>
      </div>

      {!dossier ? (
        <p className="text-xs text-muted-foreground">
          Clique em “Investigar conta” para ver como o usuário se cadastrou, que tipo de conta é e exatamente
          quais registros existem no banco antes de decidir a exclusão.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/15 text-primary border-primary/30">
              {TYPE_LABEL[c!.account_type] || c!.account_type}
            </Badge>
            {(a?.providers?.length ? a.providers : ["desconhecido"]).map((p) => (
              <Badge key={p} variant="secondary">
                Cadastro: {PROVIDER_LABEL[p] || p}
              </Badge>
            ))}
            {c!.granted_premium && <Badge variant="outline">Premium concedido</Badge>}
            {c!.subscription_status && <Badge variant="outline">Assinatura: {c!.subscription_status}</Badge>}
            {!a && <Badge variant="destructive">Login já inexistente</Badge>}
          </div>

          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            <Row label="Nome" value={a?.full_name || "—"} />
            <Row label="E-mail de login" value={a?.email || "—"} />
            <Row label="Conta criada em" value={fmt(a?.created_at)} />
            <Row label="Último acesso" value={fmt(a?.last_sign_in_at)} />
            <Row label="E-mail confirmado" value={fmt(a?.email_confirmed_at)} />
            <Row label="Origem do cadastro (app)" value={c!.signup_origin || "não registrada"} />
            <Row label="Avaliações" value={`${c!.assessments_total} (${c!.assessments_completed} concluídas)`} />
            <Row label="Via link profissional/clínica" value={c!.assessments_via_professional} />
            <Row label="Prontuários com este e-mail" value={c!.patient_records_as_email} />
          </div>

          {c!.has_professional_record && (
            <p className="text-xs text-muted-foreground">
              Registro profissional encontrado · CREFITO: {c!.professional_crefito || "—"} · aprovado:{" "}
              {String(c!.professional_approved)}
            </p>
          )}
          {c!.clinic_memberships.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Vínculos de clínica: {c!.clinic_memberships.map((m) => `${m.role} (${m.status})`).join(", ")}
            </p>
          )}

          <div>
            <p className="text-xs font-semibold mb-2">Registros no banco</p>
            {dossier.inventory.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum registro vinculado encontrado.</p>
            ) : (
              <ul className="grid gap-1 sm:grid-cols-2">
                {dossier.inventory.map((i) => (
                  <li key={`${i.table}-${i.match}`} className="text-xs flex justify-between gap-2 border-b border-border/60 py-1">
                    <span className="text-muted-foreground">
                      {i.table} <span className="opacity-60">({i.match})</span>
                    </span>
                    <span className="font-semibold">{i.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(requestType === "deletion" || requestType === "anonymization") && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
              <p className="text-xs font-semibold text-destructive">Executar exclusão</p>
              <p className="text-xs text-muted-foreground">
                Apaga todos os registros acima e o login. São preservados por obrigação legal: o próprio pedido
                de privacidade (prova de atendimento), o registro de consentimento, logs de alerta, ações
                administrativas e o prontuário criado por profissionais (guarda mínima do conselho).
              </p>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo / base legal da exclusão"
              />
              <Button size="sm" variant="destructive" onClick={() => setConfirmOpen(true)} disabled={purging}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir conta e dados
              </Button>
            </div>
          )}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir definitivamente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível: apaga os dados de {a?.email || "este titular"} e remove o login. O pedido
              será marcado como concluído com registro de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={purge} disabled={purging}>
              {purging && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DsrAccountPanel;
