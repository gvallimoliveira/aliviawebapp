import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2, MapPin, Phone, Mail, Search, UserCheck } from "lucide-react";
import logoAlivia from "@/assets/logo-alivia.png";

const STATES = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS",
  "MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC",
  "SP","SE","TO",
];

const ProfessionalSearch = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [referralLoading, setReferralLoading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    fetchProfessionals();
  }, [user, stateFilter, cityFilter]);

  const fetchProfessionals = async () => {
    setLoading(true);
    let query = (supabase.from("professionals" as any) as any).select("*").eq("active", true);
    if (stateFilter) query = query.eq("state", stateFilter);
    if (cityFilter) query = query.ilike("city", `%${cityFilter}%`);
    const { data } = await query.order("full_name");
    setProfessionals(data || []);
    setLoading(false);
  };

  const handleReferral = async (professionalId: string) => {
    if (!user) return;
    setReferralLoading(professionalId);
    try {
      await (supabase.from("professional_referrals" as any) as any).insert({
        patient_user_id: user.id,
        professional_id: professionalId,
      });
      toast({ title: t("prof.referral_sent") });
    } catch {
      toast({ title: t("prof.referral_error"), variant: "destructive" });
    } finally {
      setReferralLoading(null);
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    const number = cleaned.startsWith("55") ? cleaned : `55${cleaned}`;
    window.open(`https://wa.me/${number}`, "_blank");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
            <span className="text-xl font-bold text-foreground">Aliv.iA</span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" />
            {t("diagnosis.back")}
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl py-8 px-4 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("prof.search_title")}</h1>
          <p className="text-muted-foreground">{t("prof.search_desc")}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">{t("prof.all_states")}</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("prof.search_city")}
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : professionals.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <UserCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("prof.no_results")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {professionals.map((p: any) => (
              <Card key={p.id} className="rounded-2xl hover:shadow-md transition-all">
                <CardContent className="py-5 px-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground">{p.full_name}</h3>
                      {p.crefito && (
                        <p className="text-xs text-muted-foreground">CREFITO: {p.crefito}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <MapPin className="h-3 w-3" />
                      {p.city}, {p.state}
                    </div>
                  </div>

                  {p.specialties?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {p.specialties.map((s: string) => (
                        <Badge key={s} variant="secondary" className="text-[10px]">
                          {t(`prof.spec.${s}`)}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {p.bio && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{p.bio}</p>
                  )}

                  {p.clinic_name && (
                    <p className="text-xs text-muted-foreground">
                      🏥 {p.clinic_name}{p.clinic_address ? ` — ${p.clinic_address}` : ""}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {p.phone && (
                      <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs" onClick={() => openWhatsApp(p.phone)}>
                        <Phone className="h-3 w-3" />
                        WhatsApp
                      </Button>
                    )}
                    {p.email && (
                      <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs" asChild>
                        <a href={`mailto:${p.email}`}>
                          <Mail className="h-3 w-3" />
                          Email
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      className="rounded-xl gap-1.5 text-xs"
                      disabled={referralLoading === p.id}
                      onClick={() => handleReferral(p.id)}
                    >
                      {referralLoading === p.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserCheck className="h-3 w-3" />
                      )}
                      {t("prof.request_referral")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfessionalSearch;
