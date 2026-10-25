import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

interface Member { email: string | null; name: string | null; role: string; status: string }
interface ClinicRow {
  id: string; name: string; owner_email: string | null; owner_name: string | null;
  subscription_status: string | null; subscription_stripe_id: string | null;
  max_members: number | null; active_members: number; members: Member[];
  patients_count: number; created_at: string;
}

const statusVariant = (s: string | null) =>
  s === "active" ? "default" : s === "trial" || s === "trialing" ? "secondary" : "destructive";

export default function ClinicManagement({ isPt }: { isPt: boolean }) {
  const [rows, setRows] = useState<ClinicRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase.rpc as any)("admin_list_clinics");
      if (error) setError(error.message);
      else setRows((data || []) as ClinicRow[]);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.name, r.owner_email, r.owner_name, ...r.members.map((m) => m.email)].some((v) => v?.toLowerCase().includes(t)));
  }, [rows, q]);

  const active = rows.filter((r) => r.subscription_status === "active").length;

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (error) return <p className="text-destructive text-sm">{error}</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{isPt ? "Clínicas" : "Clinics"}</CardTitle>
        <CardDescription>
          {rows.length} {isPt ? "clínica(s)" : "clinic(s)"} · {active} {isPt ? "ativa(s)" : "active"}
        </CardDescription>
        <Input placeholder={isPt ? "Buscar por nome ou e-mail" : "Search by name or email"} value={q} onChange={(e) => setQ(e.target.value)} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {filtered.length === 0 && <p className="text-muted-foreground text-center py-6">{isPt ? "Nenhuma clínica." : "No clinics."}</p>}
        {filtered.map((c) => (
          <div key={c.id} className="rounded-xl border border-border p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">{c.name}</p>
                <p className="text-sm text-muted-foreground break-all">
                  {isPt ? "Dono" : "Owner"}: {c.owner_name ? `${c.owner_name} · ` : ""}{c.owner_email || "—"}
                </p>
              </div>
              <Badge variant={statusVariant(c.subscription_status) as any}>{c.subscription_status || "—"}</Badge>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>{isPt ? "Membros" : "Members"}: {c.active_members}/{c.max_members ?? "—"}</span>
              <span>{isPt ? "Pacientes" : "Patients"}: {c.patients_count}</span>
              <span>{isPt ? "Criada em" : "Created"}: {new Date(c.created_at).toLocaleDateString(isPt ? "pt-BR" : "en-US")}</span>
              {c.subscription_stripe_id && <span className="break-all">{isPt ? "Assinatura" : "Subscription"}: {c.subscription_stripe_id}</span>}
            </div>
            {c.members.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {c.members.map((m, i) => (
                  <Badge key={i} variant="outline" className="font-normal">
                    {m.name || m.email || "—"} · {m.role}{m.status !== "active" ? ` (${m.status})` : ""}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
