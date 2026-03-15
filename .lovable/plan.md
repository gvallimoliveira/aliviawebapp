

## Melhorar visualização de métricas no Dashboard Profissional com gráficos

### Problema atual
Os cards de estatísticas (total de avaliações, avaliações do mês) são exibidos apenas como números grandes. A visualização detalhada por paciente já possui gráficos de dor e questionários, mas falta contexto visual no overview geral.

### Mudanças propostas

**1. Cards de estatísticas com mini-gráficos (ProDashboard.tsx)**
- Substituir os cards numéricos simples por cards com **sparkline charts** mostrando volume de avaliações por semana/mês
- Adicionar um **gráfico de barras** com a distribuição de avaliações nos últimos 6 meses
- Adicionar um **gráfico de pizza/donut** mostrando distribuição por status (com diagnóstico, com tratamento, red flags)

**2. Painel de overview com gráficos agregados (ProDashboard.tsx)**
- Novo card com **gráfico de barras horizontal** mostrando as regiões de dor mais frequentes entre todos os pacientes
- Card com **gráfico de área** mostrando a média de dor dos pacientes ao longo do tempo

**3. Melhorias no PatientEvolutionDashboard.tsx**
- Na lista de pacientes, adicionar **mini sparklines** inline ao lado de cada paciente mostrando a tendência de dor (substituindo apenas o badge textual)
- Na visão detalhada do paciente, adicionar **gráfico de barras** para scores de questionários (além do line chart existente) quando há apenas 1 avaliação
- Melhorar tooltips dos gráficos existentes com mais contexto

### Arquivos modificados
- `src/components/dashboard/ProDashboard.tsx` — Cards de stats com gráficos agregados
- `src/components/dashboard/PatientEvolutionDashboard.tsx` — Sparklines na lista e melhorias visuais

### Detalhes técnicos
- Usa Recharts (já instalado): `BarChart`, `PieChart`, `AreaChart`, `LineChart` (sparkline)
- Dados derivados do array `patientAssessments` já carregado — sem queries adicionais
- Mantém o mesmo layout responsivo com grid de cards
- Os gráficos no paywall (demo) usam os `mockPatientAssessments` existentes

