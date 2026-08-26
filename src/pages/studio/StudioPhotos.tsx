import { useRef, useState } from "react";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { PHOTO_USAGES, type PhotoUsage, type StudioPhoto } from "./photos";

type Props = {
  photos: StudioPhoto[];
  loading: boolean;
  onUpload: (file: File, meta: { label: string; usage: PhotoUsage; credit?: string }) => Promise<unknown>;
  onEdit: (id: string, patch: { label?: string; usage?: PhotoUsage }) => Promise<void>;
  onRemove: (photo: StudioPhoto) => Promise<void>;
  onClose: () => void;
};

/**
 * Painel do acervo de fotos: envia, rotula e remove. As fotos ficam na conta
 * (privadas) e alimentam os blocos fotográficos das artes.
 */
const StudioPhotos = ({ photos, loading, onUpload, onEdit, onRemove, onClose }: Props) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [usage, setUsage] = useState<PhotoUsage>("livre");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        await onUpload(file, { label: label.trim() || file.name.replace(/\.[^.]+$/, ""), usage });
      }
      setLabel("");
      toast.success(files.length > 1 ? `${files.length} fotos enviadas` : "Foto enviada");
    } catch (error) {
      console.error("[studio] upload falhou", error);
      toast.error("Não foi possível enviar a foto.");
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
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-border p-1.5 text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-border bg-background p-3">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Rótulo (ex. Guilherme, fundador)"
            className="mb-2 w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[12px] text-foreground"
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
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-[12px] font-semibold text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {busy ? "Enviando…" : "Enviar foto"}
          </button>
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
              <li key={photo.id} className="overflow-hidden rounded-2xl border border-border bg-background">
                <img src={photo.src} alt={photo.label} className="h-32 w-full object-cover" />
                <div className="p-2">
                  <input
                    defaultValue={photo.label}
                    onBlur={(e) => {
                      const value = e.target.value.trim();
                      if (value !== photo.label) void onEdit(photo.id, { label: value });
                    }}
                    className="mb-1.5 w-full rounded-md border border-border bg-card px-2 py-1 text-[11px] text-foreground"
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
    </div>
  );
};

export default StudioPhotos;
