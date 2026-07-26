import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface UseProSubscriptionOptions {
  professional: any;
}

export function useProSubscription({ professional }: UseProSubscriptionOptions) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [subscription, setSubscription] = useState<{
    subscribed: boolean;
    subscription_end?: string;
    is_partner?: boolean;
  } | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [lifetimeLoading, setLifetimeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [billingAnnual, setBillingAnnual] = useState(true);

  const checkSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-pro-subscription");
      if (error) throw error;
      setSubscription(data);
    } catch {
      setSubscription({ subscribed: false });
    } finally {
      setSubLoading(false);
    }
  };

  const handleSubscribe = async (plan: "monthly" | "annual" = "monthly") => {
    setCheckoutLoading(true);
    try {
      // Ask for optional coupon code (pre-applied server-side) — desktop only
      let coupon: string | undefined;
      const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;
      if (isDesktop) {
        const input = window.prompt(
          "Tem um cupom de desconto? Digite o código (ou deixe em branco):",
          ""
        );
        if (input && input.trim()) coupon = input.trim().toUpperCase();
      }
      const { data, error } = await supabase.functions.invoke("create-pro-subscription", {
        body: { plan, coupon },
      });
      if (error) throw error;
      // Idempotência: se o backend detectou assinatura ativa preexistente
      // não abre novo checkout; ressincroniza estado e avisa o usuário.
      if (data?.already_active) {
        toast({
          title: "Você já é PRO",
          description: data.message || "Detectamos uma assinatura PRO ativa. Atualizando seu acesso...",
        });
        await checkSubscription();
        return;
      }
      if (data?.url) window.location.href = data.url;
    } catch {
      toast({ title: t("payment.error_title"), description: t("payment.error_desc"), variant: "destructive" });
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast({ title: "Erro", description: "Não foi possível abrir o portal de assinatura.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLifetimeCheckout = async () => {
    setLifetimeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-lifetime-treatment");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch {
      toast({ title: t("payment.error_title"), description: t("payment.error_desc"), variant: "destructive" });
    } finally {
      setLifetimeLoading(false);
    }
  };

  const isWithinFirstMonth = useMemo(() => {
    if (!professional?.created_at) return false;
    const created = new Date(professional.created_at);
    const now = new Date();
    return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 30;
  }, [professional?.created_at]);

  const daysLeftForOffer = useMemo(() => {
    if (!professional?.created_at) return 0;
    const created = new Date(professional.created_at);
    const deadline = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.ceil((deadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
  }, [professional?.created_at]);

  return {
    subscription,
    subLoading,
    checkoutLoading,
    lifetimeLoading,
    portalLoading,
    billingAnnual,
    setBillingAnnual,
    isWithinFirstMonth,
    daysLeftForOffer,
    checkSubscription,
    handleSubscribe,
    handleManageSubscription,
    handleLifetimeCheckout,
  };
}
