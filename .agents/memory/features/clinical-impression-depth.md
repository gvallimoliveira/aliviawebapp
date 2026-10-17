---
name: Clinical Impression Depth
description: A impressão clínica deve ser profunda e obrigatoriamente analisar dinamometria, amplitude de movimento e notas de evolução das sessões.
type: feature
---

- `generate-clinical-impression` produz visão **profunda** (8–14 linhas, parágrafos curtos) — não é resumo raso.
- Blocos obrigatórios quando os dados existem:
  - **Dinamometria**: citar valores reais (média e melhor em kgf), nº de medidas, CV% (>15% = reprodutibilidade duvidosa), assimetria E/D pela média e balanço agonista/antagonista no mesmo lado. Limite **>10% = déficit relevante** (D.I.F.I); ≤10% simétrico.
  - **ADM/ROM**: articulações restritas, comparação de lados, correlação com hipótese e força.
  - **Notas de sessão NÃO entram na impressão clínica** (pedido do usuário, 2026-10-17).
  - **Anotações do profissional** (additionalClinicalNotes, functionalTests em texto) e **questionários complementares** (specialtyResults, ex. SRS-22r) são fonte primária na impressão e na hipótese (helper `_shared/professional-context.ts`).
- Sempre CORRELACIONAR achados objetivos com sintomas, questionários e hipótese — nunca listar números sem interpretar. Nunca inventar valores; se não houver dado, não especular.
- Cache: chave inclui `PROMPT_VERSION` — bumpar ao mexer no prompt/blocos. Botão "Regenerar" envia `forceRefresh: true`.

- 2026-08-25: Impressão clínica passa a incorporar gravações de anamnese (`assessment_voice_notes` status=ready): resumo estruturado + trecho da transcrição (até 5 notas, 2500 chars cada) entram no prompt como fonte primária. Front envia `voiceNotes` (shared.tsx); PROMPT_VERSION=ci-v3-voice-notes invalida cache antigo.
