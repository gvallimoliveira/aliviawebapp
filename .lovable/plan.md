## Objetivo

Hoje o painel pessoal trata tudo como um único quadro: `EvolutionSummary`, `PainDiary`, `AssessmentTimeline` e `AssessmentHistory` misturam lombar, ombro e cotovelo na mesma curva de dor. Vamos introduzir o conceito de **Condição** (caso clínico) e dar a cada uma seu próprio acompanhamento: nota de dor, gráfico, histórico de avaliações e HEP associado.

## Como o agrupamento vai funcionar (automático)

Nova biblioteca `src/lib/painConditions.ts`:

1. Cada região de dor é mapeada para um **cluster corporal**: `lombar`, `cervical`, `torácica`, `ombro D/E`, `cotovelo D/E`, `punho/mão D/E`, `quadril D/E`, `joelho D/E`, `tornozelo/pé D/E`, `coxa/panturrilha D/E`.
2. A avaliação é atribuída ao cluster da região **principal** (primeira região / maior peso).
3. Dentro do mesmo cluster, avaliações entram na **mesma condição** quando: mesma lateralidade **e** hipótese com similaridade textual suficiente **ou** distância ≤ 180 dias da última avaliação do grupo (reavaliação da mesma queixa). Fora disso, abre uma **nova condição** ("Lombar — episódio 2").
4. Rótulo da condição = nome do cluster + hipótese curta (ex.: "Lombar — componente facetário"). Avaliações sem região vão para **"Geral"**.
5. HEP: `exercise_programs.assessment_id` já existe → o programa herda a condição da avaliação de origem.

Nada disso exige que o usuário escolha algo. Regra pura e determinística, testada com casos sintéticos.

## Estrutura do painel pessoal (nova)

```text
[ Minhas condições ]  ← cards horizontais (peek no mobile)
  Lombar · dor 4/10 ↓ 30% · 3 avaliações · HEP ativo
  Ombro D. · dor 7/10 ↑ · 1 avaliação
  Cotovelo E. · alta/inativa (sem registro > 60 dias)

[ Condição em foco: Lombar ]        (troca por chip/tab)
  → Evolução (gráfico só dessa condição)
  → Diário de dor dessa condição
  → Linha do tempo + histórico de avaliações dessa condição
  → HEP e progressão associados
```

- Condição "em foco" persiste em `localStorage`; padrão = a com atividade mais recente.
- Se o usuário tem só **uma** condição, o painel fica visualmente igual ao de hoje (sem seletor) — nenhuma fricção nova para o caso comum.

## Diário de dor multi-condição

- `pain_diary_entries` ganha `condition_key text` (nulo = "Geral", histórico antigo preservado como escolhido).
- Unicidade passa a ser (user, data, condition_key), permitindo registrar lombar 4 e ombro 7 no mesmo dia.
- UI: slider registra a **condição em foco**; abaixo, linha compacta "Também registrar: Ombro D. · Cotovelo E." com slider inline por condição.
- Streak e progresso semanal contam o dia como registrado se **qualquer** condição foi registrada (não pune quem tem 3 quadros).
- Gráficos por condição usam apenas as entradas daquela `condition_key`; a aba "Geral" mostra todas as curvas sobrepostas para visão global.

## Detalhes técnicos

- **Migração**: `ALTER TABLE public.pain_diary_entries ADD COLUMN condition_key text;` + índice `(user_id, condition_key, logged_at)` + ajuste da restrição de unicidade diária. Sem novas tabelas; grants/RLS existentes seguem valendo.
- **Novos arquivos**: `src/lib/painConditions.ts` (clusters + agrupamento + rótulos), `src/components/dashboard/ConditionSelector.tsx`, `src/components/dashboard/ConditionOverviewCards.tsx`, `src/hooks/usePainConditions.ts`.
- **Alterados**: `src/pages/Dashboard.tsx` (aba paciente passa a filtrar por condição), `PainDiary.tsx` (multi-condição), `EvolutionSummary.tsx`, `AssessmentTimeline.tsx`, `AssessmentHistory.tsx` (recebem lista já filtrada + agrupamento visual quando em "Geral"), `AdaptiveProgressionCard.tsx` (usa avaliação da condição em foco).
- **i18n**: novas chaves em pt/en/es (`conditions.*`, `diary.also_log`, etc.).
- **Testes**: unitários de `painConditions` cobrindo o cenário lombar + cotovelo + ombro no mesmo ano, condições em paralelo e reabertura de episódio.

## Sugestões extras (posso incluir, diga sim/não)

1. **Status da condição**: ativa / em manutenção / arquivada automaticamente após 90 dias sem registro, com botão "reabrir".
2. **Comparativo entre condições**: um painel "qual quadro está melhorando" — útil para quem tem dois em paralelo.
3. **Alerta clínico leve**: condição com dor subindo por 7 dias sugere reavaliação ou contato com profissional (usa o fluxo de reavaliação express já existente).
4. **PDF/laudo por condição**: exportação do histórico de uma condição só, em vez de tudo junto.
5. **Aderência ao HEP por condição**, aproveitando `exercise_completions`.

Itens 1 e 2 são baratos e recomendo entrar já; 3–5 podem vir numa segunda etapa.

## Fora de escopo

Painel profissional/clínica e agrupamento retroativo do histórico antigo (fica em "Geral", conforme decidido).
