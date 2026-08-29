/**
 * EDIÇÃO DE ARTE JÁ SALVA (galeria da marca)
 *
 * A arte salva guarda a receita (`composition`), a seed, o público, o objetivo e
 * o texto exato que apareceu na tela (`text_edits`). Aqui ela é remontada para
 * que o dono da marca possa:
 *   1. reescrever qualquer frase direto na arte;
 *   2. trocar o formato de saída (Livre, 1:1, 4:5, Story 9:16);
 *   3. regravar o PNG de publicação e a miniatura da galeria.
 *
 * Tudo é local: nenhuma geração nova, nenhum crédito de IA consumido.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, PencilLine, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  STUDIO_BLOCKS,
  createRng,
  renderNodeToBlob,
  type ComposedBlock,
  type StudioFormat,
} from "@/studio-core";
import AutoFit from "@/pages/studio/AutoFit";
import ArtworkGuard from "@/pages/studio/ArtworkGuard";
import StudioProSignature from "./StudioProSignature";
import { useStudioPhotos } from "@/pages/studio/useStudioPhotos";
import {
  applyArtText,
  readArtText,
  setArtEditing,
  type ArtTextEdits,
} from "@/pages/studio/artTextEdit";
import { hasBannedJargon } from "@/pages/studio/persuasion";
import { useArtRender, type ArtRenderBrand } from "./artRender";
import type { ContentAngle } from "./audiences";

export type EditableArt = {
  id: string;
  seed: string;
  segment: string | null;
  angle: string | null;
  block_kind: string | null;
  format: string | null;
  headline: string | null;
  composition: unknown;
  png_path: string | null;
  text_edits: unknown;
};

type Props = {
  brand: ArtRenderBrand;
  art: EditableArt;
  onClose: () => void;
  onSaved: () => void;
};

const FRAME_STYLE: Record<StudioFormat, React.CSSProperties> = {
  "9x16": { width: "min(400px, 100%)", aspectRatio: "9/16" },
  "4x5": { width: "min(480px, 100%)", aspectRatio: "4/5" },
  "1x1": { width: "min(560px, 100%)", aspectRatio: "1/1" },
  free: { width: "100%" },
};

const FORMATS: { id: StudioFormat; label: string }[] = [
  { id: "free", label: "Livre" },
  { id: "1x1", label: "Post 1:1" },
  { id: "4x5", label: "Post 4:5" },
  { id: "9x16", label: "Story 9:16" },
];

const isFormat = (value: string | null): value is StudioFormat =>
  value === "free" || value === "1x1" || value === "4x5" || value === "9x16";

/** Recupera a seed da geração e os índices originais da arte na leva. */
const readRecipe = (art: EditableArt) => {
  const comp = Array.isArray(art.composition) ? (art.composition as ComposedBlock[]) : [];
  const carousel = art.seed.includes(":carrossel:");
  if (carousel) {
    const [base, , start] = art.seed.split(":carrossel:").length
      ? [art.seed.split(":carrossel:")[0], "carrossel", art.seed.split(":carrossel:")[1]]
      : [art.seed, "", "0"];
    const first = Number(start);
    const items = comp.map((block, pos) => ({ block, index: (Number.isFinite(first) ? first : 0) + pos }));
    return { seed: base, items, carousel: true };
  }
  const cut = art.seed.lastIndexOf(":");
  const base = cut > 0 ? art.seed.slice(0, cut) : art.seed;
  const index = cut > 0 ? Number(art.seed.slice(cut + 1)) : 0;
  const safeIndex = Number.isFinite(index) ? index : 0;
  const block = comp[safeIndex] ?? comp[0];
  return {
    seed: base,
    items: block ? [{ block, index: safeIndex }] : [],
    carousel: false,
  };
};

const readSavedText = (value: unknown): Record<number, ArtTextEdits> => {
  if (!value || typeof value !== "object") return {};
  const out: Record<number, ArtTextEdits> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, texts]) => {
    const pos = Number(key);
    if (!Number.isFinite(pos) || !texts || typeof texts !== "object") return;
    out[pos] = texts as ArtTextEdits;
  });
  return out;
};

