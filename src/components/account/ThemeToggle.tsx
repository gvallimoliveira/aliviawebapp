import { Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { t } = useLanguage();
  return (
    <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5">
      <Label htmlFor="account-dark-theme" className="flex items-center gap-2 text-sm font-medium">
        <Moon className="h-4 w-4 text-primary" />
        {t("account.theme.dark")}
      </Label>
      <Switch id="account-dark-theme" checked={resolvedTheme === "dark"}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
    </div>
  );
}