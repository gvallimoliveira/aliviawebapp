import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Crown,
  Gift,
  Loader2,
  Palette,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRODUCT } from "./product";
import { useStudioAccess } from "./useStudioAccess";
import BrandColorFields from "./BrandColorFields";
import { ALIVIA_AUDIENCES, readAudiences, writeAudiences } from "./audiences";
import { DEFAULT_COLOR_KIT, writeColorKit, type BrandColorKit } from "./brandColors";
import logoAlivia from "@/assets/logo-alivia.png";

/**
 * HUB DE MARCAS DO STUDIO PÚBLICO
 *
 * Cada marca é um espaço isolado: as artes de uma marca nunca aparecem em
 * outra. Aqui o cliente escolhe/cria a marca e entra no espaço dela
 * (`/studio-pro/app/marca/:brandId`). VIP entra como agência (15 marcas,
 * sem cota) e ganha atalho para o painel de acessos cortesia.
 */

type Brand = {
  id: string;
  name: string;
  niche: string | null;
  tone: string | null;
  logo_url: string | null;
  colors: Record<string, string> | null;
  content_source?: string | null;
  audiences?: unknown;
  created_at: string;
};

type Credits = {
  plan: string;
  free_credits: number;
  plan_credits: number;
  extra_credits: number;
  used_this_period: number;
};

const emptyForm = { name: "", niche: "", tone: "", logo_url: "" };

/** Kit da própria Aliv.iA: verde + branco como principais. */
const ALIVIA_KIT: BrandColorKit = {
  primary: "#0F766E",
  primary2: "#FFFFFF",
  secondary: "#0B3B36",
  secondary2: "#E7F5F1",
  useSecondary: true,
};

