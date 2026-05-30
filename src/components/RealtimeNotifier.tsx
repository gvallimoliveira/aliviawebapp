import useRealtimeNotifications from "@/hooks/useRealtimeNotifications";

/**
 * Mount once inside the Router so foreground real-time toasts are active
 * on every page (not only the Dashboard). Renders nothing.
 */
const RealtimeNotifier = () => {
  useRealtimeNotifications();
  return null;
};

export default RealtimeNotifier;
