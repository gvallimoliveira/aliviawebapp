import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, User, Stethoscope, MessageCircle } from "lucide-react";
import ConversationList from "@/components/chat/ConversationList";

interface MessagesTabProps {
  professional?: any;
  initialConversationId?: string | null;
  canInitiateAsPatient?: boolean;
  canInitiateAsProfessional?: boolean;
}

const MessagesTab = ({
  professional,
  initialConversationId,
  canInitiateAsPatient = false,
  canInitiateAsProfessional = false,
}: MessagesTabProps) => {
  const { t } = useLanguage();
  const [msgSearch, setMsgSearch] = useState("");
  const [msgFilter, setMsgFilter] = useState<"all" | "patient" | "professional">("all");

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

      {/* Filter "Pacientes" → mode="professional" (conversations WITH patients)
          Filter "Profissionais" → mode="patient" (conversations WITH professionals) */}
      {(msgFilter === "all" || msgFilter === "patient") && professional && (
        <ConversationList
          mode="professional"
          professionalId={professional.id}
          initialConversationId={initialConversationId}
          searchQuery={msgSearch}
          canInitiateConversation={canInitiateAsProfessional}
        />
      )}
      {(msgFilter === "all" || msgFilter === "professional") && (
        <ConversationList
          mode="patient"
          initialConversationId={initialConversationId}
          searchQuery={msgSearch}
          canInitiateConversation={canInitiateAsPatient}
        />
      )}
    </div>
  );
};

export default MessagesTab;
