

## Duas mudanças no Dashboard

### 1. Remover seção de Follow-up Emails do painel do paciente

**Arquivo: `src/pages/Dashboard.tsx`**
- Remover o bloco "Follow-up Reminders" (linhas ~385-426) que exibe os emails semanais programados
- Remover o state `followUps` e a query que busca `follow_up_emails`
- Remover imports não utilizados (`Mail`, `Send`, `AlertCircle`)

Os emails continuam sendo enviados normalmente — apenas a exibição no painel é removida.

---

### 2. Gráfico detalhado de evolução dos questionários no painel profissional

**Arquivo: `src/components/dashboard/PatientEvolutionDashboard.tsx`**

Atualmente o gráfico de evolução de questionários mostra apenas a pontuação final (%) de cada questionário (ex: NDI 42%). A mudança é expandir para mostrar as **3 subescalas com pior pontuação** + a pontuação final, permitindo ao profissional ver a evolução das limitações funcionais específicas.

**Lógica:**
- Para cada questionário do paciente, extrair `subscaleScores` de `test_results`
- Identificar as 3 subescalas com maior limitação (pior score, considerando `scoringDirection`)
- Montar dados de série temporal: pontuação final + 3 subescalas discriminadas
- Usar labels traduzidos dos `subscaleLabels` do `questionnaireData.ts`

**Visualização:**
- Substituir o gráfico de linha única por um gráfico com 4 linhas por questionário:
  - Linha principal (bold): pontuação final do questionário
  - 3 linhas secundárias (tracejadas/finas): as 3 subescalas mais limitadas
- Cada linha com tooltip mostrando nome da subescala e valor
- Legenda clara identificando cada métrica
- Se houver apenas 1 avaliação, mostrar barras agrupadas comparando as subescalas

**Importação necessária:**
- Importar `questionnaires` de `questionnaireData.ts` para acessar `subscaleLabels` e `scoringDirection`

**Arquivos editados:**
| Ação | Arquivo |
|------|---------|
| Editar | `src/pages/Dashboard.tsx` |
| Editar | `src/components/dashboard/PatientEvolutionDashboard.tsx` |

