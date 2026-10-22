# Botão "Resumo" passa a resumir o prontuário

O botão "Resumo" no topo do prontuário deixa de mostrar só a última avaliação e abre um resumo enxuto do paciente para o dia a dia.

## O que aparece no modal (nesta ordem)

1. **Hipótese diagnóstica** — a hipótese final em vigor (a do profissional, se ele sobrescreveu; senão, a da IA). Só leitura, sem botão de sobrescrever.
2. **Impressão clínica** — texto salvo da avaliação mais recente. Só leitura, sem regenerar e sem gastar créditos.
3. **Carga e periodização**
   - 3.1 **Conduta do dia** — o mesmo quadro já usado em Carga e periodização.
   - 3.2 **Microciclo semanal** — a semana atual, só para consulta (sem registrar ou apagar sessões daqui).
   - 3.3 **Gráfico carga diária × PSR** — o mesmo gráfico da seção de carga.
   - Se o paciente ainda não tem dados de carga, aparece uma linha curta "Sem registros de carga ainda".
4. **Última evolução registrada** — data e texto da evolução mais recente (com "ver mais" se for longa). Se não houver, "Nenhuma evolução registrada".
5. **Último programa de exercícios enviado** — data, link com botões copiar e abrir, e aviso de "Expirado" quando for o caso. Some se não houver programa.

No rodapé: botão **"Ver avaliação completa"**, que abre o resumo antigo da avaliação (com PDF e WhatsApp), para não perder nada do que existe hoje.

## O que não muda
- Prontuário, avaliações, PDFs, sobrescrever hipótese e seção de carga continuam iguais.
- Os cálculos de carga, conduta e PSR são os mesmos já usados (nada recalculado de outro jeito).
- O aviso de "avaliação incompleta" continua aparecendo no resumo antigo.
- A versão de demonstração da clínica mostra o modal com os dados de exemplo.
- Textos em português, inglês e espanhol; página de Suporte atualizada.

## Detalhes técnicos
- Novo `src/components/dashboard/patient-evolution/RecordSummaryDialog.tsx`, aberto pelo botão atual em `PatientDetailView.tsx`; o diálogo antigo vira o destino de "Ver avaliação completa".
- Hipótese via `finalHypothesis` (leitura do override existente); impressão de `diagnosis.clinicalImpression`.
- Dados de carga com os mesmos fetchers de `periodizationData.ts` (plano ativo, sRPE, check-ins, sessões em janela curta), carregados só quando o modal abre; demo usa o adaptador local existente.
- Reusa `DailyConductContent`, `LoadRecoveryChart` e `MicroWeekGrid` com `readOnly` (sem diálogo de sessão monitorada nem lixeira).
- Última evolução: `session_notes` mais recente do paciente (mesma consulta já usada no relatório de evolução). Último HEP: primeiro de `patientHeps` já carregado.
- Teste: regra de escolha da hipótese (override vence IA) e de "última evolução" pela data mais recente.
