import { useRef, useState } from "react";
import { Crop, Loader2, Pin, Sparkles, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import StudioPhotoEditor from "./StudioPhotoEditor";
import PhotoFrame from "./blocks/PhotoFrame";
import { PHOTO_USAGES, type PhotoFraming, type PhotoPatch, type PhotoUsage, type StudioPhoto } from "./photos";
import { isOfficialPhoto } from "./officialPhotos";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";

/** Leitura de imagem por IA: exclusiva da conta do dono (gasta crédito de IA). */
const OWNER_EMAILS = ["gvallimoliveira@gmail.com", "gvallim.fisio@gmail.com"];

/** Junta os temas lidos à legenda, sem duplicar uma leitura anterior. */
export const mergeAiThemes = (caption: string, themes: string[], summary: string): string => {
  const base = caption.replace(/\s*Temas:[^\n]*$/i, "").trim();
  const lead = base || summary.trim();
  return [lead, themes.length ? `Temas: ${themes.join(", ")}` : ""].filter(Boolean).join(" ").trim();
};

type Props = {
  photos: StudioPhoto[];
  loading: boolean;
  onUpload: (file: File, meta: { label: string; usage: PhotoUsage; credit?: string; description?: string }) => Promise<unknown>;
  onEdit: (id: string, patch: PhotoPatch) => Promise<void>;
  onRemove: (photo: StudioPhoto) => Promise<void>;
  onClose: () => void;
  /** Teto de fotos do plano (Studio público). Sem valor = sem limite (interno). */
  limit?: number;
  /**
   * Fotos usadas na CONTA INTEIRA (soma de todas as marcas) — é isso que o teto
   * do plano compara. Sem valor, cai para o acervo visível da marca.
   */
  usedTotal?: number;
  /** Fotos fixadas para a geração atual (controle criativo). */
  pinnedIds?: string[];
  onTogglePin?: (id: string) => void;
};

/**
 * Painel do acervo de fotos: envia, rotula e remove. As fotos ficam na conta
 * (privadas) e alimentam os blocos fotográficos das artes.
 *
 * No Studio público o painel também mostra a cota do plano e permite FIXAR
 * fotos: com fotos fixadas, só elas entram nas artes — sempre respeitando o
 * nexo entre foto e assunto (nada de termografia em post de preço).
 */
const StudioPhotos = ({
  photos,
  loading,
  onUpload,
  onEdit,
  onRemove,
  onClose,
  limit,
  usedTotal,
  pinnedIds,
  onTogglePin,
}: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const canAiRead = OWNER_EMAILS.includes((user?.email ?? "").toLowerCase());
  const [reading, setReading] = useState<string | null>(null);
  const aiRead = async (photo: StudioPhoto) => {
    setReading(photo.id);
    try {
      const { data, error } = await supabase.functions.invoke("studio-photo-read", {
        body: { image: photo.src, caption: `${photo.label} ${photo.description}`.trim() },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Leitura falhou");
      const next = mergeAiThemes(photo.description, data.themes ?? [], data.summary ?? "");
      await onEdit(photo.id, { description: next });
      toast.success(data.themes?.length ? `Temas: ${data.themes.join(", ")}` : "Legenda atualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível ler a imagem");
    } finally {
      setReading(null);
    }
  };
  const [usage, setUsage] = useState<PhotoUsage>("livre");
  const [label, setLabel] = useState("");
  /** Descrição breve: o que a imagem mostra e onde deve ser usada. */
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  /** Foto aberta no editor de enquadramento (recorte, rotação, área segura). */
  const [editing, setEditing] = useState<StudioPhoto | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<StudioPhoto | null>(null);
  const [removing, setRemoving] = useState(false);
  const handleRemove = async () => {
    if (!pendingRemoval || removing) return;
    setRemoving(true);
    try {
      await onRemove(pendingRemoval);
      setPendingRemoval(null);
      toast.success("Foto removida do acervo");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível remover a foto. Tente novamente.");
    } finally {
      setRemoving(false);
    }
  };
  /** Arquivos escolhidos e ainda não enviados (miniatura + informações). */
  const [staged, setStaged] = useState<{ file: File; preview: string }[]>([]);
  /** IDs das fotos enviadas nesta sessão — sobem para o topo da lista. */
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const hasLimit = typeof limit === "number";
  /** O teto do plano é da CONTA: soma as fotos de todas as marcas. */
  const uploadedCount = photos.filter((photo) => !isOfficialPhoto(photo)).length;
  const officialCount = photos.length - uploadedCount;
  const used = typeof usedTotal === "number" ? Math.max(usedTotal, uploadedCount) : uploadedCount;
  const remaining = hasLimit ? Math.max(0, (limit as number) - used) : Infinity;
  const full = hasLimit && remaining === 0;
  const pinned = new Set(pinnedIds ?? []);

  /**
   * Ordem do acervo: fixadas primeiro, depois as recém-enviadas (mais nova
   * primeiro) e por fim o restante, do mais recente para o mais antigo.
   */
  const ordered = [...photos].reverse().sort((a, b) => {
    const rank = (p: StudioPhoto) => (pinned.has(p.id) ? 0 : recentIds.includes(p.id) ? 1 : 2);
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    if (rank(a) === 1) return recentIds.indexOf(a.id) - recentIds.indexOf(b.id);
    return 0;
  });

  const pickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (hasLimit && staged.length + list.length > remaining) {
      toast.error(
        remaining === 0
          ? `Seu plano permite ${limit} fotos no acervo. Remova alguma ou faça upgrade.`
          : `Restam ${remaining} vaga(s) no acervo do seu plano.`,
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setStaged((prev) => [...prev, ...list.map((file) => ({ file, preview: URL.createObjectURL(file) }))]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const dropStaged = (index: number) => {
    setStaged((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const handleUpload = async () => {
    if (staged.length === 0) return;
    if (description.trim().length < 12) {
      toast.error("Descreva o que aparece e em quais assuntos a foto pode ser usada.");
      return;
    }
    setBusy(true);
    try {
      const created: string[] = [];
      for (const item of staged) {
        const saved = (await onUpload(item.file, {
          label: label.trim() || item.file.name.replace(/\.[^.]+$/, ""),
          usage,
          description: description.trim() || undefined,
        })) as StudioPhoto | undefined;
        if (saved && typeof saved === "object" && "id" in saved) created.push(saved.id);
        URL.revokeObjectURL(item.preview);
      }
      setRecentIds((prev) => [...created.reverse(), ...prev]);
      setStaged([]);
      setLabel("");
      setDescription("");
      toast.success(staged.length > 1 ? `${staged.length} fotos enviadas` : "Foto enviada");
    } catch (error) {
      console.error("[studio] upload falhou", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-3 backdrop-blur-sm md:items-center">
      <div className="max-h-[85svh] w-full max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Fotos do Studio</h2>
            <p className="text-[11px] text-muted-foreground">
              Privadas da sua conta. Entram nas artes de retrato, split e tipografia.
            </p>
            {hasLimit && (
              <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                {used} de {limit} fotos do seu plano
                {typeof usedTotal === "number" ? ` · ${uploadedCount} enviada(s) nesta marca` : ""}
              </p>
            )}
            {officialCount > 0 && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                + {officialCount} imagens oficiais Aliv.iA — não consomem sua cota
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border p-1.5 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {onTogglePin && (
          <p className="mb-3 rounded-2xl border border-border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            {pinned.size === 0
              ? "Fixe fotos no alfinete para forçar o motor a usar só elas nesta geração."
              : `${pinned.size} foto(s) fixada(s): só elas entram nas artes, cada uma no assunto com o qual combina.`}
          </p>
        )}

        <div className="mb-4 rounded-2xl border border-border bg-background p-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => pickFiles(e.target.files)}
          />

          <button
            type="button"
            disabled={busy || full || limit === 0}
            onClick={() => fileRef.current?.click()}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-[12px] font-semibold text-foreground disabled:opacity-60"
          >
            <Upload className="h-4 w-4" />
            {full ? "Acervo cheio" : staged.length > 0 ? "Escolher outra imagem" : "1. Escolher imagem"}
          </button>

          {staged.length > 0 && (
            <>
              <ul className="mb-2 flex flex-wrap gap-2">
                {staged.map((item, index) => (
                  <li key={item.preview} className="relative">
                    <img
                      src={item.preview}
                      alt={item.file.name}
                      className="h-20 w-20 rounded-2xl border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => dropStaged(index)}
                      title="Descartar esta imagem"
                      className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-card p-1 text-muted-foreground shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>

              <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
                2. Preencha as informações desta(s) imagem(ns)
              </p>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Rótulo (ex. Guilherme, fundador)"
                className="mb-2 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground"
              />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Obrigatório: o que aparece e em quais assuntos usar (ex. cachorro coçando a orelha — usar em posts de otite e citologia auricular)"
                className="mb-2 w-full resize-none rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground"
              />
              <div className="mb-2 flex flex-wrap gap-1.5">
                {PHOTO_USAGES.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setUsage(u.id)}
                    title={u.hint}
                    className={`rounded-full border border-border px-2.5 py-1 text-[10px] font-medium ${
                      usage === u.id ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    }`}
                  >
                    {u.label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={busy || description.trim().length < 12}
                onClick={() => void handleUpload()}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {busy ? "Enviando…" : staged.length > 1 ? `3. Enviar ${staged.length} fotos` : "3. Enviar foto"}
              </button>
            </>
          )}

          <p className="mt-2 text-[10px] text-muted-foreground">
            Até 15 MB por arquivo (JPG ou PNG). Fotos muito grandes são otimizadas no envio.
          </p>
          {limit === 0 && (
            <p className="mt-1 text-[11px] font-semibold text-foreground">
              O acervo de fotos faz parte dos planos assinados. Assine para enviar as suas.
            </p>
          )}
          {full && limit !== 0 && (
            <p className="mt-1 text-[11px] font-semibold text-foreground">
              Você atingiu o limite do plano. Remova uma foto ou faça upgrade para ampliar o acervo.
            </p>
          )}
        </div>



        {loading ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground">Carregando acervo…</p>
        ) : photos.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground">
            Nenhuma foto ainda. Envie um retrato para liberar os blocos fotográficos.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5">
            {ordered.map((photo) => (
              (() => {
                const official = isOfficialPhoto(photo);
                return (
              <li
                key={photo.id}
                className={`overflow-hidden rounded-2xl border bg-background ${
                  pinned.has(photo.id) ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                <div className="relative">
                  <PhotoFrame photo={photo} className="h-32 w-full" />
                  {official && (
                    <span className="absolute left-1.5 top-1.5 rounded-full border border-border bg-card px-2 py-1 text-[9px] font-semibold text-foreground shadow-sm">
                      Oficial Aliv.iA
                    </span>
                  )}
                  {onTogglePin && (
                    <button
                      type="button"
                      onClick={() => onTogglePin(photo.id)}
                      title={pinned.has(photo.id) ? "Desfixar desta geração" : "Usar esta foto nesta geração"}
                      className={`absolute right-1.5 top-1.5 rounded-full border p-1.5 shadow-sm ${
                        pinned.has(photo.id)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="min-w-0 p-2">
                  <input
                    defaultValue={photo.label}
                    disabled={official}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value !== photo.label) void onEdit(photo.id, { label: value });
                    }}
                    className="mb-1.5 w-full rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                  />
                  <textarea
                    key={photo.description}
                    defaultValue={photo.description}
                    disabled={official}
                    rows={2}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value !== photo.description) void onEdit(photo.id, { description: value });
                    }}
                    placeholder="O que aparece e em quais assuntos usar"
                    className="mb-1.5 w-full resize-none rounded-md border border-border bg-card px-2 py-1 text-[10px] leading-snug text-foreground"
                  />
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    <select
                      value={photo.usage}
                      disabled={official}
                      onChange={(e) => void onEdit(photo.id, { usage: e.target.value as PhotoUsage })}
                      className="h-10 w-full min-w-0 rounded-md border border-border bg-card px-1.5 py-1 text-base text-muted-foreground md:text-[10px]"
                    >
                      {PHOTO_USAGES.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>

                    <div className="flex w-full flex-wrap justify-end gap-1">
                    {canAiRead && !official && (
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => void aiRead(photo)}
                        disabled={reading === photo.id}
                        title="Ler a imagem com IA e completar os temas da legenda"
                        className="shrink-0 text-primary"
                      >
                        {reading === photo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      type="button"
                      onClick={() => setEditing(photo)}
                      title="Enquadrar (recorte, rotação, área segura)"
                      className="shrink-0 text-muted-foreground"
                    >
                      <Crop className="h-3.5 w-3.5" />
                    </Button>
                    {!official && (
                      <Button
                        variant="outline"
                        size="icon"
                        type="button"
                        onClick={() => setPendingRemoval(photo)}
                        title="Remover foto"
                        aria-label={`Remover foto ${photo.label}`}
                        className="shrink-0 text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    </div>
                  </div>
                </div>
              </li>
                );
              })()
            ))}
          </ul>
        )}
      </div>

      <AlertDialog open={pendingRemoval !== null} onOpenChange={(open) => { if (!open && !removing) setPendingRemoval(null); }}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover foto do acervo?</AlertDialogTitle>
            <AlertDialogDescription className="break-words">
              A foto “{pendingRemoval?.label || "Sem rótulo"}” não será usada nas próximas gerações. As artes já salvas serão mantidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={removing} onClick={() => void handleRemove()}>
              {removing ? <Loader2 className="animate-spin" /> : <Trash2 />}
              {removing ? "Removendo…" : "Remover foto"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {editing && (
        <StudioPhotoEditor
          photo={editing}
          onSave={(id, framing: PhotoFraming) => onEdit(id, framing)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
};

export default StudioPhotos;
