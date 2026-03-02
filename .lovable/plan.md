

# Diario de Dor + Comparacao Antes/Depois

## Feature 1: Diario de Dor

### Banco de Dados
Nova tabela `pain_diary_entries`:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `assessment_id` (uuid, FK para assessments, nullable) -- vincula ao tratamento ativo
- `pain_score` (integer, 0-10, NOT NULL)
- `notes` (text, nullable) -- campo opcional para observacoes curtas
- `logged_at` (date, NOT NULL, default today) -- apenas data, 1 registro por dia
- `created_at` (timestamptz, default now())

RLS: usuarios podem SELECT, INSERT e UPDATE seus proprios registros. Constraint UNIQUE em (user_id, logged_at) para evitar duplicatas no mesmo dia.

### UI: Pagina do Diario de Dor
Novo componente `src/components/dashboard/PainDiary.tsx` integrado ao Dashboard:

- **Registro rapido**: Slider de 0-10 com um botao "Registrar" + campo de nota opcional. Um toque para salvar.
- **Grafico de evolucao**: Usar `recharts` (ja instalado) com um `LineChart` mostrando a dor ao longo dos dias/semanas. Eixo X = datas, Eixo Y = 0-10.
- **Historico recente**: Lista dos ultimos 7 registros com data e nota.
- Se ja registrou hoje, mostrar o valor atual com opcao de editar.

### Integracao no Dashboard
Adicionar uma nova secao no Dashboard entre os "Quick Actions" e o "Follow-up Reminders":
- Card com titulo "Diario de Dor" e icone
- Mostra o grafico inline (ultimos 30 dias)
- Botao para registrar a dor de hoje

---

## Feature 2: Comparacao Antes/Depois

### Logica
Quando o usuario tem 2+ avaliacoes premium completadas, mostrar uma secao de comparacao no Dashboard:
- Seleciona automaticamente a primeira e a ultima avaliacao premium completada
- Mostra lado a lado:
  - Data da avaliacao
  - Nota de dor (pain_score)
  - Hipotese diagnostica
  - Regioes de dor
  - Resultados dos testes funcionais (se disponiveis)
  - Score dos questionarios (se disponiveis)

### UI: Componente de Comparacao
Novo componente `src/components/dashboard/AssessmentComparison.tsx`:
- Layout em 2 colunas (ou empilhado no mobile)
- Coluna esquerda: "Primeira avaliacao" com data e dados
- Coluna direita: "Ultima avaliacao" com data e dados
- Indicadores visuais de melhora/piora (setas verdes para baixo na dor, badges de melhora)
- Destaque visual quando a dor diminuiu (ex: "Dor: 8/10 -> 4/10" com cor verde)

### Integracao no Dashboard
Aparece apenas quando existem 2+ avaliacoes premium completadas. Posicionada antes do historico de avaliacoes.

---

## Traducoes (i18n)
Novas chaves PT e EN para:
- `diary.title`, `diary.subtitle`, `diary.log_pain`, `diary.notes_placeholder`, `diary.today_logged`, `diary.evolution`, `diary.no_entries`
- `comparison.title`, `comparison.first`, `comparison.latest`, `comparison.pain_change`, `comparison.improved`, `comparison.worsened`, `comparison.stable`

## Resumo dos Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/` | Nova tabela `pain_diary_entries` |
| `src/components/dashboard/PainDiary.tsx` | Novo componente do diario |
| `src/components/dashboard/AssessmentComparison.tsx` | Novo componente de comparacao |
| `src/pages/Dashboard.tsx` | Integrar ambos os componentes |
| `src/contexts/LanguageContext.tsx` | Novas traducoes PT/EN |

