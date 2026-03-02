

# Historico de Avaliacoes Clicavel

## Problema
Os cards de avaliacoes no Dashboard sao apenas visuais. O usuario nao consegue reabrir uma avaliacao para consultar o diagnostico completo ou o plano de tratamento.

## Solucao
Criar uma nova pagina `/assessment/view/:id` que carrega os dados da avaliacao do banco e renderiza os componentes `DiagnosisResult` e `TreatmentPlan` ja existentes em modo somente leitura. Os cards no Dashboard passam a ser clicaveis, navegando para essa pagina.

---

## Mudancas

### 1. Nova pagina: `src/pages/AssessmentView.tsx`
- Recebe o `id` da avaliacao via `useParams`
- Busca a avaliacao na tabela `assessments` (filtrando por `user_id` via RLS)
- Exibe:
  - Header com tipo (Basic/Premium), data e status
  - Regioes de dor e nota de dor
  - Componente `DiagnosisResult` (se `diagnosis` existir) em modo leitura
  - Componente `TreatmentPlan` (se `treatment_plan` existir) em modo leitura
  - Botao "Voltar ao Dashboard"
- Os botoes de acao dos componentes (gerar tratamento, nova avaliacao) sao adaptados: "nova avaliacao" navega para `/assessment/premium` e "voltar" volta ao dashboard

### 2. Rota no `App.tsx`
- Adicionar `<Route path="/assessment/view/:id" element={<AssessmentView />} />`

### 3. Dashboard: cards clicaveis
- No `src/pages/Dashboard.tsx`, adicionar `onClick={() => navigate(`/assessment/view/${a.id}`)}` e `cursor-pointer` aos cards do historico
- Adicionar um icone de seta (ChevronRight) para indicar que e clicavel
- Filtrar: apenas avaliacoes com status `completed`, `diagnosis_complete` ou que tenham `diagnosis` sao clicaveis

### 4. Traducoes (i18n)
Novas chaves:
- `assessment_view.title` / "Detalhes da Avaliacao" / "Assessment Details"
- `assessment_view.back` / "Voltar ao Dashboard" / "Back to Dashboard"
- `assessment_view.no_diagnosis` / "Diagnostico ainda nao gerado" / "Diagnosis not generated yet"
- `assessment_view.pain_score` / "Nota de Dor" / "Pain Score"

---

## Detalhes Tecnicos

- Reutiliza `DiagnosisResult` e `TreatmentPlan` sem modificacoes nesses componentes, passando callbacks de navegacao adaptados
- A query ao banco e protegida por RLS (usuarios so veem suas proprias avaliacoes)
- Nao requer mudancas no banco de dados
- Avaliacoes "in_progress" sem diagnostico mostram estado vazio com orientacao para continuar

