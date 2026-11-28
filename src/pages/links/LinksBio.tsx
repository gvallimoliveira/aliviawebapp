import { useEffect } from "react";
import { ArrowUpRight, Building2, GraduationCap, Heart, Instagram, MessageCircle, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { setSeo } from "@/lib/seo";
import logoAlivia from "@/assets/logo-alivia.png";
import { BIO_INSTAGRAM, BIO_WHATSAPP, bioCopy, bioHref } from "./linksBioData";

export default function LinksBio() {
  const { language } = useLanguage();
  const copy = bioCopy[language];

  useEffect(() => {
    setSeo({ title: "Aliv.iA | Links", description: copy.description, url: "https://aliviawebapp.com.br/links" });
  }, [copy.description]);

  const destinations = [
    { path: "/profissionais", icon: Stethoscope, text: copy.pro, primary: true },
    { path: "/clinica", icon: Building2, text: copy.clinic, primary: true },
    { path: "/academico", icon: GraduationCap, text: copy.academic, primary: false },
    { path: "/para-pacientes", icon: Heart, text: copy.patient, primary: false },
  ];

  return (
    <main className="links-bio min-h-dvh bg-background px-5 py-6 text-foreground flex items-center justify-center" lang={language}>
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <img src={logoAlivia} alt="" width={56} height={56} className="mx-auto mb-2 h-14 w-14 object-contain" />
          <h1 className="text-2xl font-semibold leading-tight">Aliv.iA</h1>
          <p className="mx-auto mt-2 max-w-64 text-sm leading-5 text-muted-foreground">{copy.tagline}</p>
        </header>

        <nav aria-label="Aliv.iA" className="flex flex-col gap-3">
          {destinations.map(({ path, icon: Icon, text, primary }) => (
            <Button key={path} asChild variant={primary ? "default" : "outline"}
              className="h-auto min-h-20 w-full justify-start gap-4 whitespace-normal rounded-lg px-4 py-3 text-left">
              <a href={bioHref(path)}>
                <Icon aria-hidden="true" className="!size-5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-base font-semibold leading-6">{text[0]}</span>
                  <span className="block text-sm font-normal leading-5">{text[1]}</span>
                </span>
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          ))}
        </nav>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-2">
          <Button asChild variant="ghost" className="h-11 gap-2 px-2 text-xs">
            <a href={BIO_WHATSAPP} target="_blank" rel="noopener noreferrer" aria-label={`${copy.contact} — WhatsApp`}>
              <MessageCircle aria-hidden="true" />{copy.contact}
            </a>
          </Button>
          <Button asChild variant="ghost" className="h-11 gap-2 px-2 text-xs">
            <a href={BIO_INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram — @alivia.fisioapp">
              <Instagram aria-hidden="true" />@alivia.fisioapp
            </a>
          </Button>
        </div>
      </div>
    </main>
  );
}