import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Clock, Crown, Lock, Sparkles } from "lucide-react";

const TRIAL_DAYS = 15;

export const useClinicTrial = () => {
  const { activeClinic } = useClinic();

  return useMemo(() => {
    if (!activeClinic) return { daysLeft: 0, daysUsed: 0, isTrialActive: false, isTrialExpired: false, hasSubscription: false };

    const hasSubscription = activeClinic.subscription_status === "active";
    if (hasSubscription) return { daysLeft: TRIAL_DAYS, daysUsed: 0, isTrialActive: false, isTrialExpired: false, hasSubscription: true };

    const isTrialing = activeClinic.subscription_status === "trialing";
    if (!isTrialing) return { daysLeft: 0, daysUsed: 0, isTrialActive: false, isTrialExpired: false, hasSubscription: false };

    const created = new Date(activeClinic.created_at);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const daysUsed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, TRIAL_DAYS - daysUsed);
    const isTrialActive = daysLeft > 0;
    const isTrialExpired = daysLeft === 0;

    return { daysLeft, daysUsed, isTrialActive, isTrialExpired, hasSubscription: false };
  }, [activeClinic]);
};

const ClinicTrialBanner = () => {
  const { activeClinic } = useClinic();
  const { daysLeft, daysUsed, isTrialActive, isTrialExpired, hasSubscription } = useClinicTrial();
  const navigate = useNavigate();

  if (!activeClinic || hasSubscription) return null;

  const handleSubscribe = () => {
    navigate("/clinica#planos");
  };

  const progressPercent = Math.min(100, (daysUsed / TRIAL_DAYS) * 100);

  if (isTrialExpired) {
    return (
      <Card className="border-destructive/50 bg-gradient-to-br from-destructive/5 via-background to-destructive/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardContent className="py-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 shrink-0">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                Período de teste encerrado
                <Badge variant="destructive" className="text-[10px]">Expirado</Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                Seu trial de {TRIAL_DAYS} dias do Aliv.iA Clinic terminou. Assine agora para continuar usando todas as funcionalidades da clínica.
              </p>
            </div>
          </div>
          <Button onClick={handleSubscribe} className="w-full gap-2 rounded-xl" size="lg">
            <Crown className="h-4 w-4" />
            Assinar Aliv.iA Clinic agora
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isTrialActive) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardContent className="py-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              Teste gratuito
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px] px-1.5">
                Ativo
              </Badge>
            </h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Clock className="h-3.5 w-3.5" />
              {daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso do trial</span>
            <span className="font-medium text-foreground">{daysUsed}/{TRIAL_DAYS} dias</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {daysLeft <= 5 && (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-200/50">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              {daysLeft <= 2
                ? "⚡ Últimos dias! Assine agora e não perca o acesso às funcionalidades da sua clínica."
                : "Seu trial está acabando. Garanta a continuidade assinando antes que expire."}
            </p>
          </div>
        )}

        <Button onClick={handleSubscribe} variant={daysLeft <= 5 ? "default" : "outline"} className="w-full gap-2 rounded-xl" size="sm">
          <Crown className="h-4 w-4" />
          {daysLeft <= 5 ? "Assinar agora — não perca o acesso" : "Assinar Aliv.iA Clinic"}
        </Button>
      </CardContent>
    </Card>
  );
};

/** Overlay that blocks clinic features when trial is expired.
 *  Must be placed inside a parent with `relative` positioning. Uses fixed-style
 *  full-cover absolute positioning + high z-index + pointer-events-auto to
 *  guarantee that the underlying content cannot be interacted with. */
export const ClinicTrialBlockOverlay = () => {
  const { isTrialExpired, hasSubscription } = useClinicTrial();
  const { activeClinic } = useClinic();
  const navigate = useNavigate();

  if (!activeClinic || hasSubscription || !isTrialExpired) return null;

  return (
    <div
      className="absolute inset-0 z-50 bg-background/85 backdrop-blur-sm rounded-xl flex items-start justify-center pt-16 sm:pt-24 pointer-events-auto"
      onClickCapture={(e) => e.stopPropagation()}
    >
      <div className="text-center space-y-4 max-w-sm px-6 sticky top-16">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Lock className="h-7 w-7 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-bold text-foreground">Trial expirado</h3>
        <p className="text-sm text-muted-foreground">
          O período de teste de {TRIAL_DAYS} dias terminou. Assine para desbloquear todas as funcionalidades da clínica.
        </p>
        <Button onClick={() => navigate("/clinica#planos")} className="gap-2 rounded-xl">
          <Crown className="h-4 w-4" />
          Assinar agora
        </Button>
      </div>
    </div>
  );
};

export default ClinicTrialBanner;
