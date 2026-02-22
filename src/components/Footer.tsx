import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/40 bg-muted/20 py-10">
      <div className="container text-center">
        <p className="mb-3 text-sm text-muted-foreground">{t("footer.disclaimer")}</p>
        <p className="text-xs text-muted-foreground/60">
          © {new Date().getFullYear()} Aliv.IA. {t("footer.rights")}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
