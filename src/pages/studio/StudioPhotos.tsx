import { useRef, useState } from "react";
import { Crop, Loader2, Pin, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import StudioPhotoEditor from "./StudioPhotoEditor";
import PhotoFrame from "./blocks/PhotoFrame";
import { PHOTO_USAGES, type PhotoFraming, type PhotoPatch, type PhotoUsage, type StudioPhoto } from "./photos";

type Props = {
  photos: StudioPhoto[];
  loading: boolean;
  onUpload: (file: File, meta: { label: string; usage: PhotoUsage; credit?: string }) => Promise<unknown>;
  onEdit: (id: string, patch: PhotoPatch) => Promise<void>;
  onRemove: (photo: StudioPhoto) => Promise<void>;
  onClose: () => void;
  /** Teto de fotos do plano (Studio público). Sem valor = sem limite (interno). */
  limit?: number;
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
  pinnedIds,
  onTogglePin,
}: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<PhotoUsage>("livre");
  const [label, setLabel] = useState("");
  /** Descrição breve: o que a imagem mostra e onde deve ser usada. */
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  /** Foto aberta no editor de enquadramento (recorte, rotação, área segura). */
  const [editing, setEditing] = useState<StudioPhoto | null>(null);

  const hasLimit = typeof limit === "number";
  const remaining = hasLimit ? Math.max(0, (limit as number) - photos.length) : Infinity;
  const full = hasLimit && remaining === 0;
  const pinned = new Set(pinnedIds ?? []);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    if (hasLimit && list.length > remaining) {
      toast.error(
        remaining === 0
          ? `Seu plano permite ${limit} fotos no acervo. Remova alguma ou faça upgrade.`
          : `Restam ${remaining} vaga(s) no acervo do seu plano.`,
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy(true);
    try {
      for (const file of list) {
        await onUpload(file, {
          label: label.trim() || file.name.replace(/\.[^.]+$/, ""),
          usage,
          description: description.trim() || undefined,
        });
      }
      setLabel("");
      setDescription("");
      toast.success(list.length > 1 ? `${list.length} fotos enviadas` : "Foto enviada");
    } catch (error) {
      console.error("[studio] upload falhou", error);
      toast.error(error instanceof Error ? error.message : "Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
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
                {photos.length} de {limit} fotos do seu plano
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
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Rótulo (ex. Guilherme, fundador)"
            className="mb-2 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Descrição breve: o que aparece e onde usar (ex. avaliação de força com dinamômetro — usar em posts de avaliação e evolução)"
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

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <button
            type="button"
            disabled={busy || full || limit === 0}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Enviando…" : full ? "Acervo cheio" : "Enviar foto"}
          </button>
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
            {photos.map((photo) => (
              <li
                key={photo.id}
                className={`overflow-hidden rounded-2xl border bg-background ${
                  pinned.has(photo.id) ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                <div className="relative">
                  <PhotoFrame photo={photo} className="h-32 w-full" />
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
                <div className="p-2">
                  <input
                    defaultValue={photo.label}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value !== photo.label) void onEdit(photo.id, { label: value });
                    }}
                    className="mb-1.5 w-full rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground"
                  />
                  <textarea
                    defaultValue={photo.description}
                    rows={2}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value !== photo.description) void onEdit(photo.id, { description: value });
                    }}
                    placeholder="Descrição / uso desejado"
                    className="mb-1.5 w-full resize-none rounded-md border border-border bg-card px-2 py-1 text-[10px] leading-snug text-foreground"
                  />
                  <div className="flex items-center justify-between">
                    <select
                      value={photo.usage}
                      onChange={(e) => void onEdit(photo.id, { usage: e.target.value as PhotoUsage })}
                      className="rounded-md border border-border bg-card px-1.5 py-1 text-[10px] text-muted-foreground"
                    >
                      {PHOTO_USAGES.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => setEditing(photo)}
                      title="Enquadrar (recorte, rotação, área segura)"
                      className="ml-auto mr-1 rounded-full border border-border p-1.5 text-muted-foreground"
                    >
                      <Crop className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void onRemove(photo)}
                      title="Remover foto"
                      className="rounded-full border border-border p-1.5 text-muted-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

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
