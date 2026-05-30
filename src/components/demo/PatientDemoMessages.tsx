import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, Info, Lock, MessageCircle, Send } from "lucide-react";

interface PatientDemoMessagesProps {
  goSubscribe: () => void;
}

const PatientDemoMessages = ({ goSubscribe }: PatientDemoMessagesProps) => {
  return (
    <div className="space-y-4">
      <Card className="border-amber-300/40 bg-amber-50/40">
        <CardContent className="py-4 px-5 flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900/80">
            No app real, você troca mensagens diretamente com o <strong>fisioterapeuta parceiro</strong> que acompanha seu caso — tire dúvidas sobre exercícios, relate sintomas e receba orientações entre as consultas.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" /> Conversa com Dr. Demo
          </CardTitle>
          <CardDescription className="text-xs">Fisioterapeuta responsável · Online há 5 min</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2.5">
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2">
                <p className="text-sm text-foreground">Oi Mariana! Como foi a série de exercícios esta semana?</p>
                <p className="text-[10px] text-muted-foreground mt-1">Dr. Demo · há 2 dias</p>
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/10 border border-primary/20 px-3.5 py-2">
                <p className="text-sm text-foreground">Consegui fazer 5 dias! A dor irradiada melhorou bastante 🙌</p>
                <p className="text-[10px] text-muted-foreground mt-1">Você · há 2 dias</p>
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2">
                <p className="text-sm text-foreground">Excelente! Vou liberar a próxima fase do programa. Já está disponível na aba <strong>Minha Saúde</strong>.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Dr. Demo · há 1 dia</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-border/60">
            <input
              disabled
              placeholder="Digite uma mensagem... (disponível na assinatura Premium)"
              className="flex-1 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
            />
            <Button size="icon" disabled className="rounded-xl shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" />
            <p className="text-sm text-foreground">Mensagens com fisioterapeutas é um recurso <strong>Premium</strong>.</p>
          </div>
          <Button size="sm" onClick={goSubscribe} className="rounded-xl gap-1.5">
            <Crown className="h-3.5 w-3.5" /> Assinar Premium
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PatientDemoMessages;