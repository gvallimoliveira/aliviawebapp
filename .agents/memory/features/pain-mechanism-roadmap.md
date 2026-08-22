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
- **B2 + B3 concluídos** — `src/components/assessment/PainMechanismLite.tsx`: versão leiga (sem CSI, sem exame físico), 4 itens no fluxo básico e 6 no premium, tri-state com "não sei", distribuição herdada do mapa e descritores correlacionados aos tipos de dor da anamnese. Entra como sub-etapa `pain_mechanism` do `AnamnesisForm` logo após "Tipo de dor" (progresso do stepper se recalcula sozinho; entra no autosave junto com `AnamnesisData.painMechanism`). `buildMechanismPayload()` grava `assessments.pain_mechanism` nos fluxos básico/premium (`Assessment.tsx`), link profissional e link de clínica — só quando houve triagem.
- **C3/C4 dispensados (decisão do Guilherme, ago/2026)** — a intensidade por região já existe (sliders de nota por região no `ManualAssessmentModal`, lidos por `RegionPainComparison`) e a sensação já é coberta pelos `painTypes` da anamnese + descritores da triagem. Nada de `pain_regions_detail`; o Bloco D reaproveita esses campos existentes.
- **Concluído em D**: D1 — `generate-diagnosis` recebe `painMechanism` (determinístico do cliente) + `painExtent`, injeta bloco de contexto no prompt (Kosek 2021 / Finnerup 2016) e devolve `pain_mechanism` com `patient_explanation` em linguagem leiga. Fallback: se a IA não devolver campo válido, mantém o resultado das regras (`source: "rules"`); sem triagem, o campo é descartado. Hipótese continua limitada a 20 palavras (mecanismo nunca entra nela).
- **Concluído em D**: D2 — `interpret-external-assessment` extrai `painMechanismScreening` (critérios do whitelist de `MECHANISM_CRITERIA`, subtipo sugerido, duração em meses, CSI e citação de evidência) somente quando o arquivo dá suporte explícito; `mechanismAnswersFromExternal()` (em `PainMechanismScreening.tsx`) converte para `MechanismAnswers`, o `PatientDetailView` leva em `anamnesis_data.mechanismAnswers` e o `ManualAssessmentModal` pré-preenche a triagem para revisão do profissional (nada é definitivo sem revisão).
- **Concluído em D**: D3 — `generate-treatment` resolve o mecanismo (diagnosis.pain_mechanism → body.painMechanism), entra na chave de cache e injeta protocolo por mecanismo no prompt: nociceptivo (carga progressiva, guardrail dor ≤3/10), neuropático (sliders antes de tensores, progressão mais lenta, McKenzie com centralização), nociplástico (educação em dor, exposição gradual, dose por tempo e não por dor, sono/estresse como itens do plano), misto (teto pelo componente mais irritável). Devolve `painMechanismStrategy` (rationale, patientMessage leigo, avoid, progressionRule). Sem triagem, o plano segue o raciocínio padrão. Regra de superfícies instáveis mantida.
- **Concluído em D**: D4 — helper compartilhado `supabase/functions/_shared/pain-mechanism.ts` (`resolveStoredMechanism`, `mechanismSummary`, `mechanismContextBlock`, `mechanismHepRules`). `agent-generate-hep` lê `diagnosis.pain_mechanism` → `assessments.pain_mechanism` (+ `pain_extent`), injeta o resultado da triagem e regras de dosagem por mecanismo na seleção de exercícios (sliders antes de tensores no neuropático; dose por tempo e menos exercícios no nociplástico/sensibilização central; guardrail ≤3/10 no nociceptivo; teto pelo componente mais irritável no misto) e o mecanismo entra na chave de cache. `clinical-agent-chat` inclui `pain_mechanism` no contexto compacto do paciente e instrui o agente a usar o mecanismo para justificar conduta (ou sugerir a triagem quando ausente). Sem triagem, nada muda.
- **Pendentes**: E1-E2 (badge e PDF), F1-F3 (evolução/suporte).

## Flags
`ENABLE_PAIN_MECHANISM` — **true** desde B1: liga a triagem/UI de mecanismo (hoje só no fluxo manual PRO).
`ENABLE_PAINMAP_V2` — **true** desde C1/C2: contador/extent no mapa (a lista de chips espelhados foi removida a pedido — só o mapa clicável + resumo de extensão). Off volta ao mapa antigo (gravação de `pain_extent` continua, é inofensiva).

## Triagem aprofundada (revisão B1/B2 — assistente em 3 etapas)

- `src/lib/painMechanism.ts` ganhou `MECHANISM_CRITERIA` (17 critérios ponderados em 3 blocos: nociceptivo, neuropático, nociplástico; `requiresExam` marca os que exigem exame físico) e `MECHANISM_SUBTYPES` (mecânica x inflamatória, periférica x central, nociplástica primária x secundária).
- `classifyMechanism` aceita `criteria` e `subtype`; o subtipo escolhido pelo avaliador sobrepõe a sugestão automática e define o eixo periférico/central.
- `assessments.pain_mechanism` agora guarda `subtype` e `criteria` (auditoria/PDF futuros).
- UI: `PainMechanismWizard.tsx` — etapa 1 critérios com barras ao vivo, etapa 2 subtipo (+ CSI e distribuição só no fluxo PRO), etapa 3 resultado com raciocínio.
- Uso: fluxo manual PRO e reavaliação expressa (variant `pro`), avaliação premium (variant `patient`, linguagem leiga, sem itens de exame físico). Avaliação básica segue com `PainMechanismLite` (4 itens).

## Subtipo com peso real (revisão)
O subtipo confirmado na etapa 2 deixou de ser decorativo: cada opção tem `boost` (peso somado ao seu bloco) e `implication` (consequência clínica exibida na etapa 3). Consequências: as barras/% mudam ao trocar o subtipo; subtipo de outro bloco (ex.: nociplástica secundária em quadro nociceptivo) fixa o mecanismo secundário e leva o eixo a "misto"; `nociplastic_primary/secondary` e `central_neuropathic` marcam sensibilização central mesmo sem CSI. A etapa 2 oferece os subtipos do bloco dominante + de qualquer bloco com ≥ 40% do escore do topo (`subtypeChoicesFor`).
