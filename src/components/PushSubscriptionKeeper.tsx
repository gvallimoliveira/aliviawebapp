import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { healPushSubscription } from "@/hooks/usePushNotifications";

/**
 * Keeps the push subscription alive across deploys/updates.
 * Once the user opts in, the subscription is silently restored on every
 * boot and whenever the app returns to the foreground. It is only ever
 * removed when the user disables notifications manually.
 */
const PushSubscriptionKeeper = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let active = true;
    const heal = () => {
      if (!active) return;
      void healPushSubscription(user.id);
    };
    const t = setTimeout(heal, 1500);
    const onVisible = () => {
      if (document.visibilityState === "visible") heal();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user]);

  return null;
};

export default PushSubscriptionKeeper;
