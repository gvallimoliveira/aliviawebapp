/**
 * EDIÇÃO DE ARTE JÁ SALVA (galeria da marca)
 *
 * Regra de ouro: editar NÃO gera arte nova. O editor abre o instantâneo
 * guardado no momento em que a arte foi salva (`snapshot`) — o mesmo HTML, com
 * o mesmo texto, blocos, cores e assinatura. A partir dele o dono da marca
 * pode:
 *   1. reescrever qualquer frase direto na arte;
 *   2. trocar o formato de saída (Livre, 1:1, 4:5, Story 9:16), reenquadrando a
 *      arte original — nada é recomposto nem cortado;
 *   3. regravar o PNG de publicação e a miniatura NA MESMA arte da galeria.
 *
 * Artes salvas antes desta atualização não têm instantâneo: nelas a edição fica
 * bloqueada, porque reconstruir pela receita devolvia outra arte.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Loader2, Move, PencilLine, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { publicationPixelRatio, renderNodeToBlob, type StudioFormat } from "@/studio-core";
import {
  applyArtTextSizes,
  applyArtText,
  captureArtTextEditSnapshot,
  restoreArtTextEditSnapshot,
  readArtText,
  setArtEditing,
  type ArtTextEditSnapshot,
  type ArtTextEdits,
} from "@/pages/studio/artTextEdit";
import { applyArtMoves, clearArtMoves, setArtMoving } from "@/pages/studio/artTextMove";
import { forgetArtLearning, learnArtMoves } from "@/pages/studio/artMoveLearning";
import { hasBannedJargon } from "@/pages/studio/persuasion";
import { diffArtText } from "@/pages/studio/copyLearning";
import { useCopyLearning } from "./useCopyLearning";
import {
  isArtSnapshot,
  loadArtSnapshot,
  saveArtSnapshotHtml,
  serializeArtNode,
  snapshotStyle,
  type ArtSnapshot,
  type ArtSnapshotSlide,
} from "./artSnapshot";
import type { ArtRenderBrand } from "./artRender";
import { reflowStaticArtwork } from "@/pages/studio/AutoFit";
import PhotoShadeControl from "@/pages/studio/PhotoShadeControl";
import { applyPhotoShade, readPhotoShade } from "@/pages/studio/photoLight";

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
  /** Instantâneo da arte pronta; ausente nas artes salvas antes do editor. */
  snapshot?: unknown;
};

type Props = {
  brand: ArtRenderBrand;
  art: EditableArt;
  onClose: () => void;
  onSaved: () => void;
};

const FORMATS: { id: StudioFormat; label: string }[] = [
  { id: "free", label: "Livre" },
  { id: "1x1", label: "Post 1:1" },
  { id: "4x5", label: "Post 4:5" },
  { id: "9x16", label: "Story 9:16" },
];

const isFormat = (value: string | null | undefined): value is StudioFormat =>
  value === "free" || value === "1x1" || value === "4x5" || value === "9x16";

/** Proporção da moldura de saída. "Livre" mantém a proporção original da arte. */
const frameRatio = (format: StudioFormat, slide: ArtSnapshotSlide) => {
  if (format === "1x1") return 1;
  if (format === "4x5") return 4 / 5;
  if (format === "9x16") return 9 / 16;
  return (slide.width || 1080) / (slide.height || 1350);
};

/** Um slide salvo recomposto dentro de toda a proporção escolhida. */
const SnapshotSlide = ({
  html,
  slide,
  format,
  domId,
}: {
  html: string;
  slide: ArtSnapshotSlide;
  format: StudioFormat;
  domId: string;
}) => {
  const frame = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const reflow = () => {
      const stage = el.querySelector<HTMLElement>(`#${CSS.escape(domId)}`);
      if (stage) reflowStaticArtwork(stage);
    };
    const first = window.requestAnimationFrame(() => window.requestAnimationFrame(reflow));
    const ro = new ResizeObserver(reflow);
    ro.observe(el);
    return () => {
      window.cancelAnimationFrame(first);
      ro.disconnect();
    };
  }, [domId, format, html]);

  const ratio = frameRatio(format, slide);

  return (
    <div
      ref={frame}
      className="relative w-full overflow-hidden rounded-2xl border border-border"
      style={{ aspectRatio: `${ratio}`, background: "hsl(var(--background))" }}
    >
      <div
        id={domId}
        // A estrutura salva recebe as dimensões do novo quadro e reorganiza os
        // blocos relativos à moldura, em vez de ser tratada como uma imagem.
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
};

