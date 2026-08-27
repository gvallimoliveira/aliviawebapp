import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, Gift, Loader2, Plus, RotateCcw, Ban } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PRODUCT } from "./product";
import { useStudioAccess } from "./useStudioAccess";

/**
 * PAINEL VIP — ACESSOS CORTESIA
 *
 * Só a conta VIP vê e usa. Conceder por e-mail libera o equivalente ao plano
 * Solo gratuitamente (funciona mesmo antes da pessoa se cadastrar: ao criar a
 * conta com aquele e-mail, o acesso já vale). A RLS na tabela garante que só
 * VIP escreve.
 */

type Grant = {
  id: string;
  email: string;
  plan: string;
  note: string | null;
  revoked_at: string | null;
  created_at: string;
};

const StudioProVip = () => {
  const { user, loading: authLoading } = useAuth();
  const { access, loading: accessLoading } = useStudioAccess();
  const navigate = useNavigate();
  const [grants, setGrants] = useState<Grant[]>([]);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = `${PRODUCT.name} — acessos cortesia`;
  }, []);

  useEffect(() => {
    if (!authLoading && !user) navigate(`${PRODUCT.base}/entrar`, { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!accessLoading && !access.isVip) navigate(`${PRODUCT.base}/app`, { replace: true });
  }, [accessLoading, access.isVip, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("studio_granted_access")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) console.error("[studio-pro] grants", error);
    setGrants((data as Grant[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (access.isVip) void load();
  }, [access.isVip, load]);

  const grant = async () => {
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("studio_granted_access").upsert(
      {
        email: mail,
        plan: "solo",
        granted_by: user?.id ?? null,
        note: note.trim() || null,
        revoked_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    );
    setSaving(false);
    if (error) {
      console.error("[studio-pro] grant", error);
      toast.error("Não foi possível conceder o acesso.");
      return;
    }
    setEmail("");
    setNote("");
    toast.success("Acesso cortesia concedido (plano Solo).");
    void load();
  };

  const toggle = async (row: Grant) => {
    const { error } = await supabase
      .from("studio_granted_access")
      .update({ revoked_at: row.revoked_at ? null : new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) {
      toast.error("Não foi possível atualizar.");
      return;
    }
    void load();
  };

  if (authLoading || accessLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  const active = grants.filter((g) => !g.revoked_at).length;

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-3xl">
        <Link
          to={`${PRODUCT.base}/app`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Minhas marcas
        </Link>

        <section className="mt-5 rounded-3xl border border-border bg-card p-6">
          <h1 className="flex items-center gap-2 text-lg font-bold">
            <Crown className="h-5 w-5 text-primary" />
            Acessos cortesia
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cada acesso concedido libera o equivalente ao <strong>plano Solo</strong> gratuitamente: 1
            marca, 60 artes por mês e download sem marca d'água. {active} ativo(s).
          </p>

          <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
            <div>
              <Label htmlFor="grant-email">E-mail</Label>
              <Input
                id="grant-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="pessoa@email.com"
              />
            </div>
            <div>
              <Label htmlFor="grant-note">Observação (opcional)</Label>
              <Input
                id="grant-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex.: parceria, teste"
              />
            </div>
            <Button onClick={grant} disabled={saving} className="rounded-full sm:col-span-2">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Conceder acesso Solo
            </Button>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Concessões
          </h2>
          {grants.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum acesso concedido ainda.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {grants.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3"
                >
                  <Gift className={`h-4 w-4 ${row.revoked_at ? "text-muted-foreground" : "text-primary"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.email}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.revoked_at ? "Revogado" : `Ativo · plano ${row.plan}`}
                      {row.note ? ` · ${row.note}` : ""} ·{" "}
                      {new Date(row.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="rounded-full text-xs" onClick={() => toggle(row)}>
                    {row.revoked_at ? (
                      <>
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                        Reativar
                      </>
                    ) : (
                      <>
                        <Ban className="mr-1.5 h-3.5 w-3.5" />
                        Revogar
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
};

export default StudioProVip;
