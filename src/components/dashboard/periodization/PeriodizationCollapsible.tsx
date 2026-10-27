import { ReactNode, useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

interface Props {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Envolve um card de periodização tornando-o colapsável.
 * O cabeçalho interno do card é ocultado (o título passa a ser o do wrapper),
 * evitando título duplicado — a estrutura Card > CardHeader + CardContent é
 * preservada para o conteúdo.
 */
const PeriodizationCollapsible = ({ title, icon, defaultOpen = true, children, open: openProp, onOpenChange }: Props) => {
  const [openState, setOpenState] = useState(defaultOpen);
  const open = openProp ?? openState;
  const setOpen = (v: boolean) => { if (openProp === undefined) setOpenState(v); onOpenChange?.(v); };
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="w-full flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left hover:bg-muted/50 transition"
          aria-expanded={open}
        >
          {icon}
          <span className="text-sm font-semibold text-foreground flex-1">{title}</span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
      </CollapsibleTrigger>
      {/* Oculta apenas o cabeçalho interno marcado (título duplicado); cards sem
          CardHeader (ex.: MicroWeekGrid) mantêm o conteúdo visível. */}
      <CollapsibleContent className="pt-2 [&_.periodization-card-header]:hidden">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default PeriodizationCollapsible;
