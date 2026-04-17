import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// VAPID public key – set via environment or hardcoded after generation
const VAPID_PUBLIC_KEY = "BNo8Gc1tni049SB-9WdE7nJ-UKWElkV6FnfJ_mZ4_M32Elm83gvjaR-zO9hY4E_ZNYCaKQAGbrFO0KlcpmgJLL8";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Register the dedicated push SW on demand. This worker is scoped only to
  // push events and never intercepts fetch/navigation, so it cannot break
  // authentication like the previous global PWA SW did.
  const ensurePushSwRegistration = useCallback(async () => {
    if (!isSupported) return null;
    const existing = await navigator.serviceWorker.getRegistration("/sw-push.js");
    if (existing) return existing;
    return navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PushPermission);

    // Check if already subscribed (only if SW already registered)
    if (Notification.permission === "granted" && user) {
      navigator.serviceWorker.getRegistration("/sw-push.js").then(async (reg) => {
        if (!reg) return;
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || !VAPID_PUBLIC_KEY) return false;
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm as PushPermission);
      if (perm !== "granted") {
        setLoading(false);
        return false;
      }

      const reg = (await ensurePushSwRegistration()) ?? (await navigator.serviceWorker.ready);
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
      }

      const subJson = sub.toJSON();
      await (supabase.from("push_subscriptions" as any) as any).upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh || "",
          auth: subJson.keys?.auth || "",
        },
        { onConflict: "user_id,endpoint" }
      );

      setSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      setLoading(false);
      return false;
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw-push.js");
      if (!reg) {
        setSubscribed(false);
        setLoading(false);
        return;
      }
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await (supabase.from("push_subscriptions" as any) as any)
          .delete()
          .eq("user_id", user.id)
          .eq("endpoint", endpoint);
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe failed:", err);
    } finally {
      setLoading(false);
    }
  }, [isSupported, user]);

  // Dismissed means user said no via our UI (stored in localStorage)
  const [dismissed, setDismissedState] = useState(() => {
    try {
      return localStorage.getItem("push_opt_in_dismissed_v2") === "true";
    } catch {
      return false;
    }
  });

  const dismiss = useCallback(() => {
    setDismissedState(true);
    try {
      localStorage.setItem("push_opt_in_dismissed_v2", "true");
    } catch {}
  }, []);

  return {
    permission,
    subscribed,
    loading,
    isSupported,
    dismissed,
    subscribe,
    unsubscribe,
    dismiss,
  };
}
