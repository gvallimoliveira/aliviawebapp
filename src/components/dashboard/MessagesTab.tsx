import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Stethoscope, MessageCircle } from "lucide-react";
import ConversationList from "@/components/chat/ConversationList";
import ContactClinicButton from "@/components/chat/ContactClinicButton";
import ReceivedReferralsCard from "@/components/dashboard/ReceivedReferralsCard";

interface MessagesTabProps {
  professional?: any;
  initialConversationId?: string | null;
  canInitiateAsPatient?: boolean;
  canInitiateAsProfessional?: boolean;
  clinicId?: string | null;
  /** When set, renders the clinic staff inbox (patients ↔ secretary/owner). */
  clinicStaffInboxId?: string | null;
}

const MessagesTab = ({
  professional,
  initialConversationId,
  canInitiateAsPatient = false,
  canInitiateAsProfessional = false,
  clinicId = null,
  clinicStaffInboxId = null,
}: MessagesTabProps) => {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isPt = language === "pt";
  const [msgSearch, setMsgSearch] = useState("");
  const [msgFilter, setMsgFilter] = useState<"all" | "patient" | "professional">("all");
  const [patientClinics, setPatientClinics] = useState<{ id: string; name: string }[]>([]);

  // Discover clinics the current user is a patient of, so we can offer a
  // "message the clinic" shortcut (talks to the secretary/owner).
  useEffect(() => {
    if (!user || professional) return;
    let cancelled = false;
    (async () => {
      const { data: assess } = await supabase
        .from("assessments")
        .select("clinic_id")
        .eq("user_id", user.id)
        .not("clinic_id", "is", null);
      const ids = [...new Set((assess || []).map((a: any) => a.clinic_id).filter(Boolean))] as string[];
      if (ids.length === 0) {
        if (!cancelled) setPatientClinics([]);
        return;
      }
      const { data: clinics } = await (supabase as any).rpc("get_clinics_public", { _ids: ids });
      if (!cancelled) setPatientClinics((clinics || []) as { id: string; name: string }[]);
    })();
    return () => { cancelled = true; };
  }, [user?.id, professional]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-muted-foreground" />
        {t("chat.messages_title")}
      </h2>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={msgSearch}
          onChange={(e) => setMsgSearch(e.target.value)}
          placeholder={t("chat.search_placeholder")}
          className="pl-9 rounded-xl"
        />
      </div>
      {professional && (
        <div className="flex gap-2">
          <Button
            variant={msgFilter === "all" ? "default" : "outline"}
            size="sm"
            className="rounded-full text-xs"
            onClick={() => setMsgFilter("all")}
          >
            {t("chat.filter_all")}
          </Button>
          <Button
            variant={msgFilter === "patient" ? "default" : "outline"}
            size="sm"
            className="rounded-full text-xs gap-1"
            onClick={() => setMsgFilter("patient")}
          >
            <User className="h-3 w-3" />
            {t("chat.filter_patient")}
          </Button>
          <Button
            variant={msgFilter === "professional" ? "default" : "outline"}
            size="sm"
            className="rounded-full text-xs gap-1"
            onClick={() => setMsgFilter("professional")}
          >
            <Stethoscope className="h-3 w-3" />
            {t("chat.filter_professional")}
          </Button>
        </div>
      )}

      {/* Patient view: shortcut to message the clinic's secretary */}
      {!professional && patientClinics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-muted-foreground self-center">
            {isPt ? "Atendimento da clínica:" : "Clinic support:"}
          </span>
          {patientClinics.map((c) => (
            <ContactClinicButton key={c.id} clinicId={c.id} clinicName={c.name} />
          ))}
        </div>
      )}

      {/* Referrals received from patients — shown above professional conversations */}
      {professional?.id && !clinicId && (
        <ReceivedReferralsCard professionalId={professional.id} />
      )}

      {/* Filter "Pacientes" → mode="professional" (conversations WITH patients)
          Filter "Profissionais" → mode="patient" (conversations WITH professionals) */}
      {(msgFilter === "all" || msgFilter === "patient") && professional && (
        <ConversationList
          key={`pro:${clinicId || "solo"}:${professional.id}`}
          mode="professional"
          professionalId={professional.id}
          clinicId={clinicId}
          initialConversationId={initialConversationId}
          searchQuery={msgSearch}
          canInitiateConversation={canInitiateAsProfessional}
        />
      )}
      {(msgFilter === "all" || msgFilter === "professional") && !clinicId && (
        <ConversationList
          mode="patient"
          initialConversationId={initialConversationId}
          searchQuery={msgSearch}
          canInitiateConversation={canInitiateAsPatient}
        />
      )}

      {/* Clinic staff inbox: patients of the clinic ↔ secretary/owner */}
      {clinicStaffInboxId && (
        <div className="space-y-3 pt-2 border-t border-border/60">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
            {isPt ? "Mensagens dos pacientes" : "Patient messages"}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isPt
              ? "Conversas iniciadas por pacientes da clínica diretamente com a recepção/secretaria."
              : "Conversations started by clinic patients directly with the front desk."}
          </p>
          <ConversationList
            mode="staff"
            clinicId={clinicStaffInboxId}
            canInitiateConversation={false}
          />
        </div>
      )}
    </div>
  );
};

export default MessagesTab;

