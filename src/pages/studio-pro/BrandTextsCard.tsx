import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createAuthorialText,
  deleteAuthorialText,
  fragmentsOf,
  listAuthorialTexts,
  updateAuthorialText,
  type AuthorialText,
} from "./authorial";

/**
 * ACERVO DE TEXTOS AUTORAIS (ajustes da marca)
 *
 * Só aparece em marcas autorais. Cada texto é uma obra inteira: o Studio
 * fragmenta por parágrafo (e por frase quando o parágrafo é longo demais para
 * um quadro), sempre respeitando a ordem. Uma arte nunca mistura obras.
 */
const BrandTextsCard = ({ brandId }: { brandId: string }) => {
  const [texts, setTexts] = useState<AuthorialText[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { title: string; body: string }>>({});

  const load = () => {
    setLoading(true);
    listAuthorialTexts(brandId)
      .then((rows) => {
        setTexts(rows);
        setDrafts(
          Object.fromEntries(rows.map((r) => [r.id, { title: r.title, body: r.body }])),
        );
      })
      .catch((error) => {
        console.error("[studio-pro] textos", error);
        toast.error("Não foi possível carregar os textos.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, [brandId]);

  const addText = async () => {
    setBusy("new");
    try {
      const created = await createAuthorialText(brandId, {
        title: "Novo texto",
        body: "",
        sortOrder: texts.length,
      });
      setTexts((prev) => [...prev, created]);
      setDrafts((prev) => ({ ...prev, [created.id]: { title: created.title, body: created.body } }));
    } catch (error) {
      console.error("[studio-pro] novo texto", error);
      toast.error("Não foi possível criar o texto.");
    } finally {
      setBusy(null);
    }
  };

  const saveText = async (id: string) => {
    const draft = drafts[id];
    if (!draft) return;
    setBusy(id);
    try {
      await updateAuthorialText(id, { title: draft.title, body: draft.body });
      setTexts((prev) => prev.map((t) => (t.id === id ? { ...t, ...draft } : t)));
      toast.success("Texto salvo.");
    } catch (error) {
      console.error("[studio-pro] salvar texto", error);
      toast.error("Não foi possível salvar o texto.");
    } finally {
      setBusy(null);
    }
  };

  const removeText = async (id: string) => {
    setBusy(id);
    try {
      await deleteAuthorialText(id);
      setTexts((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("[studio-pro] remover texto", error);
      toast.error("Não foi possível remover o texto.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">Meus textos</p>
          <p className="mt-0.5 max-w-lg text-xs text-muted-foreground">
            As artes desta marca usam exclusivamente estes textos e o slogan do kit. Cada texto é
            repartido em trechos na sua ordem — uma arte nunca mistura textos diferentes nem inverte a
            sequência.
          </p>
        </div>
        <Button size="sm" variant="outline" className="rounded-full" disabled={busy === "new"} onClick={() => void addText()}>
          {busy === "new" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
          Novo texto
        </Button>
      </div>

      {loading ? (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando…
        </p>
      ) : texts.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Nenhum texto ainda. Cole um texto seu e o Studio passa a diagramá-lo.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {texts.map((t) => {
            const draft = drafts[t.id] ?? { title: t.title, body: t.body };
            const pieces = fragmentsOf(draft.body).length;
            return (
              <li key={t.id} className="rounded-2xl border border-border bg-card p-3">
                <Label htmlFor={`text-title-${t.id}`} className="text-xs">
                  Título da obra (não aparece nas artes como frase)
                </Label>
                <Input
                  id={`text-title-${t.id}`}
                  value={draft.title}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [t.id]: { ...draft, title: e.target.value } }))
                  }
                />
                <Label htmlFor={`text-body-${t.id}`} className="mt-2 block text-xs">
                  Texto (separe os trechos com uma linha em branco)
                </Label>
                <Textarea
                  id={`text-body-${t.id}`}
                  rows={8}
                  value={draft.body}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [t.id]: { ...draft, body: e.target.value } }))
                  }
                />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    {pieces} {pieces === 1 ? "trecho" : "trechos"} — o carrossel usa todos em ordem.
                  </p>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      className="h-8 rounded-full text-xs"
                      disabled={busy === t.id}
                      onClick={() => void saveText(t.id)}
                    >
                      {busy === t.id ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 rounded-full text-xs text-destructive"
                      disabled={busy === t.id}
                      onClick={() => void removeText(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default BrandTextsCard;
