import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ContactClinicButtonProps {
  clinicId: string;
  clinicName?: string | null;
  className?: string;
  size?: "sm" | "default";
}

/**
 * Lets a clinic patient open (or reuse) a conversation with the clinic's
 * secretary (or owner, as fallback). Routes the patient to the messages tab
 * with the resulting conversation opened.
 */
const ContactClinicButton = ({ clinicId, clinicName, className, size = "sm" }: ContactClinicButtonProps) => {
  const { language } = useLanguage();
  const isPt = language === "pt";
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("create_conversation_with_clinic_staff", {
        _clinic_id: clinicId,
      });
      if (error) throw error;
      navigate(`/dashboard?tab=messages&conv=${data}`);
    } catch (err: any) {
      console.error("contact-clinic failed:", err);
      toast({
        title: isPt ? "Não foi possível abrir a conversa" : "Could not open the conversation",
        description: err?.message || (isPt ? "Tente novamente em instantes." : "Please try again."),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      className={`gap-2 rounded-xl ${className || ""}`}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      {isPt
        ? clinicName ? `Falar com ${clinicName}` : "Falar com a clínica"
        : clinicName ? `Message ${clinicName}` : "Message the clinic"}
    </Button>
  );
};

export default ContactClinicButton;
