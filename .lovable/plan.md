

## Remover gráfico sparkline e ícones de seta dos cards de pacientes

### Problema
A seta para baixo (TrendingDown) no badge "Melhorando" e a seta para cima (TrendingUp) no "Piorando" causam confusão visual. O sparkline no canto direito também reforça essa contradição.

### Mudanças em `src/components/dashboard/PatientEvolutionDashboard.tsx`

1. **Remover os ícones** `TrendingDown`, `TrendingUp` e `Minus` dos badges de tendência (linhas 200-214) — manter apenas o texto "Melhorando", "Piorando", "Estável" com as cores atuais
2. **Remover o sparkline chart** (linhas 226-242) — o mini gráfico de área no canto direito do card
3. **Limpar imports** não utilizados (`TrendingDown`, `TrendingUp`, `AreaChart`, `Area`, `ResponsiveContainer` se não usados em outro lugar)

O badge de tendência continuará visível com as cores verde/vermelho/neutro, apenas sem os ícones de seta.

