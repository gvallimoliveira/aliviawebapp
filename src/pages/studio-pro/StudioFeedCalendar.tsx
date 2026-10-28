import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Download, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FEED_PILLARS, localToday, pillarLabel, placeFeed, type FeedEntry } from "./feedPlan";

type Art = { id: string; headline: string | null; thumb: string | null; png_path: string | null; caption: string | null };
type Row = FeedEntry & { creation_id: string | null; title: string | null; notes: string | null };

type Props = {
  brandId: string;
  creations: Art[];
  previews: Record<string, string>;
  onDownload: (art: Art) => void;
};

const WEEKDAY = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (key: string) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
};
const shiftMonth = (key: string, delta: number) => {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${WEEKDAY[date.getDay()]} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
};

/**
 * Calendário de postagens do Feed Principal. As artes salvas pelo preset entram
 * na ordem da rotação de pilares (seg/qua/sex); vídeos com a cara do dono são
 * extras que humanizam o perfil. O PNG em HD continua o mesmo da galeria.
 */
const StudioFeedCalendar = ({ brandId, creations, previews, onDownload }: Props) => {
  const today = localToday();
  const [rows, setRows] = useState<Row[]>([]);
  const [month, setMonth] = useState(monthKey(today));
  const [video, setVideo] = useState({ date: today, title: "", notes: "" });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("studio_feed_calendar")
      .select("id, kind, pillar, created_at, scheduled_date, posted_at, creation_id, title, notes")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: true });
    if (error) return void console.error("[studio-pro] feed calendar", error);
    setRows((data as Row[]) ?? []);
  }, [brandId]);

  useEffect(() => {
    void load();
  }, [load, creations.length]);

  const byId = useMemo(() => new Map(creations.map((c) => [c.id, c])), [creations]);
  // Artes apagadas da galeria somem do calendário (cascade); filtra por segurança.
  const valid = rows.filter((r) => r.kind === "video" || (r.creation_id && byId.has(r.creation_id)));
  const placed = useMemo(() => placeFeed(valid, today), [valid, today]);
  const inMonth = placed.filter((p) => monthKey(p.date) === month);
  const days = [...new Set(inMonth.map((p) => p.date))];

  const update = async (id: string, patch: Partial<Row>, msg: string) => {
    const { error } = await supabase.from("studio_feed_calendar").update(patch).eq("id", id);
    if (error) return void toast.error("Não foi possível atualizar o calendário.");
    toast.success(msg);
    void load();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("studio_feed_calendar").delete().eq("id", id);
    if (error) return void toast.error("Não foi possível remover.");
    toast.success("Removido do calendário (a arte continua na galeria).");
    void load();
  };
  const addVideo = async () => {
    if (!video.title.trim()) return void toast.error("Dê um tema para o vídeo.");
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error } = await supabase.from("studio_feed_calendar").insert({
      brand_id: brandId,
      user_id: auth.user.id,
      kind: "video",
      title: video.title.trim(),
      notes: video.notes.trim() || null,
      scheduled_date: video.date,
    });
    if (error) return void toast.error("Não foi possível adicionar o vídeo.");
    toast.success("Vídeo extra no calendário.");
    setVideo({ date: video.date, title: "", notes: "" });
    void load();
  };

  const pending = placed.filter((p) => !p.extra && !p.entry.posted_at).length;

  return (
    <section className="mt-5 rounded-3xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <CalendarDays className="h-4 w-4" /> Calendário de postagens
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Artes salvas com o modelo "★ Feed principal" entram aqui sozinhas, na ordem dos pilares, às segundas,
            quartas e sextas. {pending} na fila.
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9rem] text-center text-sm font-semibold capitalize">{monthLabel(month)}</span>
          <Button size="icon" variant="ghost" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
        {FEED_PILLARS.map((p, i) => (
          <span key={p.id} className="rounded-full border border-border px-2 py-0.5">
            {i + 1}. {p.label}
          </span>
        ))}
      </div>

      {days.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          Nada neste mês. Na aba Criar, abra Direção criativa → Modelos → "★ Feed principal" e salve as artes do lote.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {days.map((day) => (
            <li key={day} className="rounded-2xl border border-border p-3">
              <p className={`text-xs font-semibold ${day === today ? "text-primary" : "text-foreground"}`}>
                {dayLabel(day)}
                {day === today ? " · hoje" : ""}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {inMonth
                  .filter((p) => p.date === day)
                  .map(({ entry, slot, extra }) => {
                    const row = entry as Row;
                    const art = row.creation_id ? byId.get(row.creation_id) : undefined;
                    const img = art?.png_path ? previews[art.png_path] ?? art.thumb : art?.thumb;
                    return (
                      <div key={row.id} className="flex gap-3 rounded-xl bg-muted/30 p-2">
                        {extra ? (
                          <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Video className="h-5 w-5" />
                          </div>
                        ) : img ? (
                          <img src={img} alt="" className="h-20 w-16 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="h-20 w-16 shrink-0 rounded-lg bg-muted" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                            {extra ? "Extra · vídeo com você" : `Post ${slot ?? ""} · ${pillarLabel(row.pillar)}`}
                            {row.posted_at ? " · postado" : ""}
                          </p>
                          <p className="line-clamp-2 text-xs font-medium">{extra ? row.title : art?.headline ?? "Arte"}</p>
                          {extra && row.notes && <p className="line-clamp-2 text-[11px] text-muted-foreground">{row.notes}</p>}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1">
                            {art && (
                              <Button size="sm" variant="outline" className="h-7 rounded-full text-[11px]" onClick={() => onDownload(art)}>
                                <Download className="mr-1 h-3 w-3" /> PNG HD
                              </Button>
                            )}
                            {art?.caption && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 rounded-full text-[11px]"
                                onClick={() => void navigator.clipboard.writeText(art.caption ?? "").then(() => toast.success("Legenda copiada"))}
                              >
                                Legenda
                              </Button>
                            )}
                            {!row.posted_at && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 rounded-full text-[11px]"
                                onClick={() => void update(row.id, { posted_at: day }, "Marcado como postado")}
                              >
                                <Check className="mr-1 h-3 w-3" /> Postei
                              </Button>
                            )}
                            {!row.posted_at && (
                              <input
                                type="date"
                                aria-label="Mudar data"
                                className="h-7 rounded-full border border-border bg-background px-2 text-[11px]"
                                value={day}
                                onChange={(e) => e.target.value && void update(row.id, { scheduled_date: e.target.value }, "Data alterada")}
                              />
                            )}
                            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remover do calendário" onClick={() => void remove(row.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 rounded-2xl border border-dashed border-border p-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold">
          <Video className="h-3.5 w-3.5" /> Vídeo extra com você (humaniza o perfil, não ocupa vaga da rotação)
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-[9rem_1fr_1fr_auto]">
          <Input type="date" value={video.date} onChange={(e) => setVideo({ ...video, date: e.target.value })} />
          <Input placeholder="Tema do vídeo" value={video.title} onChange={(e) => setVideo({ ...video, title: e.target.value })} />
          <Input placeholder="Roteiro / observação (opcional)" value={video.notes} onChange={(e) => setVideo({ ...video, notes: e.target.value })} />
          <Button className="rounded-full" onClick={() => void addVideo()}>Adicionar</Button>
        </div>
      </div>
    </section>
  );
};

export default StudioFeedCalendar;
