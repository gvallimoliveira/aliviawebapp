import { useEffect, useMemo, useState } from "react";
import { Smartphone, Apple, Monitor, Share, MoreVertical, Plus, Download, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

const COPY = {
  pt: {
    intro: "O Aliv.iA é um site que funciona como app — sem baixar da loja, sem ocupar espaço. Adicione um atalho na tela inicial e use como se fosse um aplicativo nativo.",
    badge: "Sempre atualizado, leve, e funciona em qualquer celular.",
    ios: [
      { icon: Share, text: "Abra este site no Safari (não funciona em apps como Instagram ou Facebook)." },
      { icon: Share, text: "Toque no botão Compartilhar (quadrado com seta para cima), na barra inferior." },
      { icon: Plus, text: "Role e toque em \"Adicionar à Tela de Início\"." },
      { icon: CheckCircle2, text: "Toque em \"Adicionar\" — o ícone do Aliv.iA aparece como um app." },
    ],
    android: [
      { icon: Smartphone, text: "Abra este site no Chrome (recomendado)." },
      { icon: MoreVertical, text: "Toque no menu (três pontinhos), no canto superior direito." },
      { icon: Download, text: "Escolha \"Instalar app\" ou \"Adicionar à tela inicial\"." },
      { icon: CheckCircle2, text: "Confirme. O Aliv.iA aparece como app na tela inicial." },
    ],
    desktop: [
      { icon: Monitor, text: "Abra este site no Chrome, Edge ou Brave." },
      { icon: Download, text: "Clique no ícone de instalar (monitor com seta) na barra de endereços, à direita." },
      { icon: CheckCircle2, text: "Clique em \"Instalar\". O Aliv.iA abre como um app independente." },
    ],
    installed: "Você já está usando o Aliv.iA como app instalado ✓",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Computador" },
  },
  en: {
    intro: "Aliv.iA is a website that works like an app — no store download, no extra space. Add a home-screen shortcut and use it like a native app.",
    badge: "Always up to date, lightweight, works on any phone.",
    ios: [
      { icon: Share, text: "Open this site in Safari (doesn't work in apps like Instagram or Facebook)." },
      { icon: Share, text: "Tap the Share button (square with up arrow) at the bottom." },
      { icon: Plus, text: "Scroll and tap \"Add to Home Screen\"." },
      { icon: CheckCircle2, text: "Tap \"Add\" — the Aliv.iA icon appears as an app." },
    ],
    android: [
      { icon: Smartphone, text: "Open this site in Chrome (recommended)." },
      { icon: MoreVertical, text: "Tap the menu (three dots) in the top-right." },
      { icon: Download, text: "Choose \"Install app\" or \"Add to home screen\"." },
      { icon: CheckCircle2, text: "Confirm. Aliv.iA appears as an app on your home screen." },
    ],
    desktop: [
      { icon: Monitor, text: "Open this site in Chrome, Edge, or Brave." },
      { icon: Download, text: "Click the install icon (monitor with arrow) on the right of the address bar." },
      { icon: CheckCircle2, text: "Click \"Install\". Aliv.iA opens as a standalone app." },
    ],
    installed: "You're already using Aliv.iA as an installed app ✓",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Computer" },
  },
  es: {
    intro: "Aliv.iA es un sitio que funciona como app — sin descargar de la tienda, sin ocupar espacio. Añade un acceso directo a la pantalla de inicio y úsalo como una app nativa.",
    badge: "Siempre actualizado, ligero, funciona en cualquier teléfono.",
    ios: [
      { icon: Share, text: "Abre este sitio en Safari (no funciona en apps como Instagram o Facebook)." },
      { icon: Share, text: "Toca el botón Compartir (cuadrado con flecha hacia arriba), abajo." },
      { icon: Plus, text: "Desplaza y toca \"Añadir a pantalla de inicio\"." },
      { icon: CheckCircle2, text: "Toca \"Añadir\" — el ícono de Aliv.iA aparece como una app." },
    ],
    android: [
      { icon: Smartphone, text: "Abre este sitio en Chrome (recomendado)." },
      { icon: MoreVertical, text: "Toca el menú (tres puntos) arriba a la derecha." },
      { icon: Download, text: "Elige \"Instalar app\" o \"Añadir a pantalla de inicio\"." },
      { icon: CheckCircle2, text: "Confirma. Aliv.iA aparece como app en tu pantalla de inicio." },
    ],
    desktop: [
      { icon: Monitor, text: "Abre este sitio en Chrome, Edge o Brave." },
      { icon: Download, text: "Haz clic en el ícono de instalar (monitor con flecha) a la derecha de la barra de direcciones." },
      { icon: CheckCircle2, text: "Haz clic en \"Instalar\". Aliv.iA se abre como una app independiente." },
    ],
    installed: "Ya estás usando Aliv.iA como app instalada ✓",
    tabs: { ios: "iPhone / iPad", android: "Android", desktop: "Computadora" },
  },
};

interface Props {
  compact?: boolean;
}

const InstallAppGuide = ({ compact = false }: Props) => {
  const { language } = useLanguage();
  const t = COPY[language as "pt" | "en" | "es"] || COPY.pt;
  const [platform, setPlatform] = useState<Platform>("ios");
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    if (typeof window !== "undefined" && window.matchMedia) {
      setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);
    }
  }, []);

  const renderSteps = (steps: { icon: any; text: string }[]) => (
    <ol className="space-y-3 mt-3">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <li key={i} className="flex gap-3 items-start">
            <span className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-semibold">
              {i + 1}
            </span>
            <div className="flex-1 flex items-start gap-2 pt-0.5">
              <Icon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground/90">{s.text}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );

  if (isStandalone) {
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm text-primary flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4" />
        {t.installed}
      </div>
    );
  }

  return (
    <div className={compact ? "" : "space-y-3"}>
      {!compact && (
        <>
          <p className="text-sm text-muted-foreground">{t.intro}</p>
          <p className="text-xs text-primary font-medium">{t.badge}</p>
        </>
      )}
      <Tabs value={platform} onValueChange={(v) => setPlatform(v as Platform)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ios" className="text-xs gap-1">
            <Apple className="h-3.5 w-3.5" /> {t.tabs.ios}
          </TabsTrigger>
          <TabsTrigger value="android" className="text-xs gap-1">
            <Smartphone className="h-3.5 w-3.5" /> {t.tabs.android}
          </TabsTrigger>
          <TabsTrigger value="desktop" className="text-xs gap-1">
            <Monitor className="h-3.5 w-3.5" /> {t.tabs.desktop}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="ios">{renderSteps(t.ios)}</TabsContent>
        <TabsContent value="android">{renderSteps(t.android)}</TabsContent>
        <TabsContent value="desktop">{renderSteps(t.desktop)}</TabsContent>
      </Tabs>
    </div>
  );
};

export default InstallAppGuide;
