# Carga planejada x carga percebida (dose certa / subdosada / superdosada)

Você está certo: o sRPE é dado **subjetivo do paciente**. O link do preparador não deve responder por ele. O papel do preparador (e do fisio) passa a ser **planejar a dose esperada**; o paciente reporta o que sentiu; o sistema cruza os dois.

## Conceito

- **Carga planejada (prescrita)**: quem conduz a sessão define, para a data, `duração planejada × RPE alvo` = *Load alvo*.
- **Carga percebida (real)**: só o paciente informa `duração real × RPE percebido` = *Load real*.
- **Aderência de dose** = Load real ÷ Load alvo:
  - 0,90–1,10 → **Dose certa**
  - < 0,90 → **Subdosado** (estímulo abaixo do planejado)
  - > 1,10 → **Superdosado** (estímulo acima; risco quando repetido)

Exemplo do seu enunciado: alvo 8 × 40 = 320; real 7 × 40 = 280 → 0,88 → subdosado.

O ACWR continua calculado **apenas com a carga real** (sRPE do paciente). A dose planejada nunca entra no ACWR; ela é a régua de comparação.

## Três frentes separadas

Fisio, Academia e Campo/Esporte têm alvo e aderência próprios, além do consolidado:

```text
Semana 12          Alvo   Real   Aderência   Leitura
Fisioterapia        900    870      0,97     dose certa
Academia            960    720      0,75     subdosado
Campo / esporte     600    780      1,30     superdosado
Total              2460   2370      0,96     dose certa (compensação entre frentes)
```

A leitura por frente é o que muda a decisão: subdosado na academia com superdose no campo = estímulo mal distribuído, mesmo com total "certo".

## Quem faz o quê

- **Link do paciente**: mantém "Como estou" (check-in) + "Sessão de hoje" (sRPE real). Quando existe alvo para a data, mostra apenas "planejado para hoje: ~40 min, esforço alvo 8/10", sem revelar o número de carga (para não enviesar a resposta) e sem permitir editar o alvo.
- **Link do preparador**: deixa de registrar sRPE. Passa a **prescrever a dose** da data (frente, duração planejada, RPE alvo, observação) e a ver o resultado do cruzamento das sessões que ele prescreveu.
- **Prontuário (fisio)**: prescreve dose em qualquer frente e vê o painel completo de aderência.

## Onde aparece no prontuário

1. **Microciclo (grade semanal)**: cada célula ganha o alvo (`40' @8 = 320`) e, quando o paciente responde, um selo de aderência (certo / sub / super) na cor correspondente.
2. **Monitor de carga**: novo bloco "Dose planejada x percebida" com as 3 frentes + total da semana, gráfico de barras alvo vs. real e a leitura textual.
3. **Alertas push** (sem e-mail): dispara quando a mesma frente fica **subdosada ou superdosada por 2 sessões consecutivas** ou quando a semana fecha fora de 0,85–1,15 em qualquer frente. Mantém a regra de 1 alerta por paciente/dia/destinatário.
4. **Insights**: o card "Carga e prontidão" passa a citar a frente fora de dose junto com ACWR e prontidão.

Nada disso consome crédito de IA — tudo é cálculo local/determinístico.

## Detalhes técnicos

- Migration em `periodization_sessions`: `planned_duration_min int`, `planned_rpe numeric`, `planned_load numeric generated` (mantém a coluna atual `planned_load` textual renomeada para `planned_intensity` para não quebrar a grade existente), `created_source text` (`professional` | `coach`).
- `srpe_entries`: nova coluna `session_id uuid` (referência opcional à sessão planejada) para o pareamento explícito; quando ausente, o pareamento cai para `patient_id + session_date + track`.
- `src/lib/periodization.ts`: `plannedLoad()`, `doseAdherence(real, planned)`, `doseVerdict()` (`under` | `on_target` | `over`), `adherenceByTrack(entries, sessions, weekStart)` e `weeklyAdherence()`, todos puros, com casos cobertos em `src/test/periodization.test.ts` (incluindo o exemplo 320 vs. 280).
- Edge Function `periodization-checkin`: audiência `coach` troca `submit_srpe` por `submit_planned_session` (validação de duração 1–600, RPE 0–10, frente permitida); `load` devolve o alvo do dia para o paciente já sem o valor de carga; audiência `patient` mantém `submit_checkin` + `submit_srpe` e passa a gravar `session_id` quando há alvo do dia.
- UI: `PeriodizationCheckin.tsx` (dois formulários distintos por audiência), `MicroWeekGrid.tsx` (alvo + selo), novo `DoseAdherenceCard.tsx` dentro de `LoadMonitorCard`/`PeriodizationSection`, e `get_patient_load_alerts` estendida com desvio de dose por frente.
- Suporte: atualizar `Support.tsx` + `ClinicSupport.tsx` (pt/en/es) no mesmo ciclo.

## Ordem de entrega

1. Migration + funções de cálculo + testes.
2. Prescrição de dose no prontuário e na grade do microciclo.
3. Link do preparador convertido em prescrição; link do paciente com o alvo do dia.
4. Card de aderência (3 frentes + total) e ajuste dos alertas push / Insights.
5. Páginas de suporte.
