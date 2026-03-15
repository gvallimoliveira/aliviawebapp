

## Notas Privadas do Profissional + Exportação em Lote de PDFs

### 1. Tabela `professional_notes` (nova migração)

```sql
CREATE TABLE public.professional_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL,
  assessment_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(professional_id, assessment_id)
);

ALTER TABLE public.professional_notes ENABLE ROW LEVEL SECURITY;

-- Profissionais veem/editam apenas suas próprias notas
CREATE POLICY "Pros can manage own notes" ON public.professional_notes
  FOR ALL TO authenticated
  USING (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()))
  WITH CHECK (professional_id IN (SELECT id FROM professionals WHERE user_id = auth.uid()));
```

### 2. Notas privadas na página do paciente (`PatientEvolutionDashboard.tsx`)

- Em cada card de avaliação (seção "Per-assessment details"), adicionar um campo `Textarea` colapsável com label "Notas privadas"
- Ao digitar, debounce de 1s faz upsert na tabela `professional_notes` via Supabase client
- Carregar notas ao abrir a visão detalhada do paciente com query `professional_notes` filtrada por `professional_id` e assessment IDs do paciente
- Ícone de caderno (NotebookPen) no header do card quando há nota salva

### 3. Notas no PDF (`generatePdf.ts`)

- Adicionar campo opcional `professionalNotes?: string` ao `PdfOptions`
- Renderizar seção "Notas do Profissional" entre o diagnóstico e o disclaimer, com fundo cinza claro e texto em itálico
- No `handleDownloadPdf` do `ProDashboard.tsx`, buscar a nota correspondente e passá-la ao gerador

### 4. Exportação em lote de PDFs

- No header da lista de pacientes (`PatientEvolutionDashboard`), adicionar botão "Exportar PDFs" com ícone `Download`
- Ao clicar, gera PDFs de todas as avaliações com diagnóstico do paciente selecionado (ou todos os pacientes se na lista geral)
- Usa `JSZip` (nova dependência) para empacotar múltiplos PDFs em um `.zip`
- Progresso visual com toast ou barra de loading inline
- Cada PDF inclui as notas privadas se existirem
- Alternativa simplificada: se apenas 1 paciente selecionado, gera PDFs sequenciais sem zip; se múltiplos, empacota em zip

### 5. Traduções

Novas keys em `LanguageContext.tsx`:
- `pro.private_notes` / `pro.private_notes_placeholder`
- `pro.export_pdfs` / `pro.exporting_pdfs`
- `pro.notes_saved`

### Arquivos alterados
- **Nova migração SQL** — tabela `professional_notes`
- **PatientEvolutionDashboard.tsx** — textarea de notas, botão exportar lote, fetch de notas
- **ProDashboard.tsx** — passar notas ao `handleDownloadPdf`
- **generatePdf.ts** — seção "Notas do Profissional" no PDF
- **LanguageContext.tsx** — traduções
- **package.json** — adicionar `jszip`

