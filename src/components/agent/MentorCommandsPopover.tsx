import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, GraduationCap, BookOpen, FileQuestion, UserPlus, Languages, Route } from "lucide-react";

type Cmd = {
  icon: any;
  cmd: string;
  desc: string;
};

const COMMANDS: Cmd[] = [
  { icon: GraduationCap, cmd: "/professor", desc: "Ativa a persona Mentor — preceptor socrático que revisa conceitos antes da conduta." },
  { icon: FileQuestion, cmd: "/quiz [tema] [n]", desc: "Quiz interativo com gabarito comentado (ex.: /quiz tendinopatia patelar 5)." },
  { icon: UserPlus, cmd: "/caso [tema]", desc: "Cria um paciente fictício completo na aba 'Casos de estudo' para você praticar." },
  { icon: Languages, cmd: "/traduzir [link ou texto]", desc: "Tradução PT-BR do artigo + PICO e nível de evidência estimado." },
  { icon: Route, cmd: "/trilha [tema]", desc: "Abre a trilha de conhecimento daquele nicho (módulos sequenciais)." },
];

export default function MentorCommandsPopover({
  onPick,
}: {
  onPick: (cmd: string) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Comandos do Mentor"
          title="Comandos do Mentor"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Comandos do Mentor</span>
        </div>
        <p className="text-[11px] text-muted-foreground mb-3">
          Clique em um comando para inserir no campo de mensagem.
        </p>
        <div className="space-y-1.5">
          {COMMANDS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.cmd}
                type="button"
                onClick={() => onPick(c.cmd)}
                className="w-full text-left rounded-lg border border-border/50 px-2.5 py-2 hover:bg-primary/10 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <code className="text-[11px] font-mono text-foreground">{c.cmd}</code>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{c.desc}</p>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
