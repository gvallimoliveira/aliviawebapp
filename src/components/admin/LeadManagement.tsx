import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Download, Share2, Search, TrendingUp, CheckCircle, Star, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  patient_email: string;
  patient_name: string | null;
  created_at: string;
  status: string;
  pain_score: number | null;
  pain_regions: string[] | null;
}

interface Metrics {
  total_leads: number;
  completed: number;
  converted_premium: number;
}

interface LeadManagementProps {
  language: string;
}

const LeadManagement = ({ language }: LeadManagementProps) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const isPt = language === "pt";
  const t = isPt ? {
    title: "Leads Capturados",
    desc: "E-mails coletados de avaliações básicas gratuitas",
    email: "E-mail",
    date: "Data",
    status: "Status",
    painScore: "Dor",
    regions: "Regiões",
    noLeads: "Nenhum lead capturado ainda.",
    exportCsv: "Exportar CSV",
    shareWa: "Enviar via WhatsApp",
    search: "Buscar por nome ou e-mail...",
    inProgress: "Em andamento",
    completed: "Completa",
    totalLeads: "Total de Leads",
    completedAssessments: "Avaliações Completas",
    convertedPremium: "Convertidos Premium",
    conversionRate: "Taxa de Conversão",
  } : {
    title: "Captured Leads",
    desc: "Emails collected from free basic assessments",
    email: "Email",
    date: "Date",
    status: "Status",
    painScore: "Pain",
    regions: "Regions",
    noLeads: "No leads captured yet.",
    exportCsv: "Export CSV",
    shareWa: "Share via WhatsApp",
    search: "Search by name or email...",
    inProgress: "In progress",
    completed: "Completed",
    totalLeads: "Total Leads",
    completedAssessments: "Completed Assessments",
    convertedPremium: "Converted to Premium",
    conversionRate: "Conversion Rate",
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "list_leads" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setLeads(data?.leads || []);
      setMetrics(data?.metrics || null);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = leads.filter((l) =>
    `${l.patient_name || ""} ${l.patient_email}`.toLowerCase().includes(search.toLowerCase())
  );

  const exportCsv = () => {
    if (filtered.length === 0) return;
    const header = "Email,Data,Status,Score de Dor,Regiões\n";
    const rows = filtered.map((l) =>
      `"${l.patient_email}","${new Date(l.created_at).toLocaleDateString(isPt ? "pt-BR" : "en-US")}","${l.status}","${l.pain_score ?? ""}","${(l.pain_regions || []).join("; ")}"`
    ).join("\n");

    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteLead = async (id: string) => {
    if (!confirm(isPt ? "Excluir este lead?" : "Delete this lead?")) return;
    try {
      const { error } = await supabase.functions.invoke("manage-vip-users", {
        body: { action: "delete_lead", id },
      });
      if (error) throw error;
      setLeads((prev) => prev.filter((l) => l.id !== id));
      toast({ title: isPt ? "Lead excluído" : "Lead deleted" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const shareWhatsApp = () => {
    if (filtered.length === 0) return;
    const lines = filtered.slice(0, 50).map((l, i) =>
      `${i + 1}. ${l.patient_email} — ${l.status === "completed" ? "✅" : "⏳"} — Dor: ${l.pain_score ?? "?"}`
    );
    const text = `📋 *Leads Aliv.iA* (${filtered.length} total)\n\n${lines.join("\n")}${filtered.length > 50 ? `\n\n... e mais ${filtered.length - 50}` : ""}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const conversionRate = metrics && metrics.total_leads > 0
    ? ((metrics.converted_premium / metrics.total_leads) * 100).toFixed(1)
    : "0";

  if (loading) {
    return (
      <Card className="mt-6">
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <Mail className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{metrics.total_leads}</p>
              <p className="text-xs text-muted-foreground">{t.totalLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{metrics.completed}</p>
              <p className="text-xs text-muted-foreground">{t.completedAssessments}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <Star className="h-5 w-5 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{metrics.converted_premium}</p>
              <p className="text-xs text-muted-foreground">{t.convertedPremium}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 px-4 text-center">
              <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground">{t.conversionRate}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">{t.title}</CardTitle>
                <CardDescription>{filtered.length} lead(s) — {t.desc}</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0} className="gap-1">
                <Download className="h-4 w-4" /> {t.exportCsv}
              </Button>
              <Button variant="outline" size="sm" onClick={shareWhatsApp} disabled={filtered.length === 0} className="gap-1">
                <Share2 className="h-4 w-4" /> {t.shareWa}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">{t.noLeads}</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.email}</TableHead>
                    <TableHead>{t.date}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead>{t.painScore}</TableHead>
                    <TableHead>{t.regions}</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell><p className="font-medium">{lead.patient_name || "—"}</p><p className="text-muted-foreground break-all">{lead.patient_email}</p></TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(lead.created_at).toLocaleDateString(isPt ? "pt-BR" : "en-US")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={lead.status === "completed" ? "default" : "secondary"}>
                          {lead.status === "completed" ? t.completed : t.inProgress}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.pain_score ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {(lead.pain_regions || []).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => deleteLead(lead.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadManagement;
