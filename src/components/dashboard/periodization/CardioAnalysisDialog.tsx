import { useRef, type ComponentProps } from "react";
import { HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import CardioAnalysisPanel from "./CardioAnalysisPanel";

/** Só monta e busca o período quando a janela abre. */
const CardioAnalysisDialog = (props: ComponentProps<typeof CardioAnalysisPanel>) => {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button ref={trigger} type="button" variant="outline" className="h-auto max-w-full justify-start gap-2 whitespace-normal py-2 text-left">
          <HeartPulse className="h-4 w-4 shrink-0 text-primary" />
          Análise cardiovascular e relatório
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-4xl flex-col overflow-hidden p-0" onCloseAutoFocus={(event) => {
        event.preventDefault();
        trigger.current?.focus({ preventScroll: true });
      }}>
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-12 text-left">
          <DialogTitle className="leading-snug tracking-normal">Análise cardiovascular e relatório</DialogTitle>
          <DialogDescription>{props.patientName || "Paciente"} · acompanhamento cardiovascular</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 overflow-y-auto overscroll-contain px-4 pb-4">
          <CardioAnalysisPanel {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CardioAnalysisDialog;