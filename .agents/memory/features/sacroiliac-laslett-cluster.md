---
name: Sacroiliac Laslett Cluster
description: Cluster de Laslett sugerido automaticamente na avaliação manual quando há dor sacroilíaca/glútea/lombar baixa.
type: feature
---

# Cluster de Laslett (sacroilíaca)

- Lógica em `src/lib/sacroiliacCluster.ts`: `detectSacroiliacPain` (ids de região do mapa de dor: sacrum, pelvis, sij, gluteal, lower_back/lumbar, hip + palavras-chave em texto livre) e `getSacroiliacClusterSuggestions` (pt/en/es).
- 5 testes: distração (gapping), thigh thrust, compressão pélvica, sacral thrust, Gaenslen. Regra: ≥2 positivos de 5 (ou 3 de 4 sem Gaenslen) → envolvimento sacroilíaco (Laslett, 2005).
- Aparece no passo de testes funcionais do `ManualAssessmentModal` de forma **determinística** (sem consumir IA), com badge âmbar "Cluster de Laslett" e badge "Laslett" em cada item; clicar adiciona ao bloco de testes.
- `suggest-functional-tests` recebe `sacroiliacSuspected` e é instruída a NÃO repetir os 5 testes, sugerindo diferenciadores (ASLR, FABER/FADIR, extensão-rotação lombar, neurodinâmica, controle de abdutores).
