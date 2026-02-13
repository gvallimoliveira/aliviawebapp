import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, LogOut, Plus, ClipboardList, Calendar, MapPin } from "lucide-react";

const Dashboard = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const { t, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()
        .then(({ data }) => setProfile(data));

      supabase
        .from("assessments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setAssessments(data || []));
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <span className="text-lg font-bold text-primary-foreground">M</span>
            </div>
            <span className="text-xl font-bold text-foreground">MoveWell</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
              <Globe className="h-4 w-4" />
              {t("nav.language")}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              {t("nav.logout")}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("dashboard.welcome")}{profile?.full_name ? `, ${profile.full_name}` : ""}
          </h1>
          <p className="text-muted-foreground mt-1">{t("dashboard.subtitle")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="cursor-pointer border-primary/20 hover:border-primary/50 transition-colors" onClick={() => navigate("/assessment/basic")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                {t("dashboard.new_basic")}
              </CardTitle>
              <CardDescription>{t("dashboard.new_basic_desc")}</CardDescription>
            </CardHeader>
          </Card>
          <Card className="cursor-pointer border-primary/20 hover:border-primary/50 transition-colors bg-primary/5" onClick={() => navigate("/assessment/premium")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                {t("dashboard.new_premium")}
              </CardTitle>
              <CardDescription>{t("dashboard.new_premium_desc")}</CardDescription>
            </CardHeader>
          </Card>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">{t("dashboard.history")}</h2>
          {assessments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t("dashboard.no_assessments")}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assessments.map((a) => (
                <Card key={a.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${a.type === "premium" ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground"}`}>
                        {a.type === "premium" ? "Premium" : t("compare.basic")}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(a.created_at).toLocaleDateString()}
                      </div>
                      {a.pain_regions?.length > 0 && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" />
                          {a.pain_regions.join(", ")}
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${a.status === "completed" ? "text-primary" : "text-muted-foreground"}`}>
                      {a.status === "completed" ? t("dashboard.completed") : t("dashboard.in_progress")}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
