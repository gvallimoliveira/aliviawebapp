import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon, Copy, Pencil, Trash2, ChevronDown, ChevronUp } from "lucide-react";

export interface SessionNoteData {
  id: string;
  session_date: string;
  content: string;
  observation?: string | null;
  created_at: string;
  updated_at: string;
  appointment_id?: string | null;
  professional_id?: string | null;
}

interface SessionNoteItemProps {
  note: SessionNoteData;
  onEdit: (note: SessionNoteData) => void;
  onRepeat: (note: SessionNoteData) => void;
  onDelete: (id: string) => void;
  labels: {
    repeat: string;
    expand: string;
    collapse: string;
  };
  /** Em modo clínica: nome do profissional que registrou. */
  authorName?: string;
}

const SessionNoteItem = ({ note, onEdit, onRepeat, onDelete, labels, authorName }: SessionNoteItemProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = note.content.length > 150;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {new Date(note.session_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </span>
          {authorName && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px] sm:max-w-none">
              · {authorName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-6 w-6" title={labels.repeat} onClick={() => onRepeat(note)}>
            <Copy className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(note)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            onClick={() => onDelete(note.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <p className={cn("text-xs text-muted-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]", !isExpanded && isLong && "line-clamp-3")}>
        {note.content}
      </p>
      {note.observation?.trim() && (
        <div className="mt-1 rounded-md border-l-2 border-primary/40 bg-background/60 px-2 py-1">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground/80">Observação</p>
          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{note.observation}</p>
        </div>
      )}
      {isLong && (
        <Button
          variant="ghost"
          size="sm"
          className="h-5 text-[10px] px-1 gap-0.5"
          onClick={() => setIsExpanded((v) => !v)}
        >
          {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {isExpanded ? labels.collapse : labels.expand}
        </Button>
      )}
    </div>
  );
};

export default SessionNoteItem;
