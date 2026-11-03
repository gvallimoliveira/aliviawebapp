import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

const BlogDashboardReturn = () => {
  const { user } = useAuth();
  const { language } = useLanguage();
  if (!user) return null;

  const label = language === "en" ? "Back to dashboard" : language === "es" ? "Volver al panel" : "Voltar ao painel";

  return (
    <Button asChild variant="outline" size="sm">
      <Link to="/dashboard">
        <ArrowLeft aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
};

export default BlogDashboardReturn;