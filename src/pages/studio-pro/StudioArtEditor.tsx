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
import { Check, Loader2, PencilLine, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { renderNodeToBlob, type StudioFormat } from "@/studio-core";
import {
  applyArtText,
  readArtText,
  setArtEditing,
  type ArtTextEdits,
} from "@/pages/studio/artTextEdit";
import { hasBannedJargon } from "@/pages/studio/persuasion";
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

/**
 * Um slide do instantâneo dentro da moldura escolhida. A arte principal sempre
 * usa `contain`, portanto nenhum texto ou elemento é cortado. Quando a nova
 * proporção deixa sobra, uma segunda cópia ampliada da própria arte preenche o
 * fundo como textura — nunca uma faixa lisa ou uma cor genérica.
 */
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
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ratio = frameRatio(format, slide);
  const frameHeight = width ? width / ratio : 0;
  const artWidth = slide.width || 1080;
  const artHeight = slide.height || 1350;
  const contain = width ? Math.min(width / artWidth, frameHeight / artHeight) : 0;
  const cover = width ? Math.max(width / artWidth, frameHeight / artHeight) : 0;

  return (
    <div
      ref={frame}
      className="relative w-full overflow-hidden rounded-2xl border border-border"
      style={{ aspectRatio: `${ratio}`, background: "hsl(var(--background))" }}
    >
      {cover > contain && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden opacity-35 blur-xl"
        >
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: `${slide.width}px`,
              height: `${slide.height}px`,
              transform: `translate(-50%, -50%) scale(${cover * 1.04 || 0.001})`,
              transformOrigin: "center center",
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}
      <div
        id={domId}
        // A arte editável permanece inteira e acima da extensão texturizada.
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: `${slide.width}px`,
          height: `${slide.height}px`,
          transform: `translate(-50%, -50%) scale(${contain || 0.001})`,
          transformOrigin: "center center",
          zIndex: 1,
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
    isFormat(art.format) ? art.format : isFormat(snapshot?.format) ? (snapshot!.format as StudioFormat) : "1x1",
  );
  const [htmls, setHtmls] = useState<string[] | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  /** HTML de cada slide, baixado do instantâneo salvo. */
  useEffect(() => {
    if (!snapshot) return;
    let alive = true;
    (async () => {
      const loaded = await loadArtSnapshot(snapshot);
      if (alive) setHtmls(loaded);
    })();
    return () => {
      alive = false;
    };
  }, [snapshot]);

  const stageOf = (pos: number) => document.getElementById(`studio-art-edit-${pos}`) as HTMLElement | null;
  const frameOf = (pos: number) => stageOf(pos)?.parentElement ?? null;

  const startEdit = () => {
    (htmls ?? []).forEach((_, pos) => {
      const node = stageOf(pos);
      if (node) setArtEditing(node, true);
    });
    setEditing(true);
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
        if (values.some((t) => !t)) {
          toast.error("Há um texto vazio na arte. Preencha antes de concluir.");
          return;
        }
        const jargon = values.find((t) => hasBannedJargon(t));
        if (jargon) {
          toast.error("Essa frase usa jargão de marketing. Escreva como você falaria com o paciente.");
          return;
        }
        snapshots[pos] = next;
      }
      setArtEditing(node, false);
    }
    if (!keep && snapshot) {
      // Descarta o rascunho: recarrega o HTML original do instantâneo.
      void loadArtSnapshot(snapshot).then(setHtmls);
    }
    setEditing(false);
    if (keep) {
      // Nada a reaplicar: o texto já vive no HTML editado na tela.
      Object.entries(snapshots).forEach(([pos, texts]) => {
        const node = stageOf(Number(pos));
        if (node) applyArtText(node, texts);
      });
    }
  };

  /** Regrava PNG, miniatura, texto e instantâneo NA MESMA arte da galeria. */
  const persist = async () => {
    if (!snapshot || !htmls) return;
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
          const ratio = Math.max(1, Math.min(4, 1440 / (rect.width || 1440)));
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

      const nextSnapshot = await saveArtSnapshotHtml(snapshot, serialized, format);
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
