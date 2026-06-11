import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  UserCheck, Calendar, CheckCircle, XCircle, MessageCircle,
} from "lucide-react";

interface ReceivedReferralsCardProps {
  professionalId: string;
}

/**
 * Lists referrals received by the professional from patients.
 * Self-contained: fetches its own data so it can be rendered inside the
 * Messages tab without coupling to ProDashboard.
 */
const ReceivedReferralsCard = ({ professionalId }: ReceivedReferralsCardProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [referrals, setReferrals] = useState<any[]>([]);
  const [referralProfiles, setReferralProfiles] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!professionalId) return;
    let cancelled = false;
    (async () => {
      const { data: refs } = await (supabase.from("professional_referrals" as any) as any)
        .select("id, patient_user_id, professional_id, assessment_id, status, created_at")
        .eq("professional_id", professionalId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (!refs || refs.length === 0) { setReferrals([]); return; }
      setReferrals(refs);
      const userIds: string[] = Array.from(new Set(refs.map((r: any) => String(r.patient_user_id))));
      const profiles: Record<string, string> = {};
      for (const uid of userIds) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", uid)
          .maybeSingle();
        if (profile?.full_name) profiles[uid] = profile.full_name;
      }
      if (!cancelled) setReferralProfiles(profiles);
    })();
    return () => { cancelled = true; };
  }, [professionalId]);

  const handleReferralAction = async (referralId: string, status: "accepted" | "declined") => {
    setActionLoading(referralId);
    try {
      await (supabase.from("professional_referrals" as any) as any)
        .update({ status })
        .eq("id", referralId);
      setReferrals(prev => prev.map(r => r.id === referralId ? { ...r, status } : r));
      toast({ title: status === "accepted" ? t("prof.referral_accepted") : t("prof.referral_declined") });
    } catch {
      toast({ title: "Erro", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReferralMessage = async (patientUserId: string) => {
    try {
      const { data, error } = await supabase.rpc("create_conversation_for_referral" as any, {
        _professional_id: professionalId,
        _patient_user_id: patientUserId,
      });
      if (error) throw error;
      navigate(`/dashboard?tab=messages&conv=${data}`);
    } catch (err) {
      console.error("Error creating conversation:", err);
      toast({ title: t("prof.referral_message_error"), variant: "destructive" });
    }
  };

  if (referrals.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary" />
          {t("prof.referrals_title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {referrals.map((r: any) => {
          const patientName = referralProfiles[r.patient_user_id] || t("prof.referral_from_patient");
          const date = new Date(r.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
          const isPending = r.status === "pending";
          const isAccepted = r.status === "accepted";
          const statusBadge = isPending
            ? <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-yellow-300 text-yellow-700 bg-yellow-50">{t("prof.referral_status_pending")}</Badge>
            : isAccepted
            ? <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-300 text-emerald-700 bg-emerald-50">{t("prof.referral_status_accepted")}</Badge>
            : <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-red-300 text-red-600 bg-red-50">{t("prof.referral_status_declined")}</Badge>;

          return (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{patientName}</span>
                  {statusBadge}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />{date}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {isPending && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 rounded-lg gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                      disabled={actionLoading === r.id}
                      onClick={() => handleReferralAction(r.id, "accepted")}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs">{t("prof.referral_accept")}</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2 rounded-lg gap-1 text-red-500 border-red-200 hover:bg-red-50"
                      disabled={actionLoading === r.id}
                      onClick={() => handleReferralAction(r.id, "declined")}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-xs">{t("prof.referral_decline")}</span>
                    </Button>
                  </>
                )}
                {(isPending || isAccepted) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 rounded-lg gap-1"
                    onClick={() => handleReferralMessage(r.patient_user_id)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline text-xs">{t("prof.referral_send_message")}</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default ReceivedReferralsCard;
