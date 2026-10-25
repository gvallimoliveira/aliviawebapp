import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";
import { AI_CREDIT_REFRESH } from "@/lib/aiCreditPolicy";
import { ENABLE_CHAT_ADDON } from "@/lib/featureFlags";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Check, Zap, MessageCircle } from "lucide-react";

interface Pkg {
  key: "mini" | "plus" | "pro";
  credits: number;
  price_brl: number;
  badge?: string;
  highlight?: boolean;
}

// 2026-07: pacotes são um COMPLEMENTO da assinatura (60 cr/mês inclusos).
// Escala pequena e preço/crédito crescente — o menor é o mais recomendado.
const PACKAGES: Pkg[] = [
  { key: "mini", credits: 15, price_brl: 29, badge: "Mais recomendado", highlight: true },
  { key: "plus", credits: 30, price_brl: 59 },
  { key: "pro", credits: 60, price_brl: 89 },
];

// Estimativa de capacidade por pacote (avaliação completa ≈ 0,70 créditos:
// diagnóstico 0,30 + tratamento 0,30 + impressão clínica 0,10).
const estimateAssessments = (credits: number) => Math.floor(credits / 0.7);
// Reavaliação rápida ≈ 0,50 créditos (progressão + evolução).
const estimateReassessments = (credits: number) => Math.floor(credits / 0.5);
// Chat do agente ≈ 0,05 créditos/mensagem.
const estimateChatMessages = (credits: number) => Math.floor(credits / 0.05);

/**
 * Storefront for one-off AI credit packs. Uses a native form POST redirect to Stripe Checkout.
 * Credit fulfillment is server-side via the `stripe-webhook` (`ai_credits` case).
 */
