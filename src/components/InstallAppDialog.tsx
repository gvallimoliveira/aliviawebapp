import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InstallAppGuide from "./InstallAppGuide";
import { useLanguage } from "@/contexts/LanguageContext";

const TITLE = {
  pt: "Instalar Aliv.iA no seu dispositivo",
  en: "Install Aliv.iA on your device",
  es: "Instalar Aliv.iA en tu dispositivo",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const InstallAppDialog = ({ open, onOpenChange }: Props) => {
  const { language } = useLanguage();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLE[language as "pt" | "en" | "es"] || TITLE.pt}</DialogTitle>
        </DialogHeader>
        <InstallAppGuide />
      </DialogContent>
    </Dialog>
  );
};

export default InstallAppDialog;
