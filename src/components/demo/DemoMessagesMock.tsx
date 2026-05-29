import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Search, Send, Video, Phone, MessageCircle } from "lucide-react";
import { DEMO_CONVERSATIONS } from "@/data/mockClinicData";

const DemoMessagesMock = () => {
  const [selected, setSelected] = useState(DEMO_CONVERSATIONS[0].id);
  const conv = DEMO_CONVERSATIONS.find((c) => c.id === selected)!;

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-[480px]">
        {/* Conversation list */}
        <div className="border-r bg-muted/20">
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Buscar conversa…" className="h-9 pl-8 text-sm" />
            </div>
          </div>
          <ScrollArea className="h-[420px]">
            <div className="divide-y">
              {DEMO_CONVERSATIONS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted/40 transition-colors flex items-start gap-3",
                    selected === c.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                    {c.patient_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold truncate">{c.patient_name}</p>
                      {c.unread > 0 && (
                        <Badge className="h-4 px-1.5 text-[10px] bg-primary text-primary-foreground">{c.unread}</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{c.last_message}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Thread */}
        <div className="flex flex-col">
          <div className="border-b p-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                {conv.patient_name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{conv.patient_name}</p>
                <p className="text-[11px] text-muted-foreground">Online agora</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8"><Video className="h-4 w-4" /></Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4 h-[380px]">
            <div className="space-y-3">
              {conv.messages.map((m) => (
                <div key={m.id} className={cn("flex", m.from === "pro" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-xs",
                      m.from === "pro"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    <p className="leading-relaxed">{m.text}</p>
                    <p className={cn("text-[10px] mt-1 opacity-70")}>{m.at}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t p-3 flex items-center gap-2 bg-muted/20">
            <Input placeholder="Digite uma mensagem… (demo)" className="h-9 text-sm" disabled />
            <Button size="icon" className="h-9 w-9 shrink-0" disabled>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-3 pb-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            <span>Disclaimer: este chat não substitui pronto-socorro. Em emergências, ligue 192.</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DemoMessagesMock;
