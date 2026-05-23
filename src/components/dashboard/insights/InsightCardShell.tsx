import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Info } from "lucide-react";
import { useInsightCollapsed } from "./useInsightPreferences";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  id: string;
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  rightSlot?: ReactNode;
  infoContent?: ReactNode;
  className?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

const InsightCardShell = ({
  id,
  icon,
  title,
  description,
  rightSlot,
  infoContent,
  className,
  children,
  defaultOpen = true,
}: Props) => {
  const [open, setOpen] = useInsightCollapsed(id, defaultOpen);
  const { language } = useLanguage();
  const lang = language as "pt" | "en" | "es";

  return (
    <Card className={className}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                {icon}
                <span>{title}</span>
                {rightSlot}
              </CardTitle>
              {description && open && (
                <CardDescription className="text-xs mt-1">{description}</CardDescription>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {infoContent && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      aria-label={lang === "pt" ? "Como é calculado" : "How it's calculated"}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Info className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[320px] max-h-[70vh] overflow-y-auto"
                    align="end"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                  >
                    {infoContent}
                  </PopoverContent>
                </Popover>
              )}
              <CollapsibleTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  aria-label={open ? (lang === "pt" ? "Recolher" : "Collapse") : (lang === "pt" ? "Expandir" : "Expand")}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default InsightCardShell;
