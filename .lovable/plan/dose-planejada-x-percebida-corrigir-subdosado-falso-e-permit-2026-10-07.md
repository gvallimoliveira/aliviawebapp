# Dose planejada x percebida: corrigir subdosado falso e permitir sPSE retroativa

## O que está errado hoje (verificado)
1. **Soma inclui sessões futuras**: o aviso do check-in soma toda sessão planejada a partir de 6 dias atrás, sem limite final — a sessão de quinta entrou no planejado do Fábio.
2. **Sessão sem nota conta como zero**: a sessão de ontem, sem resposta, virou "0 realizado" → subdosada.
3. **Paciente só responde o dia de hoje**: o link de check-in não deixa informar a PSE de sessões anteriores.
4. O aviso ainda usa data UTC em alguns pontos (fere a regra do "hoje" local).

## O que vai mudar
### 1. Regra única de dose
- Só entram na comparação sessões **já realizadas e com resposta** (data ≤ hoje e com sRPE do paciente ou do profissional). Planejado e percebido são comparados apenas nessas sessões.
- Sessões passadas sem nota aparecem **à parte** como "sem resposta" — nunca contam como subdosadas.
- Sessões futuras aparecem como "a realizar", fora da soma.
- A mesma regra vale no prontuário (card de dose, sessão por sessão, PDF da semana) e no planejamento automático.

### 2. Notificação
- Dose planejada x percebida **deixa de gerar notificação** no celular; fica só no prontuário. Avisos de ACWR e prontidão continuam como hoje.

### 3. Paciente informa sessões anteriores (até 7 dias)
- No link de check-in, novo bloco "Sessões dos últimos dias sem resposta": lista as sessões planejadas dos últimos 7 dias sem nota, cada uma com botão para informar duração e PSE.
- Botão "Registrar treino extra": escolher um dia dos últimos 7 (nunca futuro), frente, duração e PSE.
- Servidor recusa datas futuras ou com mais de 7 dias; mantém "uma sessão por data e frente" (se o profissional já lançou, a PSE do paciente é guardada à parte, como hoje).

### 4. Ajustes de texto
- Suporte e FAQ (pt/en/es) explicando a janela de 7 dias e que sessões sem resposta não contam como subdose.

## Verificação
- Testes: semana com sessão ontem (sem nota) + quinta futura → nenhuma subdose, 1 "sem resposta", 1 "a realizar".
- Teste do envio retroativo (dentro/fora da janela de 7 dias, data futura recusada).
- Conferir o caso do Fábio no prontuário após a mudança.

## Notas técnicas
- `src/lib/periodization.ts`: `adherenceByTrack` e `sessionAdherence` recebem `today` (`localISODate`) e passam a filtrar por data ≤ hoje e pareamento com resposta; novos campos `unanswered`/`upcoming`.
- `supabase/functions/periodization-checkin/index.ts`: remover bloco de dose do `load_alert`; `get` passa a devolver pendentes dos últimos 7 dias; `submit_srpe` valida janela [hoje-7, hoje] em America/Sao_Paulo.
- Página pública do check-in: bloco de pendentes + treino extra.
- Cards: `DoseAdherenceCard`/afins, `generateMicrocyclePdf.ts`, `autoPlan.ts` usam a regra única.
