---
name: Studio Multi-Slogan e Siglas
description: Slogans do kit são independentes (um por linha) e siglas como DNA não sofrem flexão de artigo.
type: feature
---

- Campo `slogan` de `studio_brands` aceita VÁRIAS frases, uma por linha (`sloganList` em `audiences.ts`). Cada linha é um slogan **independente** — nunca se juntam na mesma arte. A primeira é a do lockup; as demais entram na rotação do sub-nicho "Slogan em destaque" (sorteio determinístico pela seed do lote).
- `agreement.ts` não flexiona determinante antes de sigla em maiúsculas ("O DNA" permanece; nunca "A DNA").
- Marca Aliv.ia Studio: slogans ativos = "O DNA da sua marca em forma de arte." e "Sua marca postando todo dia, sem designer."
