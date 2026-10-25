import { useCallback, useEffect, useState } from "react";
import { BookmarkPlus, ChevronDown, Loader2, Megaphone, Pencil, Trash2, Archive, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  AUDIENCE_LABEL, BUILTIN_TEMPLATES, CATEGORY_EMOJI, CATEGORY_LABEL, notifyAnnouncement, safeCtaUrl,
  type AnnouncementAudience, type AnnouncementCategory,
} from "@/lib/announcements";

interface Props { clinicId?: string | null; professionalId?: string | null }

interface Row {
  id: string; category: AnnouncementCategory; audience: AnnouncementAudience; title: string; body: string;
  cta_label: string | null; cta_url: string | null; expires_at: string | null; published_at: string; archived: boolean;
}
interface Tpl { id: string; name: string; category: AnnouncementCategory; title: string; body: string; cta_label: string | null; cta_url: string | null }

const empty = { category: "notice" as AnnouncementCategory, audience: "all" as AnnouncementAudience, title: "", body: "", cta_label: "", cta_url: "", expires_at: "" };

const AnnouncementsManager = ({ clinicId, professionalId }: Props) => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Tpl[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [reach, setReach] = useState<{ patients: number; with_app: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const scope = clinicId ? { clinic_id: clinicId, professional_id: null } : { clinic_id: null, professional_id: professionalId || null };
  const ready = !!clinicId || !!professionalId;

  const load = useCallback(async () => {
    if (!ready) return;
    const apply = (q: any) => clinicId ? q.eq("clinic_id", clinicId) : q.is("clinic_id", null).eq("professional_id", professionalId);
    const [a, t] = await Promise.all([
      apply((supabase.from("patient_announcements" as any) as any).select("*")).order("published_at", { ascending: false }).limit(30),
      apply((supabase.from("announcement_templates" as any) as any).select("*")).order("name"),
    ]);
    setRows((a.data as Row[]) || []);
    setTemplates((t.data as Tpl[]) || []);
  }, [clinicId, professionalId, ready]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!open || !ready) return;
    let cancel = false;
    (supabase.rpc as any)("count_announcement_audience", { _clinic_id: scope.clinic_id, _professional_id: scope.professional_id, _audience: form.audience })
      .then(({ data }: any) => { if (!cancel) setReach(Array.isArray(data) ? data[0] : data); });
    return () => { cancel = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, form.audience, clinicId, professionalId]);

  const openNew = () => { setEditId(null); setForm(empty); setOpen(true); };
  const openEdit = (r: Row) => {
    setEditId(r.id);
    setForm({ category: r.category, audience: r.audience, title: r.title, body: r.body, cta_label: r.cta_label || "", cta_url: r.cta_url || "", expires_at: r.expires_at || "" });
    setOpen(true);
  };
  const applyTemplate = (t: { category: AnnouncementCategory; title: string; body: string; cta_label?: string | null; cta_url?: string | null }) =>
    setForm((f) => ({ ...f, category: t.category, title: t.title, body: t.body, cta_label: t.cta_label || "", cta_url: t.cta_url || "" }));

  const validate = () => {
    if (!form.title.trim() || !form.body.trim()) { toast.error("Preencha título e mensagem."); return false; }
    if (form.cta_url.trim() && !safeCtaUrl(form.cta_url)) { toast.error("Link do botão deve começar com https:// ou /"); return false; }
    return true;
  };

  const payload = () => ({
    category: form.category, audience: form.audience, title: form.title.trim().slice(0, 120), body: form.body.trim().slice(0, 2000),
    cta_label: form.cta_label.trim() || null, cta_url: safeCtaUrl(form.cta_url), expires_at: form.expires_at || null,
    updated_at: new Date().toISOString(),
  });

  const save = async () => {
    if (!user || !validate()) return;
    setBusy(true);
    try {
      if (editId) {
        const { error } = await (supabase.from("patient_announcements" as any) as any).update(payload()).eq("id", editId);
        if (error) throw error;
        toast.success("Aviso atualizado (sem nova notificação).");
      } else {
        const { data, error } = await (supabase.from("patient_announcements" as any) as any)
          .insert({ ...payload(), ...scope, author_user_id: user.id }).select("id").single();
        if (error) throw error;
        void notifyAnnouncement(data.id);
        toast.success("Aviso publicado e notificação enviada.");
      }
      setOpen(false);
      void load();
    } catch (e: any) { toast.error(e?.message || "Não foi possível salvar."); }
    finally { setBusy(false); }
  };

  const saveTemplate = async () => {
    if (!user || !form.title.trim() || !form.body.trim()) { toast.error("Preencha título e mensagem."); return; }
    const name = window.prompt("Nome do modelo", form.title.slice(0, 80));
    if (!name?.trim()) return;
    const { error } = await (supabase.from("announcement_templates" as any) as any).insert({
      ...scope, created_by: user.id, name: name.trim().slice(0, 80), category: form.category, title: form.title.trim(), body: form.body.trim(),
      cta_label: form.cta_label.trim() || null, cta_url: safeCtaUrl(form.cta_url),
    });
    if (error) toast.error(error.message); else { toast.success("Modelo salvo."); void load(); }
  };

  const deleteTemplate = async (id: string) => {
    await (supabase.from("announcement_templates" as any) as any).delete().eq("id", id);
    void load();
  };

  const toggleArchive = async (r: Row) => {
    await (supabase.from("patient_announcements" as any) as any).update({ archived: !r.archived }).eq("id", r.id);
    void load();
  };

  if (!ready) return null;
  const activeCount = rows.filter((r) => !r.archived).length;

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="flex items-center gap-2 text-left" onClick={() => setExpanded((v) => !v)}>
            <Megaphone className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Avisos aos pacientes</span>
            <Badge variant="secondary">{activeCount} ativo(s)</Badge>
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <Button type="button" size="sm" onClick={openNew}><Send className="h-4 w-4 mr-1" />Novo aviso</Button>
        </div>

        {expanded && (
          <div className="space-y-2 max-h-[360px] overflow-y-auto">
            {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aviso publicado ainda.</p>}
            {rows.map((r) => (
              <div key={r.id} className={`rounded-lg border p-3 ${r.archived ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{CATEGORY_EMOJI[r.category]} {r.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.body}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {new Date(r.published_at).toLocaleDateString("pt-BR")} · {AUDIENCE_LABEL[r.audience].split(" (")[0]}
                      {r.expires_at ? ` · até ${r.expires_at.split("-").reverse().join("/")}` : ""}{r.archived ? " · arquivado" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button type="button" size="icon" variant="ghost" aria-label="Editar" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                    <Button type="button" size="icon" variant="ghost" aria-label={r.archived ? "Reativar" : "Arquivar"} onClick={() => toggleArchive(r)}><Archive className="h-4 w-4" /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar aviso" : "Novo aviso"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!editId && (
              <div className="space-y-1">
                <Label>Começar de um modelo</Label>
                <div className="flex flex-wrap gap-1.5">
                  {BUILTIN_TEMPLATES.map((t) => (
                    <Button key={t.name} type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => applyTemplate(t)}>{t.name}</Button>
                  ))}
                  {templates.map((t) => (
                    <span key={t.id} className="inline-flex items-center">
                      <Button type="button" size="sm" variant="secondary" className="h-7 text-xs rounded-r-none" onClick={() => applyTemplate(t)}>{t.name}</Button>
                      <Button type="button" size="icon" variant="secondary" className="h-7 w-7 rounded-l-none" aria-label="Excluir modelo" onClick={() => deleteTemplate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as AnnouncementCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CATEGORY_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Exibir até</Label>
                <Input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Lista de envio</Label>
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as AnnouncementAudience })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(AUDIENCE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
              </Select>
              {reach && <p className="text-xs text-muted-foreground">{reach.patients} paciente(s) na lista · {reach.with_app} com conta no app recebem o aviso.</p>}
            </div>
            <div className="space-y-1"><Label>Título</Label><Input maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-1"><Label>Mensagem</Label><Textarea rows={4} maxLength={2000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label>Botão (opcional)</Label><Input placeholder="Ex.: Pedir horário" value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} /></div>
              <div className="space-y-1"><Label>Link do botão</Label><Input placeholder="https://..." value={form.cta_url} onChange={(e) => setForm({ ...form, cta_url: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" onClick={saveTemplate}><BookmarkPlus className="h-4 w-4 mr-1" />Salvar como modelo</Button>
            <Button type="button" onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editId ? "Salvar" : "Publicar e notificar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AnnouncementsManager;
