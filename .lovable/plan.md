## 1. Red flags respondidas uma única vez

Hoje o handoff básico → premium (`DiagnosisResult.tsx` → `alivia-basic-upgrade-data` → `Assessment.tsx`) carrega apenas anamnese, regiões, dor, nome e e-mail. As respostas de red flag do fluxo básico ficam só no estado React da avaliação básica, então o premium abre a triagem de novo (`step === "payment_check" && premiumPreScreen === "screening"`).

Mudanças:
- Incluir `redFlagPayload` (o payload probatório completo de `buildRedFlagPayload`, com respostas, timestamp e outcome) no pacote de upgrade salvo em `DiagnosisResult.tsx`, nos dois botões (pagamento único e plano mensal), e repassá-lo em `getBasicUpgradePayload()` para o caminho de boleto/pagamento assíncrono (`basic_upgrade_data` → `pending_upgrade_data`).
- No `Assessment.tsx` em modo premium: ao restaurar os dados de upgrade (localStorage/sessionStorage ou banco), se existir um payload de red flag válido e recente (mesma janela de 30 min do upgrade) com `outcome === "passed"`, hidratar `redFlagAnswers`/`redFlagPayload` e ir direto para `premiumPreScreen = "passed"` — a etapa nem aparece.
- Se o payload restaurado tiver red flag positiva, manter o comportamento de bloqueio/ressalva atual (não pular).
- Para não perder rastreabilidade, o payload reaproveitado é gravado normalmente em `assessments.red_flags` no `createAssessment()` do premium, com uma marcação de origem (`carried_from_basic: true`) para o relatório/PDF.
- Fallback seguro: sem payload (ex.: outro dispositivo, sessão nova), a triagem continua sendo exibida como hoje.

## 2. Coerência entre hipótese básica e premium

Hoje `generate-diagnosis` é chamado no premium sem qualquer referência à hipótese gerada na básica, então os dois textos podem divergir sem explicação.

Mudanças:
- Levar também o diagnóstico da básica (`hypothesis`, `confidence`, `summary`) no pacote de upgrade e restaurá-lo no `Assessment.tsx`.
- Enviar como `previousBasicDiagnosis` no corpo de `generate-diagnosis` (entra também na chave de cache, portanto sem colisão com respostas antigas).
- No prompt da função: quando houver hipótese prévia, instruir a IA a **manter a linha diagnóstica iniciada** se os novos dados (questionários + testes funcionais) não a contradisserem — refinando/detalhando em vez de renomear; e, se os novos dados realmente exigirem mudança, mudar e preencher um novo campo `hypothesisChange` no JSON com: hipótese anterior, hipótese atual e a justificativa objetiva (quais respostas/testes do premium motivaram a revisão).
- No `DiagnosisResult.tsx` (modo premium), exibir um bloco discreto de continuidade quando `hypothesisChange` existir: "Sua hipótese foi refinada" + antes → depois + motivo, em pt/en/es.

## 3. Botão "Doloroso / Desconfortável" mal dimensionado

Em `FunctionalTests.tsx` os dois botões estão num `grid grid-cols-2 gap-3` com `h-auto py-3`, e o texto longo em português estoura a coluna no mobile (como na imagem).

Mudança: permitir quebra de linha e centralizar (`whitespace-normal`, `text-center`, `leading-snug`, ícone com `shrink-0`) e usar coluna única no mobile com duas colunas a partir de `sm`, mantendo os dois botões com a mesma altura.

## Notas técnicas

- Arquivos: `src/components/assessment/DiagnosisResult.tsx`, `src/pages/Assessment.tsx`, `src/components/assessment/FunctionalTests.tsx`, `supabase/functions/generate-diagnosis/index.ts`, locales pt/en/es.
- Nenhuma migração de banco necessária: `red_flags` e `diagnosis` já são `jsonb`.
- Ajuste apenas do fluxo self-service (básico → premium); os fluxos profissional e clínica não mudam.