const StudioProApp = () => {
  const { user, loading: authLoading } = useAuth();
  const { access, loading: accessLoading } = useStudioAccess();
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [credits, setCredits] = useState<Credits | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [colorKit, setColorKit] = useState<BrandColorKit>(DEFAULT_COLOR_KIT);
  const seeded = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = `${PRODUCT.name} — minhas marcas`;
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`${PRODUCT.base}/entrar`, { replace: true });
    }
  }, [authLoading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: creditRow, error: creditError }, { data: brandRows, error: brandError }, { data: artRows }] =
      await Promise.all([
        supabase.rpc("ensure_studio_credits"),
        supabase.from("studio_brands").select("*").order("created_at", { ascending: false }),
        supabase.from("studio_creations").select("brand_id"),
      ]);

    if (creditError) console.error("[studio-pro] credits", creditError);
    if (brandError) console.error("[studio-pro] brands", brandError);

    const row = Array.isArray(creditRow) ? creditRow[0] : creditRow;
    setCredits((row as Credits) ?? null);
    setBrands((brandRows as Brand[]) ?? []);
    const tally: Record<string, number> = {};
    (artRows ?? []).forEach((art: { brand_id: string | null }) => {
      if (art.brand_id) tally[art.brand_id] = (tally[art.brand_id] ?? 0) + 1;
    });
    setCounts(tally);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Conta VIP (nível agência) entra com o kit da própria Aliv.iA já cadastrado:
   * sem isso o hub aparece com 0 marcas e o VIP precisa redigitar o próprio DNA.
   */
  useEffect(() => {
    if (loading || accessLoading || !user || !access.isVip || seeded.current) return;
    if (brands.length > 0) return;
    seeded.current = true;
    void (async () => {
      const { error } = await supabase.from("studio_brands").insert({
        user_id: user.id,
        name: "Aliv.iA",
        niche: "fisioterapia e saúde digital",
        tone: "clínico, direto e humano — explica sem infantilizar",
        logo_url: logoAlivia,
        colors: writeColorKit(ALIVIA_KIT),
        source_url: "https://aliviawebapp.com.br",
        instagram_handle: "@aliviawebapp",
        description:
          "Sistema de raciocínio clínico com alma de fisioterapeuta: autoavaliação guiada, hipótese mais provável, plano de tratamento e prontuário para profissionais e clínicas.",
        topics: [
          "raciocínio clínico",
          "avaliação",
          "mapa de dor",
          "HEP",
          "STEPS",
          "prontuário",
          "reabilitação",
          "evidência",
        ],
        // Marca oficial: usa o acervo editorial real das landings (paciente, pro, clínica, estudante).
        content_source: "alivia",
        positioning:
          "O Aliv.iA transforma a queixa de dor em raciocínio clínico: o paciente entende o que está acontecendo, o profissional recebe avaliação e prontuário prontos, a clínica padroniza a equipe e o estudante treina o raciocínio com casos reais.",
        strategy_notes:
          "Informar antes de vender: mostrar o método (STEPS, D.I.F.I, triagem de sinais de alerta) e só então o convite. Nomear a dor concreta de cada público, provar com processo e nunca prometer cura.",
        audiences: ALIVIA_AUDIENCES,
      });
      if (error) {
        console.error("[studio-pro] seed alivia brand", error);
        return;
      }
      await load();
    })();
  }, [loading, accessLoading, user, access.isVip, brands.length, load]);

  /**
   * Reparo dos mundos oficiais: a interpretação por IA podia sobrescrever ou
   * duplicar os públicos da marca Aliv.iA (surgiram "Fisioterapeutas Autônomos",
   * "Clínicas de Fisioterapia" etc., virando 7 abas onde só existem 4 nichos).
   * Aqui a marca oficial volta a ter exatamente os 4 nichos + o sub-nicho do
   * recém-formado, preservando o texto refinado de cada um.
   */
  const repaired = useRef(false);
  useEffect(() => {
    if (loading || !user || repaired.current) return;
    const official = brands.find((b) => b.content_source === "alivia");
    if (!official) return;
    const current = readAudiences(official.audiences);
    const canonical = ALIVIA_AUDIENCES.map((a) => {
      const found = current.find((c) => c.id === a.id);
      return found ? { ...a, ...found, label: a.label } : a;
    });
    const same =
      current.length === canonical.length &&
      current.every((c, i) => c.id === canonical[i].id && c.label === canonical[i].label);
    if (same) return;
    repaired.current = true;
    void (async () => {
      const { error } = await supabase
        .from("studio_brands")
        .update({ audiences: writeAudiences(canonical) })
        .eq("id", official.id);
      if (error) {
        console.error("[studio-pro] repair alivia audiences", error);
        return;
      }
      await load();
    })();
  }, [loading, user, brands, load]);


  const createBrand = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error("Dê um nome para a marca.");
      return;
    }
    if (brands.length >= access.brandLimit) {
      toast.error(`Seu plano permite ${access.brandLimit} marca(s). Faça upgrade para adicionar mais.`);
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("studio_brands")
      .insert({
        user_id: user.id,
        name: form.name.trim(),
        niche: form.niche.trim() || null,
        tone: form.tone.trim() || null,
        logo_url: form.logo_url.trim() || null,
        colors: writeColorKit(colorKit),
      })
      .select("id")
      .maybeSingle();
    setSaving(false);
    if (error) {
      console.error("[studio-pro] insert brand", error);
      toast.error("Não foi possível salvar a marca.");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    toast.success("Kit de marca salvo.");
    await load();
    if (data?.id) navigate(`${PRODUCT.base}/app/marca/${data.id}`);
  };

  const removeBrand = async (id: string) => {
    const { error } = await supabase.from("studio_brands").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    setBrands((prev) => prev.filter((b) => b.id !== id));
  };

  const available = access.unlimited
    ? Infinity
    : credits
      ? credits.free_credits + credits.plan_credits + credits.extra_credits - credits.used_this_period
      : 0;

  const visible = brands.filter((b) =>
    (b.name + " " + (b.niche ?? "")).toLowerCase().includes(query.trim().toLowerCase()),
  );

  if (authLoading || loading || accessLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={PRODUCT.base}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {PRODUCT.wordmark}
          </Link>
          {access.isVip && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link to={`${PRODUCT.base}/app/vip`}>
                <Crown className="mr-1.5 h-4 w-4" />
                Acessos cortesia
              </Link>
            </Button>
          )}
        </div>

        {/* Plano + saldo */}
        <section className="mt-5 rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Artes disponíveis
              </p>
              <p className="mt-1 text-3xl font-black tracking-tight">
                {access.unlimited ? "∞" : Math.max(available as number, 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {access.isVip
                  ? "Acesso VIP — nível agência, 15 marcas, sem cota e sem cobrança."
                  : access.granted
                    ? "Acesso cortesia — plano Solo liberado por convite, sem cobrança."
                    : access.plan === "free"
                      ? `Cortesia de boas-vindas: ${PRODUCT.freeCredits} artes com marca d'água discreta.`
                      : `Plano ${access.plan} ativo.`}
              </p>
            </div>
            {access.granted && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Gift className="h-3.5 w-3.5" />
                Acesso cortesia — plano Solo
              </span>
            )}
            {!access.unlimited && !access.granted && access.plan === "free" && (
              <Button asChild className="rounded-full">
                <Link to={`${PRODUCT.base}#planos`}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Ver planos
                </Link>
              </Button>
            )}
          </div>
        </section>

        {/* Marcas */}
        <section className="mt-5 rounded-3xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Palette className="h-5 w-5 text-primary" />
              Minhas marcas
              <span className="text-sm font-normal text-muted-foreground">
                {brands.length}/{access.brandLimit}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {brands.length > 4 && (
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Buscar marca"
                    className="h-9 w-40 pl-8"
                  />
                </div>
              )}
              <Button
                size="sm"
                className="rounded-full"
                onClick={() => setShowForm((v) => !v)}
                disabled={brands.length >= access.brandLimit}
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Nova marca
              </Button>
            </div>
          </div>

          {brands.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              Nenhuma marca ainda. Cadastre a primeira: nome, nicho, tom de voz e a cor principal já
              bastam para o estúdio começar a criar no seu DNA visual. Cada marca fica em uma pasta
              separada — nada se mistura.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {visible.map((brand) => (
                <li
                  key={brand.id}
                  className="group relative rounded-2xl border border-border bg-muted/40 p-4 transition hover:border-primary/50"
                >
                  <Link to={`${PRODUCT.base}/app/marca/${brand.id}`} className="flex items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border text-sm font-black text-white"
                      style={{ background: brand.colors?.primary ?? "hsl(var(--primary))" }}
                    >
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        brand.name.charAt(0).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{brand.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {brand.niche || "nicho não informado"} · {counts[brand.id] ?? 0} arte(s)
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2 h-7 w-7 p-0 opacity-0 transition group-hover:opacity-100"
                    onClick={() => removeBrand(brand.id)}
                    title="Remover marca"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {(showForm || brands.length === 0) && (
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
              <BrandColorFields idPrefix="brand" kit={colorKit} onChange={setColorKit} />
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
              <Button onClick={createBrand} disabled={saving} className="rounded-full sm:col-span-2">
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Salvar kit de marca
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default StudioProApp;
