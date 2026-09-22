import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { readFormatInsights, writeFormatInsights, type FormatInsight } from "./formatInsights";
import {
  keywordMatrixFromText,
  keywordMatrixToText,
  reasoningMatrixFromText,
  reasoningMatrixToText,
  type KeywordMatrixEntry,
  type ReasoningMatrixEntry,
} from "./contentMatrices";

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const Item = ({ children, onRemove, label }: { children: React.ReactNode; onRemove: () => void; label: string }) => (
  <div className="rounded-lg border border-border bg-background p-3">
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      <Button type="button" variant="ghost" size="icon" onClick={onRemove} title={`Excluir ${label.toLowerCase()}`}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
    {children}
  </div>
);

const Field = ({ label, value, onChange, placeholder, multiline = false }: {
  label: string; value: string; onChange: (value: string) => void; placeholder?: string; multiline?: boolean;
}) => (
  <div className="space-y-1">
    <Label className="text-[11px]">{label}</Label>
    {multiline ? (
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    ) : (
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    )}
  </div>
);

export const FormatInsightsEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const items = readFormatInsights(value);
  const commit = (next: FormatInsight[]) => onChange(writeFormatInsights(next));
  const update = (index: number, patch: Partial<FormatInsight>) => commit(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Item key={`${item.id}-${index}`} label={`Ideia ${index + 1}`} onRemove={() => commit(items.filter((_, i) => i !== index))}>
          <div className="grid gap-3">
            <Field label="Abertura / gancho" value={item.title} onChange={(title) => update(index, { title })} />
            <Field label="Desenvolvimento" value={item.beats.join("\n")} onChange={(text) => update(index, { beats: text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean) })} placeholder="Uma fala por linha" multiline />
            <Field label="Fechamento / CTA" value={item.closing ?? ""} onChange={(closing) => update(index, { closing })} />
          </div>
        </Item>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => commit([...items, { id: makeId("insight"), title: "Nova ideia", beats: [], closing: "" }])}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar ideia
      </Button>
    </div>
  );
};

export const KeywordMatrixEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const items = keywordMatrixFromText(value);
  const commit = (next: KeywordMatrixEntry[]) => onChange(keywordMatrixToText(next));
  const update = (index: number, patch: Partial<KeywordMatrixEntry>) => commit(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Item key={`${item.id}-${index}`} label={`Relação ${index + 1}`} onRemove={() => commit(items.filter((_, i) => i !== index))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Termo" value={item.term} onChange={(term) => update(index, { term })} />
            <Field label="Como o público percebe" value={item.perception} onChange={(perception) => update(index, { perception })} />
            <Field label="Associações" value={(item.associations ?? []).join(", ")} onChange={(text) => update(index, { associations: text.split(",").map((part) => part.trim()).filter(Boolean) })} />
            <Field label="Públicos" value={(item.audienceIds ?? []).join(", ")} onChange={(text) => update(index, { audienceIds: text.split(",").map((part) => part.trim()).filter(Boolean) })} />
            <Field label="Tema" value={item.theme ?? ""} onChange={(theme) => update(index, { theme })} />
          </div>
        </Item>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => commit([...items, { id: makeId("lex"), term: "Novo termo", perception: "Nova percepção" }])}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar relação
      </Button>
    </div>
  );
};

export const ReasoningMatrixEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const items = reasoningMatrixFromText(value);
  const commit = (next: ReasoningMatrixEntry[]) => onChange(reasoningMatrixToText(next));
  const update = (index: number, patch: Partial<ReasoningMatrixEntry>) => commit(items.map((item, i) => i === index ? { ...item, ...patch } : item));
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <Item key={`${item.id}-${index}`} label={`Raciocínio ${index + 1}`} onRemove={() => commit(items.filter((_, i) => i !== index))}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Públicos" value={(item.audienceIds ?? []).join(", ")} onChange={(text) => update(index, { audienceIds: text.split(",").map((part) => part.trim()).filter(Boolean) })} />
            <Field label="Tema" value={item.theme ?? ""} onChange={(theme) => update(index, { theme })} />
            <Field label="Cena ou sintoma" value={item.scene} onChange={(scene) => update(index, { scene })} multiline />
            <Field label="Mecanismo" value={item.mechanism} onChange={(mechanism) => update(index, { mechanism })} multiline />
            <Field label="Prova ou ponte" value={item.bridge} onChange={(bridge) => update(index, { bridge })} multiline />
            <Field label="Resultado" value={item.outcome} onChange={(outcome) => update(index, { outcome })} multiline />
            <Field label="CTA" value={item.cta ?? ""} onChange={(cta) => update(index, { cta })} />
          </div>
        </Item>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => commit([...items, { id: makeId("route"), scene: "Nova cena", mechanism: "Novo mecanismo", bridge: "Nova prova", outcome: "Novo resultado" }])}>
        <Plus className="mr-2 h-4 w-4" /> Adicionar raciocínio
      </Button>
    </div>
  );
};