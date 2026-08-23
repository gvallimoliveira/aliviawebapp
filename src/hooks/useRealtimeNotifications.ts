import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Foreground real-time notifications.
 *
 * Push notifications (sw-push.js) handle the BACKGROUND case (app closed or
 * tab unfocused). On most mobile browsers, however, system push banners are
 * suppressed while the app is in the foreground — so the user sees nothing
 * even though permission is granted.
 *
 * This hook fills that gap by subscribing to Supabase Realtime and showing
 * an in-app sonner toast for:
 *   - new chat messages where I am the recipient
 *   - new assessments assigned to me as a professional
 *
 * RLS already filters realtime payloads, so we only receive rows we can SELECT.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const locRef = useRef(location);
  locRef.current = location;

  useEffect(() => {
    if (!user) return;

    let proId: string | null = null;
    let cancelled = false;
    const channels: ReturnType<typeof supabase.channel>[] = [];

    (async () => {
      // Fetch professional id (if any) so we can filter assessment inserts
      const { data: pro } = await supabase
        .from("professionals")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      proId = pro?.id || null;

      // --- Messages channel ---
      const msgCh = supabase
        .channel(`rt-msgs-${user.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          async (payload) => {
            const row: any = payload.new;
            if (!row || row.sender_user_id === user.id) return;

            // Suppress toast if the user is already viewing this conversation
            const loc = locRef.current;
            const currentConv = new URLSearchParams(loc.search).get("conv");
            if (currentConv === row.conversation_id && loc.pathname.includes("/dashboard")) {
              return;
            }

            // Best-effort sender name
            let senderName = "Nova mensagem";
            try {
              const { data: prof } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", row.sender_user_id)
                .maybeSingle();
              if (prof?.full_name) senderName = prof.full_name;
            } catch {
              /* noop */
            }

            const preview = String(row.content || "").slice(0, 80);
            toast(senderName, {
              description: preview,
              action: {
                label: "Abrir",
                onClick: () =>
                  navigate(`/dashboard?tab=messages&conv=${row.conversation_id}`),
              },
              duration: 8000,
            });
          },
        )
        .subscribe();
      channels.push(msgCh);

      // --- Assessments channel (professional only) ---
      if (proId) {
        const asmCh = supabase
          .channel(`rt-asm-${user.id}`)
          // Only notify when the patient FINISHES (status -> completed).
          // We intentionally do NOT notify on INSERT: the assessment row is
          // created as soon as the patient opens the link, which produced
          // "nova avaliação recebida" before anything was filled in.

          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "assessments",
              filter: `professional_id=eq.${proId}`,
            },
            (payload) => {
              const oldRow: any = payload.old;
              const row: any = payload.new;
              if (!row) return;
              const ad = row.anamnesis_data;
              if (ad && typeof ad === "object" && (ad.externalPatient || ad.quickEvolutionOnly || ad.placeholder)) return;
              // payload.old may be empty (replica identity), so rely on the new
              // status plus a local dedupe set.
              if (row.status !== "completed") return;
              if (notifiedRef.has(row.id)) return;
              notifiedRef.add(row.id);

              const name = row.patient_name || "Paciente";
              toast("Avaliação concluída", {
                description: `${name} finalizou a avaliação. Toque para revisar.`,
                action: {
                  label: "Revisar",
                  onClick: () => navigate(`/assessment/view/${row.id}`),
                },
                duration: 10000,
              });
            },
          )
          .subscribe();
        channels.push(asmCh);
      }
    })();

    return () => {
      cancelled = true;
      channels.forEach((c) => supabase.removeChannel(c));
    };
  }, [user, navigate]);
}

export default useRealtimeNotifications;
