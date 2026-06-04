import InstallAppCard from "./InstallAppCard";
import { useLanguage } from "@/contexts/LanguageContext";

const TITLE = {
  pt: "Use o Aliv.iA como um app — sem baixar da loja",
  en: "Use Aliv.iA as an app — no store download",
  es: "Usa Aliv.iA como una app — sin descargar de la tienda",
};

const SUB = {
  pt: "Adicione um atalho à tela inicial do seu celular ou computador em segundos. Sempre atualizado, ocupa quase nada de espaço.",
  en: "Add a shortcut to your phone or computer home screen in seconds. Always up to date, uses almost no space.",
  es: "Añade un acceso directo a la pantalla de inicio de tu teléfono o computadora en segundos. Siempre actualizado, ocupa casi nada de espacio.",
};

const InstallAppSection = () => {
  const { language } = useLanguage();
  const lang = (language as "pt" | "en" | "es") || "pt";
  return (
    <section className="py-12 bg-muted/20 border-t border-border/40">
      <div className="container max-w-2xl">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">{TITLE[lang]}</h2>
          <p className="text-sm text-muted-foreground mt-2">{SUB[lang]}</p>
        </div>
        <InstallAppCard defaultOpen={false} hideIfStandalone={false} />
      </div>
    </section>
  );
};

export default InstallAppSection;
