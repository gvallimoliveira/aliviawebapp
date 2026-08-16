---
name: Pain Mechanism Roadmap
description: Roteiro segmentado do mecanismo de dor (nociceptivo/neuropático/nociplástico) + mapa corporal v2; status por passo e flags.
type: feature
---

Plano aprovado: `.lovable/plan/mecanismo-de-dor-mapa-corporal-roteiro-segmentado-baixo-risc-2026-08-16.md`.

Regras do roteiro: só adicionar (nunca substituir), uma flag por bloco, um passo por deploy, ordem dados → cálculo puro → UI → IA → PDF → painéis. Não tocar auth, push, videochamada nem pagamentos.

## Status
- **A1 concluído** — `src/lib/painMechanism.ts`: tipos, cópia pt/en/es, `classifyMechanism` determinístico (Kosek 2021 / Finnerup 2016 / CSI ≥ 40), `toStoredMechanism` / `parseStoredMechanism`.
- **A2 concluído** — `src/lib/painExtent.ts`: `computePainExtent` (segmentos canônicos, % de superfície, faixa) e `suggestDistribution`.
- **A3 concluído** — `assessments.pain_mechanism jsonb` e `assessments.pain_extent numeric`, ambos nullable.
- **A4 concluído** — tabela `pain_mechanism_screenings` (RLS: dono + admin; sem acesso anônimo — fluxos anônimos usam só o jsonb em `assessments`).
- Testes em `src/test/pain-mechanism.test.ts`.
- **Pendentes**: B1 (triagem no `ManualAssessmentModal`), B2 (premium), B3 (básica), C1-C4 (mapa v2), D1-D4 (IA), E1-E2 (badge e PDF), F1-F3 (evolução/suporte).

## Flags (ambas `false` hoje)
`ENABLE_PAIN_MECHANISM` — liga a triagem/UI de mecanismo.
`ENABLE_PAINMAP_V2` — liga chips espelhados + extent no mapa.
