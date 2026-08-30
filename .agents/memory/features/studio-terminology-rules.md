---
name: Studio Terminology Rules
description: Regras duras de vocabulário do Studio — "AutoAvaliação" para paciente da marca Aliv.iA e proibição de afirmar "protocolo".
type: feature
---

Fonte única: `src/pages/studio/terminology.ts` (local, determinístico, zero crédito de IA).
Aplicado em `src/pages/studio/content/index.ts` (Studio interno) e no `finish()` de
`src/pages/studio-pro/brandContent.ts` (Studio público). Testes: `src/test/studio-terminology.test.ts`.

## Regra 1 — AutoAvaliação
Arte da marca Aliv.iA dirigida a paciente ou sub-nicho clínico (dor crônica, pós-operatório,
60+, praticante de esporte) diz **autoavaliação**, nunca "avaliação" seca — quem responde é a
própria pessoa. Detecção: `patientVoiceFor(brand, probe)` = `isAliviaCoreBrand` + regex de
público de paciente.

Não muda:
- avaliação de terceiro ("avaliação médica", "presencial", "com um fisioterapeuta", "procurar/agendar uma avaliação");
- "reavaliação";
- mundos pro / clínica / acadêmico;
- marcas de cliente (Guilherme Vallim, PerformaPro, LoveChronicles…).

## Regra 2 — nunca afirmar "protocolo"
"Protocolo" em afirmação da marca é trocado por **método estruturado**, **direcionamento** ou
**raciocínio clínico**, escolhido pelo contexto (`deprotocol`). Uso crítico/contraste é
preservado de propósito ("protocolo de prateleira", "mais que protocolo"). "Protocolo" também
saiu dos sinônimos de método/processo em `lexicon.ts`.

## Nota de manutenção
Ao editar acervos (`content/patient.ts`, `audiences.ts`, `aliviaCoreCharm.ts`, `nichePresets.ts`),
escrever já no vocabulário correto — o filtro é rede de segurança, não desculpa.
