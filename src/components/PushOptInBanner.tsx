import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Bell, X } from "lucide-react";

const DISMISS_KEY = "push_opt_in_dismissed_v2";

const PushOptInBanner = () => {
  const { user } = useAuth();
  const { permission, subscribed, loading, isSupported, subscribe } = usePushNotifications();

  // Check versioned dismiss key directly
  const isDismissed = (() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  })();

  if (!user || !isSupported || subscribed || permission === "denied" || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {}
    // Force re-render by reloading — simplest approach
    window.location.reload();
  };

  const handleSubscribe = async () => {
    const ok = await subscribe();
    if (ok) {
      try {
        localStorage.setItem(DISMISS_KEY, "true");
      } catch {}
    }
  };

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center gap-3 mb-4">
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
        <Bell className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          Ative as notificações
        </p>
        <p className="text-xs text-muted-foreground">
          Receba lembretes do diário de dor, avisos de desconto e atualizações importantes.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button size="sm" onClick={handleSubscribe} disabled={loading}>
          {loading ? "..." : "Ativar"}
        </Button>
        <button
          onClick={handleDismiss}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Dispensar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PushOptInBanner;
