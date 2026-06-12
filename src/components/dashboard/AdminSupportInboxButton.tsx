import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Discrete support inbox shortcut, visible only to the platform admin.
 * Shows a red dot + count badge when there are open (unanswered) support tickets.
 */
const AdminSupportInboxButton = ({ userEmail }: { userEmail?: string }) => {
  const navigate = useNavigate();
  const [openCount, setOpenCount] = useState(0);

  const isAdmin = userEmail === "gvallimoliveira@gmail.com";

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const fetchCount = async () => {
      const { data } = await (supabase as any).rpc("get_support_tickets_admin", {
        _include_archived: false,
      });
      if (cancelled) return;
      const open = ((data as any[]) || []).filter((t) => t.status === "open").length;
      setOpenCount(open);
    };

    fetchCount();

    // Realtime: refresh on any change to support_tickets
    const ch = supabase
      .channel("admin-support-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets" },
        () => fetchCount(),
      )
      .subscribe();

    // Safety poll every 60s in case realtime drops
    const iv = setInterval(fetchCount, 60_000);

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
      clearInterval(iv);
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <button
      onClick={() => navigate("/admin?tab=support")}
      aria-label={`Solicitações de suporte${openCount ? ` (${openCount} nova(s))` : ""}`}
      title={openCount ? `${openCount} solicitação(ões) aberta(s)` : "Solicitações de suporte"}
      className="relative inline-flex items-center justify-center h-8 w-8 rounded-full bg-muted/60 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
    >
      <LifeBuoy className="h-4 w-4" />
      {openCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center leading-none">
          {openCount > 9 ? "9+" : openCount}
        </span>
      )}
    </button>
  );
};

export default AdminSupportInboxButton;
