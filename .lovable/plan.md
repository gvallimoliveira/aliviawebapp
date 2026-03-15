

## Reestruturação do Painel Profissional: Agrupamento por Paciente + Comparativo Visual + Correção de Questionários

### Problemas identificados

1. **Avaliações não agrupadas por paciente**: A aba "Avaliações" lista cada avaliação como card individual. Pacientes com múltiplas avaliações (ex: Alessandra) aparecem separados em vez de agrupados.
2. **Falta de comparativo visual na página do paciente**: Ao entrar no detalhe, não há gráficos comparando dor, questionários e mapa de dor entre avaliações.
3. **Questionários não exibidos**: O `renderTestResultsSection` do PDF procura campos `name/result/score` mas os questionários usam `questionnaireId/questionnaireName/percentageScore/severity`. O mesmo problema ocorre na visualização — o AssessmentView filtra corretamente por `questionnaireId`, mas o PDF não.

### Mudanças propostas

**1. Aba "Avaliações" agrupada por paciente (`ProDashboard.tsx`)**
- Substituir a lista flat de assessments por cards agrupados por `patient_email`
- Cada card mostra: nome do paciente, email, quantidade de avaliações, badge de tendência (melhorando/piorando/estável)
- Ao clicar, navega para uma página de detalhe do paciente (reutilizando/expandindo o `PatientEvolutionDashboard`)

**2. Página de detalhe do paciente (`PatientEvolutionDashboard.tsx`)**
- Na visão detalhada, adicionar seções visuais prioritárias:
  - **Gráfico de evolução da dor** (AreaChart) com data e score — já existe
  - **Gráfico de evolução dos questionários** com barras de severidade e percentual — já existe parcialmente
  - **Comparativo lado a lado do mapa de dor** usando `PainMapView` para cada avaliação, com datas
  - **Dados de anamnese** em texto para cada avaliação
  - **Resultados dos questionários** com nome, percentual, interpretação e barra de severidade — atualmente ausente
- Na lista de avaliações individuais no detalhe, exibir os dados do questionário (nome, score, severidade)

**3. Correção dos questionários no PDF (`generatePdf.ts`)**
- Reescrever `renderTestResultsSection` para detectar items com `questionnaireId` e renderizá-los com:
  - Nome do questionário + nome completo
  - Score percentual + barra de progresso visual
  - Interpretação de severidade
  - Sub-escalas quando disponíveis
- Manter fallback para test results genéricos (sem questionnaireId)

### Arquivos modificados
- `src/components/dashboard/ProDashboard.tsx` — Agrupar avaliações por email do paciente na aba de avaliações
- `src/components/dashboard/PatientEvolutionDashboard.tsx` — Adicionar comparativo visual de mapa de dor, questionários com severidade, e anamnese
- `src/utils/generatePdf.ts` — Corrigir renderização de questionários funcionais no PDF

### Detalhes técnicos
- Agrupamento usa `Map<string, Assessment[]>` por `patient_email`, igual ao já feito no `PatientEvolutionDashboard`
- Comparativo do mapa de dor usa o componente `PainMapView` já existente, renderizado lado a lado com datas
- Questionários no PDF importam `questionnaires` de `questionnaireData.ts` para obter nomes completos e labels de sub-escala
- Gráficos usam Recharts (já instalado)

