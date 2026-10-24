# Insights: reorganização por categorias + 5 novas métricas de gestão

## 1. Nova organização da aba Insights

Em vez de uma coluna longa de cards, a aba passa a ter **sub-abas por categoria**, com contador de alertas em cada uma e um resumo no topo.

```text
[ Resumo ] [ Pacientes ] [ Rotina clínica ] [ Financeiro ] [ Equipe & Qualidade ] [ Operação ]
```

- **Resumo (abre por padrão):** faixa com 4-6 números-chave (ex.: pacientes em risco, receita perdida no mês, prontuários pendentes, LTV) — cada número leva à sub-aba correspondente.
- **Pacientes:** Risco de abandono, Sobrecarga/flare-up, Adesão, Reativação de inativos.
- **Rotina clínica:** Reavaliação programada, Fase STEPS, Previsão de alta.
- **Financeiro:** Meta de receita, **LTV clínico**, **Custo da cadeira vazia**, **Receita por hora clínica**, Concentração de carteira.
- **Equipe & Qualidade:** Produção por terapeuta, **Alta vs evasão por terapeuta**, Benchmark.
- **Operação:** Ocupação vs no-show, Conversão avaliação → agenda, **Prontuário em dia**.

Regras mantidas:
- Sub-abas de gestão (Financeiro, Equipe, e cards de gestão em Operação) só aparecem para dono/admin da clínica e para o PRO autônomo; secretaria vê Pacientes, Rotina e Operação (sem cards de gestão). Terapeuta continua sem a aba.
- No celular as sub-abas rolam na horizontal (padrão "peek"); sub-aba escolhida é lembrada na sessão.
- Cada card ganha um rótulo curto "Como ler" no cabeçalho (já existente no ícone de info), padronizado.
- Futuros insights entram registrando-se em uma categoria — nunca soltos na página.

## 2. Novas métricas (todas determinísticas, sem créditos de IA, escopo clínica/PRO isolado)

Base de valor: o **preço padrão da sessão** já cadastrado (clínica ou PRO). Quando não houver preço, o card pede para cadastrá-lo em vez de mostrar R$ 0. Período padrão: últimos 90 dias, com seletor 30/90/180.

1. **LTV clínico** — por paciente que já encerrou o ciclo (alta ou inativo 30d+): sessões realizadas × preço. Mostra média, mediana, média de sessões por paciente, e separação "alta" vs "evasão".
2. **Custo da cadeira vazia** — faltas + cancelamentos no período × preço; valor do mês, tendência mês a mês e top dias/horários com mais perda.
3. **Receita por hora clínica** — receita realizada ÷ horas de atendimento disponíveis (horário de funcionamento × dias úteis; no PRO, idem do perfil) e ÷ horas efetivamente agendadas. Na clínica também por terapeuta.
   - Observação: o sistema não tem cadastro de salas/boxes hoje; "rendimento por box" fica por hora/terapeuta. Por sala só se criarmos esse cadastro depois.
4. **Alta efetiva vs evasão por terapeuta** — pacientes encerrados no período: alta registrada (plano concluído) vs evasão (sem alta e sem agendamento futuro há 30d+). Taxa por terapeuta, com número mínimo de casos para não distorcer.
5. **Prontuário em dia** — atendimentos realizados sem nota de sessão em até 48h; percentual em dia, por terapeuta, e lista nominal de pendências (scroll limitado + descarte, igual às outras listas).

## Detalhes técnicos

- Refatorar `InsightsTab.tsx` em um registro `insightRegistry` (id, categoria, componente, visibilidade por papel/escopo) + `Tabs` do shadcn; contadores vindos de leve RPC `get_insights_summary`.
- Novas funções SQL com a mesma autorização/escopo (exatamente um de clinic_id ou professional_id; solo = clinic_id IS NULL): `get_patient_ltv`, `get_empty_chair_cost`, `get_revenue_per_clinical_hour`, `get_therapist_discharge_vs_dropout`, `get_record_compliance` (+ lista pendente). Status considerados: completed = realizado; cancelled/no_show = perda; tipos compromisso/avaliação excluídos onde fizer sentido.
- Novos cards na pasta `insights/` usando `InsightCardShell`; dismissals reaproveitam `useInsightDismissals`.
- Testes PGlite por função (valores concretos de LTV, perda, R$/hora, taxa de alta, 48h do prontuário) + teste de escopo clínica/solo.
- Ajuda pt/en/es + Support.tsx + ClinicSupport.tsx; AGENTS.md (regra do registro por categoria); roadmap.
