---
name: Studio Persuasion Layer
description: Diretrizes do motor criativo (ago/2026) — ponto zero de alto impacto, jargão proibido, postura padrão e léxico exclusivo do Studio.
type: feature
---

Decisões tomadas sobre o PDF "Diretrizes do Motor Criativo" (ago/2026):

Aceito e implementado (`src/pages/studio/persuasion.ts`):
- **Ponto zero de alto impacto**: `PERSUASION_FRAMES` (lacuna de curiosidade, custo da inação, quebra de objeção com empatia, especificidade) entram SEMPRE e vêm primeiro no acervo de headlines — são eles que alimentam o slot principal dos blocos. `persuasionSubs` faz o apoio.
- **Objeções** ("não tenho tempo", "já tentei e parei", "não sei por onde começar") reconhecidas antes da solução. Preço comparado ao custo de não resolver; **proibido** "menos que um café".
- **Jargão proibido** (`BANNED_JARGON`): soluções inovadoras, excelência, transformar vidas, viralize, disruptivo, sinergia, seguidores por semana etc. Aplicado como `forbidden` em toda reescrita e coberto por `src/test/studio-persuasion.test.ts`.
- **Postura padrão** = sócio mais experiente (registro `direto`, `DEFAULT_REGISTER` em `lexicon.ts`), usada só quando o kit NÃO declara tom de voz. Tom do kit sempre sobrepõe.
- **Léxico da ferramenta** ("kit de marca", "seu tom", "sua paleta", "lote", "sem designer", "carrossel completo") é EXCLUSIVO da marca Aliv.iA Studio (`isStudioSelfBrand`). Nunca no motor global — vazaria vocabulário de ferramenta nas artes de clientes.

Rejeitado (decisão do dono, não reintroduzir):
- Limite de 9/12 **palavras**: mantido o corte por caractere + AutoFit, que nunca estoura margem.
- Proporção rígida 4 informar / 2 dor / 2 desejo / 2 venda por lote, estágio de consciência (frio/morno/quente) e séries temáticas de 3-5 peças: **não implementar** — o ângulo continua escolha manual do usuário e a variedade de assunto continua valendo mais.
