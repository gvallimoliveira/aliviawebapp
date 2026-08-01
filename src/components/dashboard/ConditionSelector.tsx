import { Badge } from "@/components/ui/badge";
import { PainCondition } from "@/lib/painConditions";
import { cn } from "@/lib/utils";

interface Props {
  conditions: PainCondition[];
  activeKey: string | null;
  onSelect: (key: string) => void;
}

/**
 * Chips horizontais para trocar a condição clínica em foco no painel pessoal.
 */
const ConditionSelector = ({ conditions, activeKey, onSelect }: Props) => {
  if (conditions.length < 2) return null;

  return (
    <div className="-mx-4 overflow-x-auto scrollbar-none">
      <div className="flex gap-2 px-4 pb-1">
        {conditions.map((c) => {
          const active = c.key === activeKey;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelect(c.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40",
              )}
            >
              <span className="max-w-[180px] truncate inline-block align-bottom">{c.label}</span>
              {c.latestPainScore != null && (
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2 px-1.5 py-0 text-[10px] border-0",
                    active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted",
                  )}
                >
                  {c.latestPainScore}/10
                </Badge>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ConditionSelector;
