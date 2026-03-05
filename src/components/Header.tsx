import { Globe, LogOut, ShieldCheck, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import logoAlivia from "@/assets/logo-alivia.png";

const Header = () => {
  const { t, toggleLanguage } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
          <img src={logoAlivia} alt="Aliv.iA" className="h-9" />
          <span className="text-xl font-bold text-foreground">Aliv.iA</span>
        </div>

        <nav className="hidden items-center gap-6 md:flex">
          <a href="#compare" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("compare.title")}
          </a>
          <a href="#how" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("how.title")}
          </a>
          <a href="/blog" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t("blog.title")}
          </a>
          <button
            onClick={() => navigate("/professional/register")}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
          >
            <Stethoscope className="h-3.5 w-3.5" />
            {t("nav.professional")}
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-1.5">
            <Globe className="h-4 w-4" />
            {t("nav.language")}
          </Button>
          {user ?
          <>
              <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} title="Admin">
                <ShieldCheck className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                {t("nav.dashboard")}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-1.5">
                <LogOut className="h-4 w-4" />
              </Button>
            </> :

          <Button variant="outline" size="sm" onClick={() => navigate("/auth")}>
              {t("nav.login")}
            </Button>
          }
        </div>
      </div>
    </header>);

};

export default Header;