const StudioArtEditor = ({ brand, art, onClose, onSaved }: Props) => {
  const recipe = useMemo(() => readRecipe(art), [art]);
  const [format, setFormat] = useState<StudioFormat>(isFormat(art.format) ? art.format : "1x1");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Texto vigente da arte por slide (parte do texto salvo, evolui com a edição). */
  const [texts, setTexts] = useState<Record<number, ArtTextEdits>>(() => readSavedText(art.text_edits));
  const scroller = useRef<HTMLDivElement>(null);

  const { photos } = useStudioPhotos(true, brand.id);
  const { content, persona, picker, themeStyle } = useArtRender({
    brand,
    seed: recipe.seed,
    segment: art.segment ?? "__global__",
    angle: (art.angle as ContentAngle) ?? "informar",
  });

  const signatureOn = brand.signature_enabled !== false;
  const nodeOf = (pos: number) =>
    document.getElementById(`studio-art-edit-${pos}`) as HTMLElement | null;

  /** Reaplica o texto salvo/editado sempre que a arte é redesenhada. */
  useEffect(() => {
    recipe.items.forEach((_, pos) => {
      const node = nodeOf(pos);
      if (node) applyArtText(node, texts[pos]);
    });
  }, [texts, recipe, format, content, photos.length]);

  const startEdit = () => {
    recipe.items.forEach((_, pos) => {
      const node = nodeOf(pos);
      if (node) setArtEditing(node, true);
    });
    setEditing(true);
  };

  const stopEdit = (keep: boolean) => {
    const collected: Record<number, ArtTextEdits> = {};
    for (let pos = 0; pos < recipe.items.length; pos += 1) {
      const node = nodeOf(pos);
      if (!node) continue;
      if (keep) {
        const next = readArtText(node);
        const values = Object.values(next);
        if (values.some((t) => !t)) {
          toast.error("Há um texto vazio na arte. Preencha antes de concluir.");
          return;
        }
        const jargon = values.find((t) => hasBannedJargon(t));
        if (jargon) {
          toast.error("Essa frase usa jargão de marketing. Escreva como você falaria com o paciente.");
          return;
        }
        collected[pos] = next;
      }
      setArtEditing(node, false);
      if (!keep) applyArtText(node, texts[pos]);
    }
    if (keep) setTexts((prev) => ({ ...prev, ...collected }));
    setEditing(false);
  };

  /** Regrava PNG de publicação, miniatura e texto da arte já salva. */
  const persist = async () => {
    if (editing) {
      toast.error("Conclua o ajuste do texto antes de salvar.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Faça login novamente para salvar.");
      return;
    }
    setBusy(true);
    let thumb: string | null = null;
    let pngPath: string | null = null;
    const stamp = Date.now();
    for (let pos = 0; pos < recipe.items.length; pos += 1) {
      const node = nodeOf(pos);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (pos === 0) {
        try {
          const thumbRatio = Math.max(1, Math.min(3, 900 / (rect.width || 900)));
          const blob = await renderNodeToBlob(node, thumbRatio, "image/jpeg", 0.9);
          thumb = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.warn("[studio-pro] edit thumb", error);
        }
      }
      try {
        const ratio = Math.max(1, Math.min(4, 1440 / (rect.width || 1440)));
        const png = await renderNodeToBlob(node, ratio, "image/png");
        const path = `${auth.user.id}/${brand.id}/edit-${art.id}-${stamp}-${String(pos + 1).padStart(2, "0")}.png`;
        const { error: upErr } = await supabase.storage
          .from("studio-art")
          .upload(path, png, { contentType: "image/png", upsert: true });
        if (upErr) throw upErr;
        if (pos === 0) pngPath = path;
      } catch (error) {
        console.warn("[studio-pro] edit png upload", error);
      }
    }
    const headline =
      (nodeOf(0)?.querySelector("h1, h2, h3")?.textContent ?? "").trim().slice(0, 140) || art.headline;
    const { error } = await supabase
      .from("studio_creations")
      .update({
        format,
        headline,
        text_edits: texts,
        ...(thumb ? { thumb } : {}),
        ...(pngPath ? { png_path: pngPath } : {}),
      })
      .eq("id", art.id);
    setBusy(false);
    if (error) {
      console.error("[studio-pro] update creation", error);
      toast.error("Não foi possível salvar as alterações desta arte.");
      return;
    }
    toast.success("Arte atualizada na galeria.");
    onSaved();
    onClose();
  };

  const hasSavedText = Object.keys(readSavedText(art.text_edits)).length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/95 p-4 backdrop-blur">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Editar arte salva</p>
            <p className="text-[11px] text-muted-foreground">
              Reescreva o texto na própria arte e escolha o formato. Edição local, sem gastar geração.
            </p>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose} title="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {FORMATS.map((f) => (
            <Button
              key={f.id}
              size="sm"
              variant={format === f.id ? "secondary" : "ghost"}
              className="h-8 rounded-full text-xs"
              onClick={() => setFormat(f.id)}
            >
              {f.label}
            </Button>
          ))}
          {editing ? (
            <>
              <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => stopEdit(true)}>
                <Check className="mr-1.5 h-3.5 w-3.5" />
                Concluir ajuste
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 rounded-full text-xs"
                onClick={() => stopEdit(false)}
              >
                Cancelar ajuste
              </Button>
            </>
          ) : (
            <Button size="sm" variant="outline" className="h-8 rounded-full text-xs" onClick={startEdit}>
              <PencilLine className="mr-1.5 h-3.5 w-3.5" />
              Ajustar texto
            </Button>
          )}
          <Button size="sm" className="h-8 rounded-full text-xs" disabled={busy} onClick={() => void persist()}>
            {busy ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Salvar alterações
          </Button>
        </div>

        {!hasSavedText && (
          <p className="mt-3 rounded-xl bg-muted/60 p-2 text-[11px] text-muted-foreground">
            Esta arte foi salva antes do editor da galeria: o motor recompôs o texto a partir da receita, então
            alguma frase pode aparecer diferente do PNG original. Ajuste e salve para fixar a versão final.
          </p>
        )}

        {recipe.items.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Esta arte não guardou a receita completa, então não é possível reabri-la para edição. Gere uma nova
            versão na aba Criar.
          </p>
        ) : (
          <div
            ref={scroller}
            className={`mt-4 ${recipe.carousel ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2" : "flex flex-col items-center"}`}
            style={themeStyle}
          >
            {recipe.items.map((item, pos) => {
              const { kind, treatment, slide } = item.block;
              const Block = STUDIO_BLOCKS[kind];
              if (!Block) return null;
              return (
                <div
                  key={`${kind}-${item.index}`}
                  className={`overflow-hidden rounded-2xl border border-border bg-background ${
                    format === "1x1" ? "studio-pro-square" : ""
                  } ${recipe.carousel ? "shrink-0 snap-center" : "mx-auto"}`}
                  style={FRAME_STYLE[format]}
                >
                  <div id={`studio-art-edit-${pos}`} className="h-full w-full">
                    <ArtworkGuard brand={brand.name}>
                      <AutoFit resetKey={`${art.id}:${format}:${kind}:${item.index}`}>
                        <StudioProSignature
                          artKey={`${brand.id}:${recipe.seed}:${kind}:${item.index}`}
                          enabled={signatureOn}
                          brandName={brand.name}
                        >
                          <Block
                            content={content}
                            rng={createRng(`${brand.id}:${recipe.seed}:${kind}:${item.index}`)}
                            treatment={treatment}
                            format={format}
                            picker={picker}
                            persona={persona}
                            slide={slide}
                            photos={photos}
                          />
                        </StudioProSignature>
                      </AutoFit>
                    </ArtworkGuard>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudioArtEditor;
