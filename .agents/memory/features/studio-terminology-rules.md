---
name: Studio Terminology Rules
description: Regras duras de vocabulário do Studio — autoavaliação (só paciente), pré-avaliação (link do profissional) e proibição de afirmar "protocolo".
type: feature
---

Fonte única: `src/pages/studio/terminology.ts` (local, determinístico, zero crédito de IA).
Aplicado em `src/pages/studio/content/index.ts` e no `finish()` de `src/pages/studio-pro/brandContent.ts`.
Testes: `src/test/studio-terminology.test.ts`.

## Regra 1 — AutoAvaliação (só paciente com dor)
"Autoavaliação" vale apenas quando o fluxo é paciente ⇄ Aliv.iA, sem profissional envolvido:
marca Aliv.iA + público de paciente/sub-nicho clínico (`patientVoiceFor`).

Nunca vira autoavaliação:
- frase com ator profissional (`PRO_ACTOR`: clínica, fisioterapeuta, equipe, secretária, consultório,
  acadêmico, professor, estudante, supervisor, médico…) — mesmo que o público mencione "dor";
- avaliação de terceiro ("médica", "presencial", "com um fisioterapeuta", "procurar/agendar");
- "reavaliação" e "pré-avaliação";
- mundos pro / clínica / acadêmico e marcas de cliente.

`isPatientVoice` retorna false quando o probe casa `PRO_ACTOR` (ex.: "Clínica que atende dor crônica").

## Regra 2 — Pré-avaliação
`preAssessmentTerms`: quando a frase fala do link/convite que clínica, profissional ou acadêmico
envia ao paciente antes da consulta/sessão, o termo é "pré-avaliação". Aplicado só fora da voz de
paciente (paciente falando de si não usa o link do profissional). "Link na bio" da própria Aliv.iA
para o paciente segue "autoavaliação".

## Regra 3 — nunca afirmar "protocolo"
Trocado por método estruturado / direcionamento / raciocínio clínico (`deprotocol`); uso
crítico/contraste é preservado ("protocolo de prateleira", "mais que protocolo").

## Nota de manutenção
Ao editar acervos (`content/patient.ts`, `audiences.ts`, `aliviaCoreCharm.ts`, `nichePresets.ts`),
escrever já no vocabulário correto — o filtro é rede de segurança.
