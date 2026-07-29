import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserCheck, MessageSquare, Mail, FileText, Loader2 } from "lucide-react";

interface DashboardMetrics {
  totalVips: number;
  pendingPros: number;
  openTickets: number;
  newLeads7d: number;
  publishedPosts: number;
}

interface Props {
  language: string;
  onNavigate: (tab: string) => void;
}

const AdminDashboard = ({ language, onNavigate }: Props) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const isPt = language === "pt";

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const [vipRes, proRes, ticketRes, leadRes, blogRes] = await Promise.all([
        supabase.functions.invoke("manage-vip-users", { body: { action: "list_vip" } }),
        (supabase.from("professionals" as any) as any).select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.functions.invoke("manage-vip-users", { body: { action: "list_leads" } }),
        supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("published", true),
      ]);

      setMetrics({
        totalVips: vipRes.data?.vip_users?.length || 0,
        pendingPros: proRes.count || 0,
        openTickets: ticketRes.count || 0,
        newLeads7d: leadRes.data?.metrics?.total_leads || 0,
        publishedPosts: blogRes.count || 0,
      });
    } catch (err) {
      console.error("Error fetching admin metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    {
      icon: Users,
      label: isPt ? "Usuários VIP" : "VIP Users",
      value: metrics?.totalVips ?? 0,
      tab: "users",
      color: "text-primary",
    },
    {
      icon: UserCheck,
      label: isPt ? "Profissionais Cadastrados" : "Registered Professionals",
      value: metrics?.pendingPros ?? 0,
      tab: "professionals",
      color: "text-emerald-500",
    },
    {
      icon: MessageSquare,
      label: isPt ? "Tickets Abertos" : "Open Tickets",
      value: metrics?.openTickets ?? 0,
      tab: "support",
      color: "text-orange-500",
      urgent: (metrics?.openTickets ?? 0) > 0,
    },
    {
      icon: Mail,
      label: isPt ? "Total de Leads" : "Total Leads",
      value: metrics?.newLeads7d ?? 0,
      tab: "leads",
      color: "text-blue-500",
    },
    {
      icon: FileText,
      label: isPt ? "Posts Publicados" : "Published Posts",
      value: metrics?.publishedPosts ?? 0,
      tab: "content",
      color: "text-green-500",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <Card
            key={card.tab}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onNavigate(card.tab)}
          >
            <CardContent className="pt-4 pb-3 px-4 text-center relative">
              <card.icon className={`h-6 w-6 mx-auto mb-2 ${card.color}`} />
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              {card.urgent && (
                <Badge className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5">
                  !
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AdminAlertDevices language={language} />
    </div>
  );
};

export default AdminDashboard;
