import { useLanguage } from "@/contexts/LanguageContext";
import logoAlivia from "@/assets/logo-alivia.png";
import { Mail } from "lucide-react";
import AppVersionBadge from "@/components/AppVersionBadge";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/40 bg-muted/20 py-10">
      <div className="container text-center">
        <img src={logoAlivia} alt="Aliv.iA" className="mx-auto mb-4 h-10 w-10 opacity-70" />
        <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
          <a href="/blog" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Blog
          </a>
          <a href="/privacidade" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacidade
          </a>
          <a href="/termos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Termos de Uso
          </a>
          <a
            href="mailto:aliviawebapp@gmail.com"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            Contato
          </a>
        </div>

        <p className="mb-3 text-sm text-muted-foreground">{t("footer.disclaimer")}</p>
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Aliv.iA. {t("footer.rights")}
        </p>
        <div className="mt-3">
          <AppVersionBadge />
        </div>
      </div>
    </footer>
  );
};

export default Footer;
