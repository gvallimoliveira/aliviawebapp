
## Objetivo
Corrigir de forma definitiva os PDFs para que, quando a avaliação usar notas individuais, o relatório mostre as notas separadamente por região/queixa em todos os modelos: gratuita, premium e relatório do paciente no painel profissional.

## Causa raiz encontrada
1. **O PDF da avaliação básica usa um fluxo separado** (`generateBasicReportPdfBlob`) que hoje recebe só `painScore` médio, `patientName` e `painRegions`. Ele **não recebe nem usa `anamnesisData`**, então perde `painScoreMode` e `painScoresPerRegion`.
2. **O PDF completo (premium/profissional) já lê `painScoresPerRegion`, mas renderiza tudo em uma única régua com média destacada**, enquanto o comportamento desejado é **uma régua por região/queixa**, igual ao fluxo de seleção da anamnese.
3. **Há pontos da UI que ainda não repassam os dados completos ao gerador**, especialmente no fluxo de visualização do resultado (`DiagnosisResult` / `AssessmentView`) para relatórios básicos e visualizações posteriores.

## Plano de correção
1. **Unificar a lógica de dor do PDF**
   - Criar uma rotina compartilhada em `src/utils/generatePdf.ts` para:
     - detectar se a avaliação está em modo `general` ou `per_region`
     - extrair uma lista ordenada de itens com `label + score`
     - renderizar:
       - **1 régua única** quando for nota geral
       - **1 régua por região/queixa** quando for nota individual
   - Essa rotina será usada tanto no PDF básico quanto no PDF completo, evitando divergência futura.

2. **Corrigir o PDF básico**
   - Expandir `BasicReportOptions` para aceitar `anamnesisData`.
   - Fazer `generateBasicReportPdfBlob()` usar `anamnesisData.painScoreMode` e `anamnesisData.painScoresPerRegion`.
   - Substituir a régua única atual por múltiplas réguas quando houver notas individuais.
   - Adicionar também a listagem textual estruturada das notas individuais no relatório básico.

3. **Corrigir premium + relatório profissional**
   - Ajustar o trecho de VAS do `_buildPdfDoc()` para parar de mostrar múltiplos marcadores na mesma barra.
   - Renderizar **uma barra por item** com nome e nota correspondentes.
   - Manter a média apenas como informação secundária opcional, sem substituir a visualização individual.

4. **Corrigir os pontos que chamam o gerador**
   - `src/components/assessment/DiagnosisResult.tsx`: passar `anamnesisData` para o PDF básico no download e no compartilhamento.
   - `src/pages/AssessmentView.tsx`:
     - no fluxo básico, passar `assessment.anamnesis_data` para o gerador
     - ao renderizar `<DiagnosisResult />`, repassar `anamnesisData`, `painRegions`, `painScore`, `assessmentId`, `patientName` e afins para evitar PDFs incompletos em telas de visualização.
   - Revisar os demais chamadores para confirmar consistência nos 3 modelos.

## Arquivos a alterar
- `src/utils/generatePdf.ts`
- `src/components/assessment/DiagnosisResult.tsx`
- `src/pages/AssessmentView.tsx`

## Comportamento esperado após a correção
- **Avaliação gratuita**: se o usuário escolher notas individuais, o PDF mostrará uma régua por região/queixa.
- **Avaliação premium**: mesmo comportamento, inclusive no download/compartilhamento.
- **Relatório do paciente no painel profissional**: mesmo comportamento, inclusive exportações e compartilhamentos.
- **Avaliações antigas sem `painScoresPerRegion`** continuarão com fallback para nota geral, sem quebrar relatórios já existentes.

## Detalhes técnicos
- Hoje existem **dois caminhos de PDF**: um básico e um completo. O bug principal vem dessa duplicação.
- A correção mais segura é **centralizar a renderização da EVA/VAS** em uma função reutilizável.
- As “regiões” exibidas no PDF devem seguir os mesmos rótulos usados na seleção individual da anamnese, para manter consistência visual e clínica.
- Não exige mudança de banco nem backend.

## Validação que vou aplicar na implementação
1. Gerar PDF da **avaliação gratuita** com 2 notas individuais.
2. Gerar PDF da **premium** com 2+ notas individuais.
3. Gerar PDF do **paciente no painel profissional** com notas individuais.
4. Verificar download e compartilhamento/geração por todos os pontos de entrada.
5. Confirmar fallback correto quando houver apenas nota média.
