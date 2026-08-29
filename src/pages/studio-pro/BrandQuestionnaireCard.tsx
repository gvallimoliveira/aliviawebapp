import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, FileQuestion, Loader2, Save, Sparkles } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registerInterFonts } from "@/utils/fonts/registerInterFonts";
import {
  BRAND_QUESTIONNAIRE,
  BRAND_QUESTIONS,
  answeredCount,
  blockAnsweredCount,
  type BriefAnswers,
} from "./brandQuestionnaire";

/**
 * QUESTIONÁRIO DE MARCA na página de ajustes.
 *
 * Três saídas: responder aqui (salva na marca), baixar em PDF para preencher
 * fora do sistema, e mandar as respostas para a interpretação por IA — que
 * preenche posicionamento, tom, públicos, cores e tipografia.
 */

type Props = {
  answers: BriefAnswers;
  onChange: (answers: BriefAnswers) => void;
  onSave: () => Promise<void> | void;
  onInterpret: () => Promise<void> | void;
  brandName: string;
  saving: boolean;
  interpreting: boolean;
};

const BrandQuestionnaireCard = ({
  answers,
  onChange,
  onSave,
  onInterpret,
  brandName,
  saving,
  interpreting,
}: Props) => {
  const [open, setOpen] = useState(false);
  const filled = answeredCount(answers);

  const set = (id: string, value: string) => onChange({ ...answers, [id]: value });

  const downloadPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    registerInterFonts(doc);
    const left = 20;
    const width = 170;
    let y = 24;

    const page = () => {
      doc.addPage();
      y = 24;
    };
    const need = (space: number) => {
      if (y + space > 275) page();
    };

    doc.setFont("Inter", "bold");
    doc.setFontSize(19);
    doc.text("Questionário de Marca", left, y);
    y += 8;
    doc.setFont("Inter", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(110);
    doc.text(
      doc.splitTextToSize(
        `Base para montar o kit de ${brandName || "sua marca"} no Aliv.iA Studio. Responda o que souber — o que ficar em branco a IA completa e você revisa depois.`,
        width,
      ),
      left,
      y,
    );
    y += 14;
    doc.setTextColor(30);

    BRAND_QUESTIONNAIRE.forEach((block) => {
      need(30);
      doc.setFont("Inter", "bold");
      doc.setFontSize(13);
      doc.text(block.title, left, y);
      y += 6;
      doc.setFont("Inter", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(120);
      doc.text(doc.splitTextToSize(block.intro, width), left, y);
      doc.setTextColor(30);
      y += 8;

      block.questions.forEach((q) => {
        const labelLines = doc.splitTextToSize(q.label, width) as string[];
        const hintLines = q.hint ? (doc.splitTextToSize(q.hint, width) as string[]) : [];
        const optionLines = q.options ? (doc.splitTextToSize(`Opções: ${q.options.join(" · ")}`, width) as string[]) : [];
        need(labelLines.length * 5 + hintLines.length * 4 + optionLines.length * 4 + 20);

        doc.setFont("Inter", "bold");
        doc.setFontSize(10.5);
        doc.text(labelLines, left, y);
        y += labelLines.length * 5;

        doc.setFont("Inter", "normal");
        doc.setFontSize(9);
        doc.setTextColor(130);
        if (hintLines.length) {
          doc.text(hintLines, left, y);
          y += hintLines.length * 4;
        }
        if (optionLines.length) {
          doc.text(optionLines, left, y);
          y += optionLines.length * 4;
        }
        doc.setTextColor(30);

        const answer = (answers[q.id] ?? "").trim();
        if (answer) {
          const answerLines = doc.splitTextToSize(answer, width - 4) as string[];
          need(answerLines.length * 5 + 6);
          doc.setFontSize(10);
          doc.text(answerLines, left + 2, y + 4);
          y += answerLines.length * 5 + 8;
        } else {
          // Linhas para preencher à mão / digitar em outro lugar.
          doc.setDrawColor(205);
          for (let i = 0; i < 2; i += 1) {
            y += 6;
            doc.line(left, y, left + width, y);
          }
          y += 8;
        }
      });
      y += 4;
    });

    const safe = (brandName || "marca").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase();
    doc.save(`questionario-de-marca-${safe}.pdf`);
  };

  const blocks = useMemo(() => BRAND_QUESTIONNAIRE, []);

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <FileQuestion className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Não tenho manual de marca</h3>
            <p className="mt-0.5 max-w-xl text-xs text-muted-foreground">
              Responda um questionário curto e o Studio monta o kit por você: posicionamento, tom,
              públicos com chamada e CTA, cores e tipografia. Dá para baixar em PDF e responder fora
              do sistema — ou enviar para o seu cliente responder.
            </p>
            <p className="mt-1 text-[11px] font-medium text-primary">
              {filled} de {BRAND_QUESTIONS.length} perguntas respondidas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setOpen((v) => !v)}>
            {open ? "Fechar" : "Responder aqui"}
            <ChevronDown className={`ml-1.5 h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full" onClick={downloadPdf}>
            <Download className="mr-1.5 h-4 w-4" />
            Baixar em PDF
          </Button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-4">
          {blocks.map((block) => (
            <div key={block.id} className="rounded-xl border border-border bg-background p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{block.title}</p>
                <span className="text-[11px] text-muted-foreground">
                  {blockAnsweredCount(block, answers)}/{block.questions.length}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{block.intro}</p>

              <div className="mt-3 space-y-3">
                {block.questions.map((q) => (
                  <div key={q.id}>
                    <Label htmlFor={`brief-${q.id}`} className="text-[11px]">
                      {q.label}
                    </Label>
                    {q.kind === "long" ? (
                      <Textarea
                        id={`brief-${q.id}`}
                        rows={2}
                        placeholder={q.hint}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => set(q.id, e.target.value)}
                      />
                    ) : (
                      <Input
                        id={`brief-${q.id}`}
                        placeholder={q.hint}
                        value={answers[q.id] ?? ""}
                        onChange={(e) => set(q.id, e.target.value)}
                      />
                    )}
                    {q.options && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {q.options.map((opt) => (
                          <Button
                            key={opt}
                            type="button"
                            size="sm"
                            variant={(answers[q.id] ?? "") === opt ? "secondary" : "outline"}
                            className="h-7 rounded-full px-2.5 text-[11px]"
                            onClick={() => set(q.id, opt)}
                          >
                            {opt}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={saving || interpreting}
              onClick={() => void onSave()}
            >
              {saving ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Salvar respostas
            </Button>
            <Button
              size="sm"
              className="rounded-full"
              disabled={saving || interpreting || filled === 0}
              onClick={() => void onInterpret()}
            >
              {interpreting ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1.5 h-4 w-4" />
              )}
              Montar meu kit com estas respostas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandQuestionnaireCard;
