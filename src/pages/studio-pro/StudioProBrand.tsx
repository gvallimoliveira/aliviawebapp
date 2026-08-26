import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, FolderPlus, Images, Loader2, Save, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRODUCT } from "./product";
import { useStudioAccess } from "./useStudioAccess";

/**
 * ESPAÇO DE UMA MARCA
 *
 * A marca ativa vive na URL (`/studio-pro/app/marca/:brandId`) e a aba no
 * query param `?aba=` — persiste ao minimizar ou trocar de app. Toda consulta
 * de artes é filtrada por `brand_id`: material de marcas diferentes nunca se
 * mistura. Dentro da marca, pastas (`folder`) organizam por cliente/tema.
 */

type Brand = {
  id: string;
  name: string;
  niche: string | null;
  tone: string | null;
  logo_url: string | null;
  colors: Record<string, string> | null;
};

type Creation = {
  id: string;
  headline: string | null;
  caption: string | null;
  thumb: string | null;
  format: string | null;
  folder: string;
  created_at: string;
};

type Tab = "artes" | "ajustes";

const StudioProBrand = () => {
  const { brandId } = useParams<{ brandId: string }>();
  const { user, loading: authLoading } = useAuth();
  const { access, loading: accessLoading } = useStudioAccess();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("aba") as Tab) || "artes";
  const folder = params.get("pasta") || "Todas";

  const [brands, setBrands] = useState<Brand[]>([]);
  const [creations, setCreations] = useState<Creation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", niche: "", tone: "", primary: "#0F766E", logo_url: "" });

  const brand = brands.find((b) => b.id === brandId) ?? null;

  useEffect(() => {
    if (!authLoading && !user) navigate(`${PRODUCT.base}/entrar`, { replace: true });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    document.title = brand ? `${brand.name} — ${PRODUCT.name}` : `${PRODUCT.name}`;
  }, [brand]);

  const load = useCallback(async () => {
    if (!user || !brandId) return;
    setLoading(true);
    const [{ data: brandRows, error: brandError }, { data: artRows, error: artError }] = await Promise.all([
      supabase.from("studio_brands").select("*").order("created_at", { ascending: false }),
      // Isolamento: só artes desta marca.
      supabase
        .from("studio_creations")
        .select("id, headline, caption, thumb, format, folder, created_at")
        .eq("brand_id", brandId)
        .order("created_at", { ascending: false }),
    ]);
    if (brandError) console.error("[studio-pro] brands", brandError);
    if (artError) console.error("[studio-pro] creations", artError);
    setBrands((brandRows as Brand[]) ?? []);
    setCreations((artRows as Creation[]) ?? []);
    setLoading(false);
  }, [user, brandId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (brand) {
      setForm({
        name: brand.name,
        niche: brand.niche ?? "",
        tone: brand.tone ?? "",
        primary: brand.colors?.primary ?? "#0F766E",
        logo_url: brand.logo_url ?? "",
      });
    }
  }, [brand?.id]);

  const folders = useMemo(() => {
    const set = new Set<string>(["Geral"]);
    creations.forEach((c) => set.add(c.folder || "Geral"));
    return Array.from(set);
  }, [creations]);

  const shown = folder === "Todas" ? creations : creations.filter((c) => (c.folder || "Geral") === folder);

  const setTab = (next: Tab) => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("aba", next);
    setParams(nextParams, { replace: true });
  };

  const setFolder = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next === "Todas") nextParams.delete("pasta");
    else nextParams.set("pasta", next);
    setParams(nextParams, { replace: true });
  };

  const saveBrand = async () => {
    if (!brandId) return;
    if (!form.name.trim()) {
      toast.error("A marca precisa de um nome.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("studio_brands")
      .update({
        name: form.name.trim(),
        niche: form.niche.trim() || null,
        tone: form.tone.trim() || null,
        logo_url: form.logo_url.trim() || null,
        colors: { primary: form.primary },
      })
      .eq("id", brandId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar.");
      return;
    }
    toast.success("Kit de marca atualizado.");
    void load();
  };

  const moveArt = async (id: string, target: string) => {
    const { error } = await supabase.from("studio_creations").update({ folder: target }).eq("id", id);
    if (error) {
      toast.error("Não foi possível mover a arte.");
      return;
    }
    setCreations((prev) => prev.map((c) => (c.id === id ? { ...c, folder: target } : c)));
  };

  const removeArt = async (id: string) => {
    const { error } = await supabase.from("studio_creations").delete().eq("id", id);
    if (error) {
      toast.error("Não foi possível remover.");
      return;
    }
    setCreations((prev) => prev.filter((c) => c.id !== id));
  };

  const newFolder = async () => {
    const name = window.prompt("Nome da nova pasta");
    if (!name?.trim()) return;
    setFolder(name.trim());
    toast.info("Pasta criada. Mova artes para ela pelo menu de cada arte.");
  };

  if (authLoading || accessLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!brand) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">Marca não encontrada.</p>
        <Button asChild className="rounded-full">
          <Link to={`${PRODUCT.base}/app`}>Voltar para minhas marcas</Link>
        </Button>
      </main>
    );
  }

  const accent = brand.colors?.primary ?? "hsl(var(--primary))";

  return (
    <main className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb + troca de marca */}
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to={`${PRODUCT.base}/app`} className="inline-flex items-center gap-1.5 hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Marcas
          </Link>
          <span>›</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                <span
                  className="h-4 w-4 rounded-full border border-border"
                  style={{ background: accent }}
                />
                {brand.name}
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {brands.map((b) => (
                <DropdownMenuItem
                  key={b.id}
                  onClick={() => navigate(`${PRODUCT.base}/app/marca/${b.id}?aba=${tab}`)}
                >
                  <span
                    className="mr-2 h-3 w-3 rounded-full border border-border"
                    style={{ background: b.colors?.primary ?? "hsl(var(--primary))" }}
                  />
                  {b.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span>›</span>
          <span>{tab === "artes" ? "Artes" : "Ajustes"}</span>
        </div>

        {/* Abas */}
        <div className="mt-4 flex gap-2">
          {([
            { id: "artes" as Tab, label: "Artes", icon: Images },
            { id: "ajustes" as Tab, label: "Ajustes da marca", icon: Settings2 },
          ]).map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              size="sm"
              variant={tab === id ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setTab(id)}
            >
              <Icon className="mr-1.5 h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {tab === "artes" && (
          <section
            className="mt-5 rounded-3xl border border-border bg-card p-6"
            style={{ borderTopColor: accent, borderTopWidth: 3 }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5">
                {["Todas", ...folders].map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={folder === f ? "secondary" : "ghost"}
                    className="h-8 rounded-full text-xs"
                    onClick={() => setFolder(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
              <Button size="sm" variant="outline" className="rounded-full" onClick={newFolder}>
                <FolderPlus className="mr-1.5 h-4 w-4" />
                Nova pasta
              </Button>
            </div>

            {shown.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Nenhuma arte nesta pasta ainda. As artes geradas para <strong>{brand.name}</strong> ficam
                aqui — separadas das outras marcas.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3 sm:grid-cols-3">
                {shown.map((art) => (
                  <li key={art.id} className="overflow-hidden rounded-2xl border border-border bg-muted/40">
                    {art.thumb ? (
                      <img src={art.thumb} alt={art.headline ?? "arte"} className="aspect-[4/5] w-full object-cover" />
                    ) : (
                      <div className="flex aspect-[4/5] w-full items-center justify-center text-xs text-muted-foreground">
                        sem miniatura
                      </div>
                    )}
                    <div className="p-3">
                      <p className="line-clamp-2 text-xs font-semibold">{art.headline ?? "Sem título"}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {art.folder || "Geral"} · {art.format ?? "post"}
                      </p>
                      <div className="mt-2 flex items-center gap-1">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]">
                              Mover
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            {folders.map((f) => (
                              <DropdownMenuItem key={f} onClick={() => moveArt(art.id, f)}>
                                {f}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => removeArt(art.id)}
                          title="Remover arte"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === "ajustes" && (
          <section className="mt-5 grid gap-3 rounded-3xl border border-border bg-card p-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="edit-name">Nome da marca</Label>
              <Input id="edit-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-niche">Nicho</Label>
              <Input id="edit-niche" value={form.niche} onChange={(e) => setForm({ ...form, niche: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="edit-color">Cor principal</Label>
              <Input
                id="edit-color"
                type="color"
                value={form.primary}
                onChange={(e) => setForm({ ...form, primary: e.target.value })}
                className="h-10 p-1"
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edit-tone">Tom de voz</Label>
              <Textarea
                id="edit-tone"
                rows={2}
                value={form.tone}
                onChange={(e) => setForm({ ...form, tone: e.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="edit-logo">URL do logo</Label>
              <Input
                id="edit-logo"
                value={form.logo_url}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
              />
            </div>
            <Button onClick={saveBrand} disabled={saving} className="rounded-full sm:col-span-2">
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Salvar alterações
            </Button>
            {access.isVip && (
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Acesso VIP: nível agência, até {access.brandLimit} marcas, sem cota.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
};

export default StudioProBrand;
