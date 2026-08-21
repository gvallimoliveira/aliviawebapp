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
- **B1 concluído** — `src/components/assessment/PainMechanismScreening.tsx` (descritores, distribuição com sugestão do mapa, 6 itens tri-state, CSI opcional, badge determinístico) inserido no fim da etapa "Intensidade & Tipo" do `ManualAssessmentModal` (sem criar nova etapa, para não reindexar o stepper). Salva `assessments.pain_mechanism` + `pain_extent` só quando houve triagem, e registra auditoria em `pain_mechanism_screenings` (falha silenciosa, nunca invalida o save). Entra no autosave do rascunho.
- **C1 concluído** — `PainMap.tsx`: lista de chips da vista atual espelhando o SVG (clique/hover sincronizados nos dois sentidos). Estrutura de dados inalterada (`painRegions: string[]`).
- **C2 concluído** — contador + `~% de superfície corporal` + faixa (localizada/regional/difusa) exibidos no mapa, e gravação de `assessments.pain_extent` via `painExtentValue()` nos fluxos premium/básico (`Assessment.tsx`), link profissional, link de clínica e manual PRO. Null quando não há regiões.
- **Pendentes**: B2 (premium), B3 (básica), C3-C4 (intensidade/sensação por região), D1-D4 (IA), E1-E2 (badge e PDF), F1-F3 (evolução/suporte).

## Flags
`ENABLE_PAIN_MECHANISM` — **true** desde B1: liga a triagem/UI de mecanismo (hoje só no fluxo manual PRO).
`ENABLE_PAINMAP_V2` — **true** desde C1/C2: liga chips espelhados + contador/extent no mapa. Off volta ao mapa antigo (gravação de `pain_extent` continua, é inofensiva).
