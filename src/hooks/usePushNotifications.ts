import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// VAPID public key – set via environment or hardcoded after generation
const VAPID_PUBLIC_KEY = "BLE5MFUWCQaytYpQWQsSnahpVAKq8QrQK7Weo4H_NLVkV4A3qUtkNK65CCMyD1TqMLsPKwM_z0A7l3RFjHsXjt8";

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

/** True when an existing subscription was created with a different VAPID key. */
function isStaleSubscription(sub: PushSubscription): boolean {
  const key = sub.options?.applicationServerKey;
  if (!key) return true;
  const current = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  const existing = new Uint8Array(key as ArrayBuffer);
  if (existing.length !== current.length) return true;
  for (let i = 0; i < current.length; i++) if (existing[i] !== current[i]) return true;
  return false;
}

export type PushPermission = "default" | "granted" | "denied" | "unsupported";

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PushPermission>("default");
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [ready, setReady] = useState(false);

  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Register the dedicated push SW on demand.
  const ensurePushSwRegistration = useCallback(async () => {
    if (!isSupported) return null;
    const existing = await navigator.serviceWorker.getRegistration("/sw-push.js");
    if (existing) return existing;
    return navigator.serviceWorker.register("/sw-push.js", { scope: "/" });
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) {
      setPermission("unsupported");
      setReady(true);
      return;
    }
    setPermission(Notification.permission as PushPermission);

    // Check if already subscribed (only if SW already registered)
    if (Notification.permission === "granted" && user) {
      navigator.serviceWorker.getRegistration("/sw-push.js").then(async (reg) => {
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub && isStaleSubscription(sub)) {
            // VAPID keys rotated on the server — drop the dead subscription.
            const endpoint = sub.endpoint;
            await sub.unsubscribe().catch(() => {});
            await (supabase.from("push_subscriptions" as any) as any)
              .delete()
              .eq("user_id", user.id)
              .eq("endpoint", endpoint);
            setSubscribed(false);
          } else {
            setSubscribed(!!sub);
          }
        }
        setReady(true);
      }).catch(() => setReady(true));
    } else {
      setReady(true);
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
      if (sub && isStaleSubscription(sub)) {
        await sub.unsubscribe().catch(() => {});
        sub = null;
      }
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
        });
      }

      const subJson = sub.toJSON();
      const { error } = await (supabase.from("push_subscriptions" as any) as any).upsert(
        {
          user_id: user.id,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh || "",
          auth: subJson.keys?.auth || "",
        },
        { onConflict: "user_id,endpoint" }
      );
      if (error) throw error;

      setSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error("Push subscription failed:", err);
      setLoading(false);
      return false;
    }
  }, [ensurePushSwRegistration, isSupported, user]);

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
    ready,
    dismissed,
    subscribe,
    unsubscribe,
    dismiss,
  };
}
