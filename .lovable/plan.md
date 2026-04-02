

# Logo do profissional no PDF + Correções de layout

## 1. Banco de dados — nova coluna `logo_url` na tabela `professionals`

Migração SQL para adicionar `logo_url text` na tabela professionals (nullable, default null).

## 2. Upload da logo no cadastro profissional

**Arquivo:** `src/pages/ProfessionalRegister.tsx`

- Adicionar campo de upload de logo (JPG/PNG) similar ao campo de foto de perfil existente
- Upload para o bucket `professional-photos` com path `logos/{professionalId}.png`
- Preview da logo no formulário
- Salvar URL pública no campo `logo_url`
- Sem necessidade de crop (logo já deve vir formatada), mas limitar tamanho e redimensionar para max 200x200px no client

## 3. Passar logo do profissional para o PDF

**Arquivo:** `src/utils/generatePdf.ts`

- Adicionar `professionalLogoUrl?: string` em `PdfOptions`
- Na função `_buildPdfDoc`: se `professionalLogoUrl` existir, fazer fetch da imagem, converter para base64, e renderizar no **canto superior direito** do header (mesma altura/tamanho proporcional ao logo Aliv.iA no canto esquerdo)
- No footer de cada página: adicionar a logo do profissional no lado direito (espelhando o Aliv.iA no lado esquerdo)

**Arquivos chamadores** (`ProDashboard.tsx`, `TreatmentPlan.tsx`, `PatientEvolutionDashboard.tsx`, `AssessmentView.tsx`):
- Buscar `logo_url` do profissional e passá-lo como `professionalLogoUrl` nas opções do PDF

## 4. Corrigir frase motivacional no PDF básico

**Arquivo:** `src/utils/generatePdf.ts` (linhas ~753-798)

- O `splitTextToSize` está usando `CONTENT_WIDTH - 30` mas o texto é renderizado em uma caixa de largura `CONTENT_WIDTH - 12`. Corrigir para usar a largura interna real da caixa (padding de 12 de cada lado → `CONTENT_WIDTH - 24` para o split e alinhar o texto com margem interna adequada)
- Recalcular `motBoxH` para acomodar o texto corretamente

## 5. Títulos e conteúdo na mesma página (PDF premium)

**Arquivo:** `src/utils/generatePdf.ts`

- Na função `renderSubSection`: antes de renderizar título + corpo, calcular o espaço total necessário (título + pelo menos 2-3 linhas do corpo) e fazer `checkPage` com esse valor mínimo para evitar que um título fique sozinho no fim de uma página
- Aplicar a mesma lógica nos blocos de fase do tratamento (phase header + goal/focus devem ficar juntos)

## Resumo de arquivos

1. **Migração SQL** — `logo_url` na tabela `professionals`
2. `src/pages/ProfessionalRegister.tsx` — campo upload de logo
3. `src/utils/generatePdf.ts` — logo no header/footer do PDF, fix motivacional, títulos agrupados
4. `src/components/dashboard/ProDashboard.tsx` — passar `professionalLogoUrl`
5. `src/components/assessment/TreatmentPlan.tsx` — passar `professionalLogoUrl`
6. `src/components/dashboard/PatientEvolutionDashboard.tsx` — passar `professionalLogoUrl`
7. `src/pages/AssessmentView.tsx` — passar `professionalLogoUrl`

