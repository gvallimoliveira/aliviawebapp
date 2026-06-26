import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchParams } from "react-router-dom";
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
import { Loader2, Sparkles, Check, Zap } from "lucide-react";

interface Pkg {
  key: "mini" | "plus" | "pro";
  credits: number;
  price_brl: number;
  badge?: string;
  highlight?: boolean;
}

const PACKAGES: Pkg[] = [
  { key: "mini", credits: 100, price_brl: 29 },
  { key: "plus", credits: 300, price_brl: 69, badge: "Popular", highlight: true },
  { key: "pro", credits: 1000, price_brl: 199, badge: "Melhor valor" },
];

// Estimativa de capacidade por pacote (avaliação completa ≈ 0,70 créditos:
// diagnóstico 0,30 + tratamento 0,30 + impressão clínica 0,10).
const estimateAssessments = (credits: number) => Math.floor(credits / 0.7);
// Reavaliação rápida ≈ 0,50 créditos (progressão + evolução).
const estimateReassessments = (credits: number) => Math.floor(credits / 0.5);
// Chat do agente ≈ 0,05 créditos/mensagem.
const estimateChatMessages = (credits: number) => Math.floor(credits / 0.05);

/**
 * Storefront for one-off AI credit packs. Opens Stripe Checkout in a new tab.
 * Credit fulfillment is server-side via the `stripe-webhook` (`ai_credits` case).
 */
const AiCreditsStore = ({ trigger }: { trigger?: React.ReactNode }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const isPt = language === "pt";

  // Toast after returning from Stripe Checkout.
  useEffect(() => {
    const status = searchParams.get("ai_credits");
    if (status === "success") {
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
    }
  }, [searchParams, setSearchParams, isPt]);

  const handleBuy = async (key: string) => {
    if (!user) {
      toast({
        title: isPt ? "Faça login" : "Sign in",
        description: isPt
          ? "Você precisa estar logado para comprar créditos."
          : "You must be signed in to buy credits.",
        variant: "destructive",
      });
      return;
    }
    setLoadingKey(key);
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-ai-credits-checkout",
        { body: { package: key } },
      );
      if (error) throw error;
      const url = (data as any)?.url;
      if (!url) throw new Error("Checkout URL missing");
      setOpen(false);
      // Mobile browsers block window.open() after an await (gesture lost),
      // so we navigate in the same tab on touch devices and only open a new
      // tab on desktop where popup blockers respect the original click.
      const isTouch =
        typeof window !== "undefined" &&
        (window.matchMedia?.("(pointer: coarse)").matches ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
      if (isTouch) {
        window.location.href = url;
      } else {
        const w = window.open(url, "_blank", "noopener,noreferrer");
        if (!w) window.location.href = url;
      }
    } catch (err: any) {
      toast({
        title: isPt ? "Erro" : "Error",
        description: err.message || "Failed to start checkout",
        variant: "destructive",
      });
    } finally {
      setLoadingKey(null);
    }
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
      <DialogContent className="max-w-3xl">
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
                    R$ {(p.price_brl / p.credits).toFixed(3)}/crédito
                  </p>
                </div>
                <div className="border-t border-border pt-3 text-left space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    {isPt ? "Dá para fazer ~" : "Enough for ~"}
                  </p>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5">
                    <li>
                      <span className="font-semibold text-foreground">
                        {estimateAssessments(p.credits)}
                      </span>{" "}
                      {isPt ? "avaliações completas" : "full assessments"}
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">
                        {estimateReassessments(p.credits)}
                      </span>{" "}
                      {isPt ? "reavaliações rápidas" : "quick reassessments"}
                    </li>
                    <li>
                      <span className="font-semibold text-foreground">
                        {estimateChatMessages(p.credits).toLocaleString(isPt ? "pt-BR" : "en-US")}
                      </span>{" "}
                      {isPt ? "msgs no chat do agente" : "agent chat messages"}
                    </li>
                  </ul>
                </div>
                <Button
                  className="w-full"
                  variant={p.highlight ? "default" : "outline"}
                  disabled={loadingKey !== null}
                  onClick={() => handleBuy(p.key)}
                >
                  {loadingKey === p.key ? (
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
