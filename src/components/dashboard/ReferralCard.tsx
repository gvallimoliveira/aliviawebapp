import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Share2, Gift, Users, Percent } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ReferralCardProps {
  availableDiscount?: { discount_percent: number } | null;
}

const ReferralCard = ({ availableDiscount }: ReferralCardProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadReferralData();
  }, [user]);

  const loadReferralData = async () => {
    if (!user) return;
    setLoading(true);

    // Get or create referral code
    const { data: existing } = await (supabase.from("referral_codes" as any) as any)
      .select("code")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.code) {
      setReferralCode(existing.code);
    } else {
      // Generate a unique code
      const code = `ALIVIA-${user.id.substring(0, 6).toUpperCase()}`;
      const { data: created } = await (supabase.from("referral_codes" as any) as any)
        .insert({ user_id: user.id, code })
        .select("code")
        .single();
      if (created?.code) {
        setReferralCode(created.code);
      }
    }

    // Count friends referred (only confirmed rewards)
    const { count } = await (supabase.from("referral_rewards" as any) as any)
      .select("id", { count: "exact" })
      .eq("referrer_user_id", user.id)
      .in("status", ["rewarded", "used"]);
    setFriendsCount(count ?? 0);

    setLoading(false);
  };

  const getReferralLink = () => {
    const base = window.location.origin;
    return `${base}/?ref=${referralCode}`;
  };

  const handleCopy = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(getReferralLink());
      setCopied(true);
      toast({ title: t("referral.copied") });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Aliv.iA",
          text: t("referral.share_text"),
          url: getReferralLink(),
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopy();
    }
  };

  if (loading) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          {t("referral.title")}
        </CardTitle>
        <CardDescription className="text-sm">{t("referral.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {availableDiscount && (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1.5">
            <Percent className="h-3 w-3" />
            {t("referral.discount_available").replace("{percent}", String(availableDiscount.discount_percent))}
          </Badge>
        )}

        {referralCode && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
            <code className="text-sm font-mono text-foreground flex-1 truncate">{referralCode}</code>
            <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleCopy}>
            <Copy className="h-3.5 w-3.5" />
            {t("referral.copy_link")}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={handleShare}>
            <Share2 className="h-3.5 w-3.5" />
            {t("referral.share")}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{friendsCount} {t("referral.friends_referred")}</span>
        </div>

        <p className="text-xs text-muted-foreground/80 leading-relaxed border-t pt-3 mt-1">
          {t("referral.rules")}
        </p>
      </CardContent>
    </Card>
  );
};

export default ReferralCard;
