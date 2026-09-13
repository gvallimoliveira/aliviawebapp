import { useMemo, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, History, Loader2, NotebookPen } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import SessionNoteItem, { SessionNoteData } from "./SessionNoteItem";
import DictationBar from "./DictationBar";

const PAGE_SIZE = 20;

type PeriodKey = "all" | "30" | "90" | "year";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notes: SessionNoteData[];
  onEdit: (note: SessionNoteData) => void;
  onRepeat: (note: SessionNoteData) => void;
  onDelete: (id: string) => void;
  labels: { repeat: string; expand: string; collapse: string };
  /** Mapa professional_id -> nome (modo clínica). */
  authors?: Record<string, string>;
  isDemo?: boolean;
  /** Salva a edição feita aqui dentro, sem sair do histórico. */
  onSaveEdit?: (id: string, content: string, observation: string) => Promise<void>;
}

const monthLabel = (iso: string) => {
  const d = new Date(iso + "T12:00:00");
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const SessionNotesHistoryModal = ({ open, onOpenChange, notes, onEdit, onRepeat, onDelete, labels, authors }: Props) => {
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<PeriodKey>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (open) {
      setQuery("");
      setPeriod("all");
      setVisible(PAGE_SIZE);
    }
  }, [open]);

  useEffect(() => { setVisible(PAGE_SIZE); }, [query, period]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    let floor: Date | null = null;
    if (period === "30") floor = new Date(now.getTime() - 30 * 86400000);
    else if (period === "90") floor = new Date(now.getTime() - 90 * 86400000);
    else if (period === "year") floor = new Date(now.getFullYear(), 0, 1);

    return notes.filter((n) => {
      if (floor && new Date(n.session_date + "T12:00:00") < floor) return false;
      if (!q) return true;
      return `${n.content} ${n.observation || ""}`.toLowerCase().includes(q);
    });
  }, [notes, query, period]);

  const shown = filtered.slice(0, visible);

  const groups = useMemo(() => {
    const out: { label: string; items: SessionNoteData[] }[] = [];
    shown.forEach((n) => {
      const label = monthLabel(n.session_date);
      const last = out[out.length - 1];
      if (last && last.label === label) last.items.push(n);
      else out.push({ label, items: [n] });
    });
    return out;
  }, [shown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 pb-3 border-b border-border/60">
          <DialogTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico de evolução
          </DialogTitle>
          <DialogDescription className="text-xs">
            {filtered.length === notes.length
              ? `${notes.length} registro${notes.length === 1 ? "" : "s"}`
              : `${filtered.length} de ${notes.length} registros`}
          </DialogDescription>
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar na evolução ou observação…"
                className="h-9 pl-8 text-xs"
              />
            </div>
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
              <SelectTrigger className="h-9 w-full sm:w-[170px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todo o período</SelectItem>
                <SelectItem value="30" className="text-xs">Últimos 30 dias</SelectItem>
                <SelectItem value="90" className="text-xs">Últimos 90 dias</SelectItem>
                <SelectItem value="year" className="text-xs">Ano atual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">Nenhum registro encontrado com esses filtros.</p>
          ) : (
            groups.map((g) => (
              <div key={g.label} className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sticky top-0 bg-background/95 py-1">
                  {g.label}
                </p>
                {g.items.map((note) => (
                  <SessionNoteItem
                    key={note.id}
                    note={note}
                    onEdit={onEdit}
                    onRepeat={onRepeat}
                    onDelete={onDelete}
                    labels={labels}
                    authorName={authors ? authors[(note as any).professional_id] : undefined}
                  />
                ))}
              </div>
            ))
          )}

          {filtered.length > shown.length && (
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs"
              onClick={() => setVisible((v) => v + PAGE_SIZE)}
            >
              Carregar mais ({filtered.length - shown.length})
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SessionNotesHistoryModal;
