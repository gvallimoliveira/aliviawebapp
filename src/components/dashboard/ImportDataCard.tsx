import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ShieldCheck, FileInput } from "lucide-react";
import ImportDataModal from "./ImportDataModal";

interface Props {
  mode: "professional" | "clinic" | "demo";
  professionalId?: string;
  clinicId?: string;
  entityName?: string;
}

export default function ImportDataCard({ mode, professionalId, clinicId, entityName }: Props) {
  const [open, setOpen] = useState(false);
  const isDemo = mode === "demo";

  return (
    <>
      <Card className="border-dashed">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2"><FileInput className="w-5 h-5 text-primary" /></div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Importar dados</h3>
              <p className="text-sm text-muted-foreground">
                Trazer pacientes, avaliações, evoluções e agenda de outro sistema (CSV, JSON, XML ou ZIP do Aliv.iA).
                Revise as colunas antes de salvar; informações sem campo correspondente ficam em <em>"Dados externos"</em>.
                {isDemo && " Em modo demo nada é gravado."}
              </p>
            </div>
          </div>
          <ul className="text-xs text-muted-foreground space-y-1 ml-12 list-disc">
            <li>Suporta CSV/TSV, TXT tabular, JSON, XML tabular e ZIP exportado pelo próprio Aliv.iA</li>
            <li>Pacientes comparados por e-mail, CPF ou nome; correspondências ambíguas exigem revisão</li>
            <li>Desfazer em 24h preserva dados anteriores; alterações posteriores bloqueiam a operação</li>
            <li>ZIP importa somente tabelas compatíveis, não anexos, tratamentos ou mensagens</li>
          </ul>
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Requer consentimento LGPD do paciente
            </span>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" />
              {isDemo ? "Simular importação" : "Importar dados"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <ImportDataModal
        open={open}
        onOpenChange={setOpen}
        mode={mode}
        professionalId={professionalId}
        clinicId={clinicId}
      />
    </>
  );
}
