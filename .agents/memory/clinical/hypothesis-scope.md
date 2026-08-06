---
name: Hypothesis Scope
description: Hipótese diagnóstica (IA) deve ser rótulo curto — nunca texto longo com fatores agravantes, medidas ou impacto funcional.
type: feature
---

- Campo `hypothesis` = **rótulo diagnóstico curto**: condição + estrutura/lado (+ categoria de mecanismo, ex. "fatores mecânicos e de carga").
- Limites: 1 frase, máx. 20 palavras, sem ponto-e-vírgula nem listas.
- PROIBIDO na hipótese: fatores agravantes/aliviantes, valores de ADM/força, EVA, impacto funcional, achados de mobilidade, prognóstico, raciocínio. Isso vai em `summary`/`reasoning`.
- Atenção redobrada em **avaliações externas** (`interpret-external-assessment`): o texto do arquivo vem bagunçado; extrair só o rótulo, nunca copiar frases descritivas longas.
- Regra vale para `generate-diagnosis` e `interpret-external-assessment`.
