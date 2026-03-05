import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { PRO_PLAN_PRICE_FORMATTED } from "@/constants/pricing";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Stethoscope, Link2, Copy, Check, Loader2, CreditCard, Users,
  Calendar, MapPin, ChevronRight, Crown, Sparkles, Target, Clock, Settings,
} from "lucide-react";

interface ProDashboardProps {
  professional: any;
}

const ProDashboard = ({ professional }: ProDashboardProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [subscription, setSubscription] = useState<{ subscribed: boolean; subscription_end?: string } | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [linkCopied, setLinkCopied] = useState(false);
  const [patientAssessments, setPatientAssessments] = useState<any[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    checkSubscription();
    loadPatientAssessments();
  }, []);

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

  const loadPatientAssessments = async () => {
    const { data } = await supabase
      .from("assessments")
      .select("*")
      .eq("professional_id", professional.id)
      .order("created_at", { ascending: false });
    setPatientAssessments(data || []);
  };

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-pro-subscription");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
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
      if (data?.url) window.open(data.url, "_blank");
    } catch {
      toast({ title: "Erro", description: "Não foi possível abrir o portal de assinatura.", variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  const copyLink = () => {
    const link = `${window.location.origin}/assessment/professional/${professional.id}`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    toast({ title: t("referral.copied") });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const thisMonthCount = patientAssessments.filter((a) => {
    const d = new Date(a.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const painRegionLabels: Record<string, string> = {
    head: "Cabeça", neck: "Pescoço", right_shoulder: "Ombro D.", left_shoulder: "Ombro E.",
    upper_back: "Torácica", lower_back: "Lombar", right_knee: "Joelho D.", left_knee: "Joelho E.",
    right_hip: "Quadril D.", left_hip: "Quadril E.",
  };

  if (subLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Paywall — professional not subscribed
  if (!subscription?.subscribed) {
    return (
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="text-center pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mx-auto mb-2">
            <Stethoscope className="h-4 w-4" />
            {t("pro.plan_title")}
          </div>
          <CardTitle className="text-2xl">{t("pro.paywall_title")}</CardTitle>
          <CardDescription className="max-w-lg mx-auto">
            {t("pro.paywall_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 max-w-md mx-auto">
          <div className="text-center">
            <div className="text-4xl font-bold text-foreground">{PRO_PLAN_PRICE_FORMATTED}</div>
          </div>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2 text-muted-foreground">
              <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              {t("pro.feature_1")}
            </li>
            <li className="flex items-start gap-2 text-muted-foreground">
              <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              {t("pro.feature_2")}
            </li>
            <li className="flex items-start gap-2 text-muted-foreground">
              <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              {t("pro.feature_3")}
            </li>
            <li className="flex items-start gap-2 text-muted-foreground">
              <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              {t("pro.feature_4")}
            </li>
          </ul>
          <Button
            onClick={handleSubscribe}
            disabled={checkoutLoading}
            className="w-full rounded-xl gap-2"
            size="lg"
          >
            {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            {t("pro.subscribe_cta")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active subscriber dashboard
  return (
    <div className="space-y-6">
      {/* Status bar */}
      <Card className="border-emerald-200 bg-emerald-500/5">
        <CardContent className="py-4 px-5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <Crown className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-2">
                {t("pro.plan_title")}
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-[10px]">
                  {t("dashboard.active")}
                </Badge>
              </p>
              {subscription.subscription_end && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("pro.renews")} {new Date(subscription.subscription_end).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleManageSubscription} disabled={portalLoading} className="gap-1.5 rounded-xl">
            {portalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Settings className="h-3.5 w-3.5" />}
            {t("pro.manage_subscription")}
          </Button>
        </CardContent>
      </Card>

      {/* Generate Link */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-4 w-4 text-primary" />
            {t("pro.generate_link_title")}
          </CardTitle>
          <CardDescription className="text-sm">{t("pro.generate_link_desc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <code className="flex-1 text-xs bg-muted/60 px-3 py-2.5 rounded-lg text-muted-foreground truncate">
              {window.location.origin}/assessment/professional/{professional.id}
            </code>
            <Button onClick={copyLink} variant="outline" className="gap-1.5 rounded-xl shrink-0">
              {linkCopied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {linkCopied ? t("referral.copied") : t("referral.copy_link")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-foreground">{patientAssessments.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("pro.total_assessments")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-primary">{thisMonthCount}</p>
            <p className="text-xs text-muted-foreground mt-1">{t("pro.this_month")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Patient Assessment List */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          {t("pro.patient_assessments")}
        </h3>
        {patientAssessments.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t("pro.no_patient_assessments")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {patientAssessments.map((a) => {
              const regions = (a.pain_regions || []).map((r: string) => painRegionLabels[r] || r).slice(0, 3);
              const hypothesis = a.diagnosis?.hypothesis;
              return (
                <Card
                  key={a.id}
                  className="cursor-pointer hover:shadow-md transition-all border-border/60 hover:border-border group"
                  onClick={() => navigate(`/assessment/view/${a.id}`)}
                >
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(a.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
                          {a.pain_score != null && <span>• Dor: {a.pain_score}/10</span>}
                        </div>
                        {hypothesis && (
                          <p className="text-sm font-medium text-foreground line-clamp-1">{hypothesis}</p>
                        )}
                        {regions.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                            {regions.map((r: string, i: number) => (
                              <span key={i} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-full">{r}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProDashboard;
