import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellRing, BellOff, Loader2, Send, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "@/hooks/use-toast";

interface Props {
  language?: string;
}

const AdminAlertDevices = ({ language = "pt" }: Props) => {
  const isPt = language === "pt";
  const { isSupported, permission, subscribed, loading, ready, subscribe, unsubscribe } =
    usePushNotifications();
  const [devices, setDevices] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("notify-admin", {
      body: { action: "push_status" },
    });
    if (!error && data) setDevices(data.devices ?? 0);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, subscribed]);

  const handleRegister = async () => {
    const ok = await subscribe();
    toast({
      title: ok
        ? isPt
          ? "Dispositivo registrado"
          : "Device registered"
        : isPt
          ? "Não foi possível registrar"
          : "Could not register",
      description: ok
        ? isPt
          ? "Este aparelho passa a receber os alertas de fallback."
          : "This device will now receive fallback alerts."
        : isPt
          ? "Verifique se as notificações estão permitidas no navegador."
          : "Check if notifications are allowed in your browser.",
      variant: ok ? undefined : "destructive",
    });
    refresh();
  };

  const handleTest = async () => {
    setTesting(true);
    const { data, error } = await supabase.functions.invoke("notify-admin", {
      body: { action: "test_push" },
    });
    setTesting(false);
    const ok = !error && data?.ok;
    toast({
      title: ok
        ? isPt
          ? "Teste enviado"
          : "Test sent"
        : isPt
          ? "Falha no teste"
          : "Test failed",
      description: ok
        ? isPt
          ? "Deve chegar em instantes neste aparelho."
          : "It should arrive shortly on this device."
        : isPt
          ? "Nenhum dispositivo registrado para sua conta."
          : "No devices registered for your account.",
      variant: ok ? undefined : "destructive",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BellRing className="h-4 w-4 text-primary" />
          {isPt ? "Central de Alertas — Dispositivos" : "Alert Center — Devices"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          {isPt
            ? "O push é o canal de segurança: ele dispara automaticamente quando o e-mail e o Telegram falharem em entregar um alerta."
            : "Push is the safety net: it fires automatically when email and Telegram both fail to deliver an alert."}
        </p>

        <div className="flex items-center gap-2 text-sm">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {isPt ? "Aparelhos registrados nesta conta:" : "Devices registered on this account:"}
          </span>
          <Badge variant={devices ? "default" : "secondary"}>{devices ?? "—"}</Badge>
        </div>

        {!isSupported ? (
          <p className="text-xs text-destructive">
            {isPt
              ? "Este navegador não suporta notificações push. Use o app instalado na tela de início."
              : "This browser does not support push notifications."}
          </p>
        ) : permission === "denied" ? (
          <p className="text-xs text-destructive">
            {isPt
              ? "As notificações estão bloqueadas nas configurações do navegador para este site."
              : "Notifications are blocked in your browser settings for this site."}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {subscribed ? (
              <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                {isPt ? "Remover este aparelho" : "Remove this device"}
              </Button>
            ) : (
              <Button size="sm" onClick={handleRegister} disabled={loading || !ready} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BellRing className="h-4 w-4" />}
                {isPt ? "Registrar este aparelho" : "Register this device"}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTest}
              disabled={testing || !devices}
              className="gap-2"
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPt ? "Enviar teste" : "Send test"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAlertDevices;
