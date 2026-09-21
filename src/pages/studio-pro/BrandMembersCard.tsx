import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeInviteEmail } from "./brandSharing";

/**
 * PESSOAS COM ACESSO À MARCA
 *
 * Visível apenas para quem criou a marca. O convite é por e-mail e funciona
 * antes do cadastro: quando aquela pessoa entra no Studio com o mesmo e-mail,
 * a marca já aparece no hub dela com acesso completo (criar, editar, baixar).
 */

type Member = {
  id: string;
  email: string;
  user_id: string | null;
  created_at: string;
  revoked_at: string | null;
};

const BrandMembersCard = ({ brandId }: { brandId: string }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("studio_brand_members")
      .select("id, email, user_id, created_at, revoked_at")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true });
    if (error) console.error("[studio-pro] brand members", error);
    setMembers((data as Member[]) ?? []);
    setLoading(false);
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    const mail = normalizeInviteEmail(email);
    if (!mail) {
      toast.error("Digite um e-mail válido.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("studio_brand_members")
      .upsert(
        { brand_id: brandId, email: mail, revoked_at: null },
        { onConflict: "brand_id,email" },
      );
    setSaving(false);
    if (error) {
      console.error("[studio-pro] invite brand member", error);
      toast.error("Não foi possível dar acesso a este e-mail.");
      return;
    }
    setEmail("");
    toast.success("Acesso liberado. A marca aparece para essa pessoa ao entrar no Studio.");
    await load();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("studio_brand_members").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover o acesso.");
      return;
    }
    setMembers((prev) => prev.filter((m) => m.id !== id));
    toast.success("Acesso removido.");
  };

  const active = members.filter((m) => !m.revoked_at);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        Pessoas com acesso ({active.length})
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> carregando…
        </div>
      ) : active.length === 0 ? (
        <p className="rounded-2xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          Só você tem acesso a esta marca. Convide alguém pelo e-mail da conta Aliv.iA dessa pessoa: ela
          poderá criar, editar e baixar as artes desta marca — sem ver suas outras marcas.
        </p>
      ) : (
        <ul className="space-y-2">
          {active.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/20 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm">{m.email}</p>
                <p className="text-[11px] text-muted-foreground">
                  {m.user_id ? "acesso ativo" : "aguardando o primeiro acesso"} · desde{" "}
                  {new Date(m.created_at).toLocaleDateString("pt-BR")}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remover acesso de ${m.email}`}
                onClick={() => revoke(m.id)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Label htmlFor="brand-member-email" className="text-[11px]">
            E-mail de quem vai compartilhar a marca
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="brand-member-email"
              type="email"
              className="pl-9"
              placeholder="pessoa@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void invite();
              }}
            />
          </div>
        </div>
        <Button onClick={invite} disabled={saving || !email.trim()} className="rounded-full">
          {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserPlus className="mr-1.5 h-4 w-4" />}
          Dar acesso
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        A pessoa convidada faz tudo dentro desta marca. Excluir a marca e gerenciar acessos continuam só
        com você, e as gerações contam na sua cota.
      </p>
    </div>
  );
};

export default BrandMembersCard;
