import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, Palette, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT } from "./product";

/**
 * ÁREA LOGADA DO STUDIO PÚBLICO
 *
 * Shell isolado do app clínico. Aqui o cliente cadastra o kit da própria marca
 * (qualquer nicho) e vê o saldo de artes. As artes gratuitas saem com marca
 * d'água discreta; assinando, o download sai limpo.
 */

type Brand = {
  id: string;
  name: string;
  niche: string | null;
  tone: string | null;
  logo_url: string | null;
  colors: Record<string, string> | null;
};

type Credits = {
  plan: string;
  free_credits: number;
  plan_credits: number;
  extra_credits: number;
  used_this_period: number;
};

const emptyForm = { name: "", niche: "", tone: "", primary: "#0F766E", logo_url: "" };

const StudioProApp = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${PRODUCT.name} — meu estúdio`;
  }, []);

  // Sem sessão, manda para a entrada própria do Studio (não para o auth clínico).
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`${PRODUCT.base}/entrar`, { replace: true });
    }
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Garante o saldo inicial (5 artes gratuitas) na primeira visita.
    const [{ data: creditRow, error: creditError }, { data: brandRows, error: brandError }] =
      await Promise.all([
        supabase.rpc("ensure_studio_credits"),
        supabase.from("studio_brands").select("*").order("created_at", { ascending: false }),
      ]);

    if (creditError) console.error("[studio-pro] credits", creditError);
    if (brandError) console.error("[studio-pro] brands", brandError);

    const row = Array.isArray(creditRow) ? creditRow[0] : creditRow;
    setCredits((row as Credits) ?? null);
    setBrands((brandRows as Brand[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const createBrand = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Dê um nome para a marca.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("studio_brands").insert({
      user_id: user.id,
      name: form.name.trim(),
      niche: form.niche.trim() || null,
      tone: form.tone.trim() || null,
      logo_url: form.logo_url.trim() || null,
      colors: { primary: form.primary },
    });
    setSaving(false);
    if (error) {
      console.error("[studio-pro] insert brand", error);
      toast.error("Não foi possível salvar a marca.");
      return;
    }
    setForm(emptyForm);
    toast.success("Kit de marca salvo.");
    void load();
  };

  const removeBrand = async (id: string) => {
    const { error } = await supabase.from("studio_brands").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  const available = credits
    ? credits.free_credits + credits.plan_credits + credits.extra_credits - credits.used_this_period
    : 0;

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-4xl">
        <Link
          to={PRODUCT.base}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {PRODUCT.wordmark}
        </Link>

        {/* Saldo de artes */}
        <section className="mt-5 rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Artes disponíveis
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight">{Math.max(available, 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {credits?.plan === "free"
                  ? `Cortesia de boas-vindas: ${PRODUCT.freeCredits} artes com marca d'água discreta.`
                  : `Plano ${credits?.plan} ativo.`}
              </p>
            </div>
            {credits?.plan === "free" && (
              <Button asChild className="rounded-full">
                <Link to={`${PRODUCT.base}#planos`}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Ver planos
                </Link>
              </Button>
            )}
          </div>
        </section>

        {/* Kits de marca */}
        <section className="mt-5 rounded-3xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Palette className="h-5 w-5 text-primary" />
            Minhas marcas
          </h2>

          {brands.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma marca ainda. Cadastre a primeira: nome, nicho, tom de voz e a cor principal já
              bastam para o estúdio começar a criar no seu DNA visual.
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {brands.map((brand) => (
                <li
                  key={brand.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3"
                >
                  <span
                    className="h-8 w-8 shrink-0 rounded-full border border-border"
                    style={{ background: brand.colors?.primary ?? "hsl(var(--primary))" }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{brand.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {brand.niche || "nicho não informado"}
                      {brand.tone ? ` · ${brand.tone}` : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    onClick={() => removeBrand(brand.id)}
                    title="Remover marca"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6 grid gap-3 border-t border-border pt-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="brand-name">Nome da marca</Label>
              <Input
                id="brand-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Marun Café"
              />
            </div>
            <div>
              <Label htmlFor="brand-niche">Nicho</Label>
              <Input
                id="brand-niche"
                value={form.niche}
                onChange={(e) => setForm({ ...form, niche: e.target.value })}
                placeholder="Ex.: cafeteria, moda, advocacia"
              />
            </div>
            <div>
              <Label htmlFor="brand-color">Cor principal</Label>
              <Input
                id="brand-color"
                type="color"
                value={form.primary}
                onChange={(e) => setForm({ ...form, primary: e.target.value })}
                className="h-10 p-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="brand-tone">Tom de voz</Label>
              <Textarea
                id="brand-tone"
                rows={2}
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
                placeholder="Ex.: direto, com humor seco e frases curtas"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="brand-logo">URL do logo (opcional)</Label>
              <Input
                id="brand-logo"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
            <Button
              onClick={createBrand}
              disabled={saving}
              className="rounded-full sm:col-span-2"
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Salvar kit de marca
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default StudioProApp;