const AiCreditsStore = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const isPt = language === "pt";
  const checkoutAction = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-ai-credits-checkout`;
  const chatAddonAction = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-chat-addon-checkout`;

  // Toast after returning from Stripe Checkout.
  useEffect(() => {
    const status = searchParams.get("ai_credits");
    const chatStatus = searchParams.get("chat_addon");
    if (chatStatus === "success") {
      toast({
        title: isPt ? "💬 Chat do Agente ativado!" : "💬 Agent Chat activated!",
        description: isPt
          ? "Você tem 150 mensagens/mês inclusas. Pode usar à vontade."
          : "You now have 150 messages/month included.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("chat_addon");
      setSearchParams(next, { replace: true });
    }
    if (status === "success") {
      window.dispatchEvent(new Event(AI_CREDIT_REFRESH));
      toast({
        title: isPt ? "✨ Pagamento confirmado!" : "✨ Payment confirmed!",
        description: isPt
          ? "Seus créditos serão liberados em até 30 segundos."
          : "Your credits will be available within 30 seconds.",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("ai_credits");
      setSearchParams(next, { replace: true });
    } else if (status === "canceled") {
      const next = new URLSearchParams(searchParams);
      next.delete("ai_credits");
      setSearchParams(next, { replace: true });
    } else if (status === "error") {
      toast({
        title: isPt ? "Não foi possível abrir o pagamento" : "Unable to open payment",
        description: isPt
          ? "Tente novamente. Se persistir, entre em contato com o suporte."
          : "Please try again. If it persists, contact support.",
        variant: "destructive",
      });
      const next = new URLSearchParams(searchParams);
      next.delete("ai_credits");
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, isPt]);

  useEffect(() => {
    let cancelled = false;
    if (!open || !user) {
      setAccessToken(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setAccessToken(data.session?.access_token ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const handleBuy = (key: string, action: string = checkoutAction) => {
    if (!user) {
      toast({
        title: isPt ? "Faça login" : "Sign in",
        description: isPt
          ? "Você precisa estar logado para comprar."
          : "You must be signed in to purchase.",
        variant: "destructive",
      });
      return;
    }

    if (!accessToken) {
      toast({
        title: isPt ? "Preparando pagamento" : "Preparing payment",
        description: isPt
          ? "Aguarde um instante enquanto preparo o checkout seguro."
          : "Please wait a moment while secure checkout is prepared.",
      });
      return;
    }

    setLoadingKey(key);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = action;
    form.target = "_top";
    form.style.display = "none";

    const fields: Record<string, string> = {
      package: key,
      access_token: accessToken,
      redirect: "1",
      return_origin: window.location.origin,
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            {isPt ? "Comprar créditos" : "Buy credits"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {isPt ? "Créditos de IA Aliv.iA" : "Aliv.iA AI Credits"}
          </DialogTitle>
          <DialogDescription>
            {isPt
              ? "Pacotes avulsos válidos por 12 meses. Use em diagnósticos, planos de tratamento, agente de raciocínio e demais funções de IA."
              : "One-off packs valid for 12 months. Use across diagnoses, treatment plans, the reasoning agent and other AI features."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-3 gap-3 py-2">
          {PACKAGES.map((p) => (
            <Card
              key={p.key}
              className={
                p.highlight
                  ? "border-primary shadow-md relative"
                  : "relative"
              }
            >
              {p.badge && (
                <Badge
                  className="absolute -top-2 left-1/2 -translate-x-1/2"
                  variant={p.highlight ? "default" : "secondary"}
                >
                  {p.badge}
                </Badge>
              )}
              <CardContent className="pt-6 pb-4 text-center space-y-3">
                <div>
                  <p className="text-3xl font-bold text-foreground">
                    {p.credits}
                  </p>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {isPt ? "créditos" : "credits"}
                  </p>
                </div>
                <div className="border-t border-border pt-3">
                  <p className="text-2xl font-semibold text-foreground">
                    R$ {p.price_brl.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {isPt ? "pagamento único" : "one-time payment"}
                  </p>

                </div>
                <div className="border-t border-border pt-3 text-left space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    {isPt ? "Dá para fazer até ~" : "Enough for up to ~"}
                  </p>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5">
                    <li>
                      <span className="font-semibold text-foreground">
                        {estimateAssessments(p.credits)}
                      </span>{" "}
                      {isPt ? "avaliações completas" : "full assessments"}
                    </li>
                    <li className="text-center text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {isPt ? "ou" : "or"}
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">
                        {estimateReassessments(p.credits)}
                      </span>{" "}
                      {isPt ? "reavaliações rápidas" : "quick reassessments"}
                    </li>
                    <li className="text-center text-[10px] uppercase tracking-wide text-muted-foreground/70">
                      {isPt ? "ou" : "or"}
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">
                        {estimateChatMessages(p.credits).toLocaleString(isPt ? "pt-BR" : "en-US")}
                      </span>{" "}
                      {isPt ? "msgs no chat do agente" : "agent chat messages"}
                    </li>
                  </ul>
                  <p className="text-[10px] text-muted-foreground/80 italic pt-1 leading-tight">
                    {isPt
                      ? "Máximos alternativos — não somam. Você escolhe como usar (ex.: metade avaliações + metade chat)."
                      : "Alternative maximums — they don't add up. Mix usage as you like."}
                  </p>
                </div>

                <Button
                  className="w-full"
                  variant={p.highlight ? "default" : "outline"}
                  disabled={loadingKey !== null || (open && !!user && !accessToken)}
                  onClick={() => handleBuy(p.key)}
                >
                  {loadingKey === p.key || (open && !!user && !accessToken) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-1.5" />
                      {isPt ? "Comprar" : "Buy"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground leading-snug">
          {isPt
            ? "Pacotes complementam o saldo do seu perfil ou da clínica. Parceiros recebem 25 créditos gratuitos por mês e também podem comprar pacotes."
            : "Packs top up your profile or clinic balance. Partners receive 25 free credits monthly and can also buy packs."}
        </p>



        {/* A5: assinatura do Chat do Agente (R$ 14,90/mês, 150 msgs).
            Oculto até o enforcement do chat entrar em vigor (ENABLE_CHAT_ADDON). */}
        {ENABLE_CHAT_ADDON && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-5 pb-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-3 flex-1">
              <div className="rounded-lg bg-primary/15 p-2.5">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm flex items-center gap-2">
                  {isPt ? "Chat do Agente — Mensal" : "Agent Chat — Monthly"}
                  <Badge variant="secondary" className="text-[10px]">R$ 14,90/mês</Badge>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isPt
                    ? "150 mensagens/mês inclusas. Excedentes consomem créditos do seu saldo normalmente."
                    : "150 messages/month included. Overflow uses your regular credit balance."}
                </p>
                <p className="text-[11px] text-muted-foreground/80 mt-1">
                  {isPt
                    ? "Ideal para quem usa o agente como copiloto diário e quer custo previsível."
                    : "For heavy daily agent users who want predictable cost."}
                </p>
              </div>
            </div>
            <Button
              variant="default"
              className="w-full sm:w-auto"
              disabled={loadingKey !== null || (open && !!user && !accessToken)}
              onClick={() => handleBuy("chat_addon", chatAddonAction)}
            >
              {loadingKey === "chat_addon" ? <Loader2 className="h-4 w-4 animate-spin" /> : (isPt ? "Assinar chat" : "Subscribe")}
            </Button>
          </CardContent>
        </Card>
        )}



        <DialogFooter className="text-xs text-muted-foreground sm:justify-start">
          {isPt
            ? "Pagamento processado pela Stripe. Validade: 12 meses a partir da compra."
            : "Payment processed by Stripe. Valid for 12 months from purchase."}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AiCreditsStore;