const StudioArtEditor = ({ brand, art, onClose, onSaved }: Props) => {
  const snapshot = useMemo<ArtSnapshot | null>(
    () => (isArtSnapshot(art.snapshot) ? art.snapshot : null),
    [art.snapshot],
  );
  const [format, setFormat] = useState<StudioFormat>(
    isFormat(art.format) ? art.format : snapshot && isFormat(snapshot.format) ? snapshot.format : "1x1",
  );
  const [htmls, setHtmls] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);
  /** Modo de arrastar texto pela alça (não pelo corpo do texto). */
  const [moving, setMoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoShades, setPhotoShades] = useState<Record<number, number>>({});
  const editBefore = useRef<Record<number, ArtTextEditSnapshot>>({});
  const textBeforeEdit = useRef<Record<number, ArtTextEdits>>({});
  const learning = useCopyLearning(brand.id);

  /** HTML de cada slide, baixado do instantâneo salvo. */
  useEffect(() => {
    if (!snapshot) return;
    let alive = true;
    (async () => {
      const loaded = await loadArtSnapshot(snapshot);
      if (alive) {
        const levels: Record<number, number> = {};
        loaded.forEach((html, pos) => {
          const holder = document.createElement("div");
          holder.innerHTML = html;
          levels[pos] = readPhotoShade(holder);
        });
        setPhotoShades(levels);
        setHtmls(loaded);
      }
    })();
    return () => {
      alive = false;
    };
  }, [snapshot]);

  const stageOf = (pos: number) => document.getElementById(`studio-art-edit-${pos}`) as HTMLElement | null;
  const frameOf = (pos: number) => stageOf(pos)?.parentElement ?? null;

  useEffect(() => {
    (htmls ?? []).forEach((_, pos) => {
      const node = stageOf(pos);
      if (node) {
        applyArtTextSizes(node);
        if (photoShades[pos] !== undefined) applyPhotoShade(node, photoShades[pos]);
      }
    });
  }, [htmls, format, photoShades]);

  const startEdit = () => {
    stopMove(false);
    (htmls ?? []).forEach((_, pos) => {
      const node = stageOf(pos);
      if (node) {
        textBeforeEdit.current[pos] = readArtText(node);
        editBefore.current[pos] = captureArtTextEditSnapshot(node);
        setArtEditing(node, true);
      }
    });
    setEditing(true);
  };

  /** Liga o arraste por alça em todos os slides abertos. */
  const startMove = () => {
    (htmls ?? []).forEach((_, pos) => {
      const node = stageOf(pos);
      if (!node) return;
      setArtEditing(node, false);
      setArtMoving(node, true);
    });
    setEditing(false);
    setMoving(true);
  };

  /** Desliga o arraste; `reset` devolve toda frase à posição original. */
  const stopMove = (reset: boolean) => {
    (htmls ?? []).forEach((_, pos) => {
      const node = stageOf(pos);
      if (!node) return;
      if (reset) {
        clearArtMoves(node);
        forgetArtLearning(node);
      } else {
        // A galeria exibe HTML já salvo: além de ensinar o motor, mantenha o
        // deslocamento nesta cópia até “Salvar alterações”.
        learnArtMoves(node, { preserveCurrentMove: true });
      }
      setArtMoving(node, false);
    });
    setMoving(false);
    toast.success(
      reset
        ? "Textos voltaram para a posição original (aprendizado apagado)."
        : "Posição fixada — o motor vai usar esse ponto nas próximas artes.",
    );
  };


  const stopEdit = (keep: boolean) => {
    const slides = htmls ?? [];
    const snapshots: Record<number, ArtTextEdits> = {};
    for (let pos = 0; pos < slides.length; pos += 1) {
      const node = stageOf(pos);
      if (!node) continue;
      if (keep) {
        const next = readArtText(node);
        const values = Object.values(next);
        // Campo esvaziado de propósito sai da arte (fica invisível), sem erro.

        const jargon = values.find((t) => hasBannedJargon(t));
        if (jargon) {
          toast.error("Essa frase usa jargão de marketing. Escreva como você falaria com o paciente.");
          return;
        }
        snapshots[pos] = next;
      }
      setArtEditing(node, false);
      if (!keep) {
        const before = editBefore.current[pos];
        if (before) restoreArtTextEditSnapshot(node, before);
      }
      delete editBefore.current[pos];
    }
    setEditing(false);
    if (keep) {
      const lessons = Object.entries(snapshots).flatMap(([pos, text]) =>
        diffArtText(textBeforeEdit.current[Number(pos)], text),
      );
      if (lessons.length > 0) void learning.learn(lessons);
      // Nada a reaplicar: o texto já vive no HTML editado na tela.
      Object.entries(snapshots).forEach(([pos, texts]) => {
        const node = stageOf(Number(pos));
        if (node) applyArtText(node, texts);
      });
    }
    Object.keys(textBeforeEdit.current).forEach((key) => delete textBeforeEdit.current[Number(key)]);
  };

  /** Regrava PNG, miniatura, texto e instantâneo NA MESMA arte da galeria. */
  const persist = async () => {
    if (!snapshot || !htmls) return;
    if (editing) {
      toast.error("Conclua o ajuste do texto antes de salvar.");
      return;
    }
    if (moving) {
      toast.error("Fixe a posição dos textos antes de salvar.");
      return;
    }
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      toast.error("Faça login novamente para salvar.");
      return;
    }
    setBusy(true);
    try {
      const serialized: string[] = [];
      const texts: Record<number, ArtTextEdits> = {};
      let thumb: string | null = null;
      let pngPath: string | null = null;
      const stamp = Date.now();

      for (let pos = 0; pos < htmls.length; pos += 1) {
        const stage = stageOf(pos);
        const frame = frameOf(pos);
        if (!stage || !frame) continue;
        texts[pos] = readArtText(stage);
        serialized.push(await serializeArtNode(stage));

        const rect = frame.getBoundingClientRect();
        if (pos === 0) {
          try {
            const thumbRatio = Math.max(1, Math.min(3, 900 / (rect.width || 900)));
            const blob = await renderNodeToBlob(frame, thumbRatio, "image/jpeg", 0.9);
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
          const ratio = publicationPixelRatio(rect.width, rect.height);
          const png = await renderNodeToBlob(frame, ratio, "image/png");
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

      const dimensions = htmls.map((_, pos) => {
        const frame = frameOf(pos);
        const rect = frame?.getBoundingClientRect();
        return {
          width: Math.round(rect?.width ?? snapshot.slides[pos]?.width ?? 1080),
          height: Math.round(rect?.height ?? snapshot.slides[pos]?.height ?? 1350),
        };
      });
      const nextSnapshot = await saveArtSnapshotHtml(snapshot, serialized, format, dimensions);
      const headline =
        (stageOf(0)?.querySelector("h1, h2, h3")?.textContent ?? "").trim().slice(0, 140) || art.headline;

      const { error } = await supabase
        .from("studio_creations")
        .update({
          format,
          headline,
          text_edits: texts,
          snapshot: JSON.parse(JSON.stringify(nextSnapshot)),
          ...(thumb ? { thumb } : {}),
          ...(pngPath ? { png_path: pngPath } : {}),
        })
        .eq("id", art.id);
      if (error) throw error;
      toast.success("Arte atualizada na galeria.");
      onSaved();
      onClose();
    } catch (error) {
      console.error("[studio-pro] update creation", error);
      toast.error("Não foi possível salvar as alterações desta arte.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-background/95 p-4 backdrop-blur">
      <div className="w-full max-w-3xl rounded-3xl border border-border bg-card p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Editar arte salva</p>
            <p className="text-[11px] text-muted-foreground">
              Esta é a arte original. Reescreva o texto nela e escolha o formato — sem gerar arte nova, sem
              gastar geração.
            </p>
          </div>
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose} title="Fechar">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {!snapshot ? (
          <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">
            Esta arte foi salva antes do editor da galeria, então o Studio não guardou a arte pronta — só a
            receita. Reabrir por receita devolveria outra arte, por isso a edição fica bloqueada aqui. Gere uma
            nova versão na aba <strong>Criar</strong> e salve: a partir dela a edição fica disponível.
          </p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {FORMATS.map((f) => (
                <Button
                  key={f.id}
                  size="sm"
                  variant={format === f.id ? "secondary" : "ghost"}
                  className="h-8 rounded-full text-xs"
                  disabled={editing}
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
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={!htmls}
                  onClick={startEdit}
                >
                  <PencilLine className="mr-1.5 h-3.5 w-3.5" />
                  Ajustar texto
                </Button>
              )}
              {/* MOVER TEXTO: arraste só pela alça de cada frase. */}
              {moving ? (
                <>
                  <Button size="sm" className="h-8 rounded-full text-xs" onClick={() => stopMove(false)}>
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                    Fixar posição
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-full text-xs"
                    onClick={() => stopMove(true)}
                  >
                    Posição original
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full text-xs"
                  disabled={!htmls}
                  onClick={startMove}
                >
                  <Move className="mr-1.5 h-3.5 w-3.5" />
                  Mover texto
                </Button>
              )}
              <Button
                size="sm"
                className="h-8 rounded-full text-xs"
                disabled={busy || !htmls}
                onClick={() => void persist()}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                )}
                Salvar alterações
              </Button>
            </div>

            {!htmls ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Abrindo a arte salva…
              </p>
            ) : (
              <div
                className={`mt-4 ${
                  htmls.length > 1
                    ? "flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
                    : "flex flex-col items-center"
                }`}
                style={snapshotStyle(snapshot)}
              >
                {htmls.map((html, pos) => (
                  <div
                    key={`${art.id}-${pos}`}
                    className={htmls.length > 1 ? "w-[280px] shrink-0 snap-center" : "w-full max-w-[480px]"}
                  >
                    <SnapshotSlide
                      html={html}
                      slide={snapshot.slides[pos]}
                      format={format}
                      domId={`studio-art-edit-${pos}`}
                    />
                    {(html.includes('data-studio-photo-background') || html.includes('data-studio-inserted-image')) &&
                      <PhotoShadeControl value={photoShades[pos] ?? readPhotoShade(stageOf(pos))} onChange={(value) => {
                        applyPhotoShade(stageOf(pos), value);
                        setPhotoShades((prev) => ({ ...prev, [pos]: value }));
                      }} />}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudioArtEditor;
