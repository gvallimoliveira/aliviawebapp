# Módulo Cardiovascular & Metabólico (sRPE + FCR) — plano guardado

Objetivo: incluir no cálculo de carga a fadiga de corrida, ciclismo, esteira, campo e endurance, que hoje deixa o ACWR cego para 50–70% da carga semanal de quem corre/pedala/joga.

## Base clínica
- sRPE (Foster, 2001) equaliza estímulos diferentes: duração (min) × PSE (0–10).
- FC de repouso (FCR) matinal ≥5–7 bpm acima da linha de base pessoal = hiperativação simpática, má recuperação ou início infeccioso.
- Na reabilitação, a recidiva costuma vir do pico agudo de carga cíclica de impacto, não do HEP.

## Matriz de decisão (ACWR cardio × desvio da FCR) — sempre sugestão
| ACWR | FCR | Leitura |
|---|---|---|
| 0,8–1,3 | normal | adaptação aeróbia ótima |
| >1,5 | normal | pico agudo musculoesquelético — reduzir impacto |
| >1,5 | ≥+7 bpm | overreaching não funcional — deload (−50% duração ou PSE ≤4) |
| <0,8 | ≥+7 bpm | estresse extratreino (sono, psicossocial, infecção) |
| <0,8 | normal/baixa | destreino ou polimento |

## Fases
1. **MVP (feito)** — frente "Cardio / corrida" no check-in do paciente, no link do preparador, no microciclo e na aderência de dose; campo opcional "FC ao acordar" (25–140 bpm) no check-in; desvio vs. linha de base (média dos registros dos 28 dias anteriores, mínimo 3) no Monitor de carga: +5 atenção, +7 alerta.
2. **Leitura, alertas e planejamento automático**
   - **2A — Captura e leitura:** ler print de relógio/esteira/cinta (Strava, Polar, Garmin, XOSS) com IA (duração, distância, FC média/máx., PSE sugerida), sempre com revisão antes de salvar; ACWR cardio separado do ACWR total.
   - **2B — Alertas:** push quando ACWR cardio >1,5 ou FCR ≥+7 bpm (mesma regra de 1 alerta/paciente/dia); matriz acima exibida no prontuário com a leitura do momento.
   - **2C — Planejamento e sequência de treinos (automação):**
     - Sugestão da semana seguinte por frente (fisio, academia, campo, cardio), calculada localmente a partir da carga crônica, mantendo o salto semanal ≤10% e ACWR alvo 0,8–1,3.
     - Sequência dentro do microciclo: evita dois dias seguidos de alto estresse no membro acometido e distribui dias duros/leves/descanso.
     - Ajuste dinâmico pelo check-in do dia: FCR ≥+7 bpm ou prontidão baixa sugere reduzir a sessão (−50% duração ou PSE ≤4) ou trocar por descanso ativo; quadrante da matriz define o tipo de ajuste.
     - Coerência com a fase marcada do macrociclo (STEPS) e com o domínio de cada frente.
     - Sempre sugestão: o profissional aceita, edita ou descarta; aceitar grava em `periodization_sessions` (created_source próprio, ex.: 'auto'). Cálculo determinístico, sem créditos de IA (IA só na leitura de print).
3. **Studio** — linha editorial "monitorar coração e carga sem relógio caro" e planejamento automático da semana.

Sem integrações pagas (Garmin/Strava/Apple) até validar o uso.
