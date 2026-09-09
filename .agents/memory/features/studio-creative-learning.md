---
name: Studio Creative Learning Loop
description: Aprendizado contínuo do Studio — correções de texto do dono da marca, memória entre lotes, briefing de IA perpetuado e coleta de resultados por geração.
type: feature
---

# Ciclo de aprendizado do Studio (diretor + motor)

## 1. Correções de texto viram regra da marca (fim do retrabalho)
- Tabela `studio_copy_learning` (brand_id + signature únicos): `original_text`, `edited_text`, `uses`.
- `src/pages/studio/copyLearning.ts`: `learnedKey`, `buildRewrites`, `applyLearnedCopy`, `diffArtText`.
- `src/pages/studio-pro/useCopyLearning.ts`: carrega, expõe `rewrites` + `voice` e grava com `learn()`.
- Em `StudioProCreate.tsx` o acervo passa por `applyLearnedCopy(baseContent, learning.rewrites)` ANTES do diretor: a frase recusada nunca volta a ser oferecida.
- `startEdit` guarda o texto original em `textBeforeEdit`; `finishEdit` compara e chama `learning.learn()`.
- `learning.voice` (frases escritas pelo usuário) entra no diretor como `learnedVoice` e atrai as escolhas.

## 2. Diretor dirige TODOS os acervos
- `SLOT_QUOTA` em `director.ts` reserva por arte: headlines, subs, kickers, closings, typos, quotes, features (5), compare, kinetic, marquee, lists, journeys, stories, triptychs, hooks — e `SALES_QUOTA` para proofs/objections/offers/ctas.
- FORA de propósito: `stats`, `metrics` (dado real com fonte) e `carousels` (indivisível).
- `TOO_SIMILAR = 0.62`; penalidade de similaridade ×5.

## 3. Memória entre lotes
- `planBatch({ weightOf })` recebe o peso da marca (`usePhraseMemory`) por ref estável (`useCallback`) — nunca por objeto, senão a gravação (2,5 s) remontaria o lote e trocaria o texto em tela.
- Um `useEffect` registra as assinaturas do roteiro no `phraseMemory`, então a próxima geração já desconta o que foi ao ar.

## 4. Briefing de IA perpetuado (admin lê, todos aproveitam)
- Tabela `studio_brand_briefs` (brand_id + kit_version): a leitura da IA é guardada.
- `useBrandBrief` SEMPRE carrega o briefing guardado (mesmo com IA desligada) e só chama `studio-brand-brief` quando: admin VIP + botão ligado + kit mudou desde o briefing salvo.
- O diretor recebe `brief` independentemente do toggle — é assim que a otimização feita na conta admin chega "em caixa fechada" ao motor local, sem crédito.

## 5. Coleta de resultados
- Tabela `studio_director_runs` (brand_id + batch_key): `ai_on`, `arts`, `distinct_copy`, `repeated_copy`, `learned_applied`, gravada uma vez por geração via `director.report()`.
