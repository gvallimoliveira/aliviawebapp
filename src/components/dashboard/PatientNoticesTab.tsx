import { useCallback, useEffect, useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_EMOJI, CATEGORY_LABEL, safeCtaUrl, type AnnouncementCategory } from "@/lib/announcements";

interface Notice {
  id: string; provider_name: string; provider_logo: string | null; category: AnnouncementCategory; title: string; body: string;
  cta_label: string | null; cta_url: string | null; published_at: string; is_read: boolean;
}

export const useMyNotices = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await (supabase.rpc as any)("get_my_announcements");
    setItems((data as Notice[]) || []);
    setLoading(false);
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);
  return { items, loading, reload: load, setItems };
};

const PatientNoticesTab = ({ onRead }: { onRead?: () => void }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { items, loading, setItems } = useMyNotices();

  useEffect(() => {
    const unread = items.filter((n) => !n.is_read);
    if (!user?.id || unread.length === 0) return;
    void (supabase.from("announcement_reads" as any) as any)
      .upsert(unread.map((n) => ({ announcement_id: n.id, user_id: user.id })), { onConflict: "announcement_id,user_id", ignoreDuplicates: true })
      .then(() => onRead?.());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, user?.id]);

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (items.length === 0) return (
    <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
      <Megaphone className="h-6 w-6 mx-auto mb-2 opacity-60" />Nenhum aviso do seu fisioterapeuta ou clínica no momento.
    </CardContent></Card>
  );

  return (
    <div className="space-y-3">
      {items.map((n) => {
        const href = safeCtaUrl(n.cta_url);
        return (
          <Card key={n.id} className={n.is_read ? "" : "border-primary/40"} onClick={() => setItems((p) => p.map((x) => x.id === n.id ? { ...x, is_read: true } : x))}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {n.provider_logo && <img src={n.provider_logo} alt="" className="h-6 w-6 rounded-full object-cover" />}
                <span className="text-xs font-medium text-muted-foreground">{n.provider_name}</span>
                <Badge variant="outline" className="text-[10px]">{CATEGORY_EMOJI[n.category]} {CATEGORY_LABEL[n.category]}</Badge>
                {!n.is_read && <Badge className="text-[10px]">Novo</Badge>}
                <span className="ml-auto text-[11px] text-muted-foreground">{new Date(n.published_at).toLocaleDateString("pt-BR")}</span>
              </div>
              <p className="font-semibold">{n.title}</p>
              <p className="text-sm whitespace-pre-line text-muted-foreground">{n.body}</p>
              {href && n.cta_label && (
                <Button type="button" size="sm" onClick={() => href.startsWith("/") ? navigate(href) : window.open(href, "_blank", "noopener,noreferrer")}>
                  {n.cta_label}
                </Button>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default PatientNoticesTab;
