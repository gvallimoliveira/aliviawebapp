---
name: Studio Authorial Mode
description: Marcas com content_source 'authorial' — o Studio diagrama textos do autor (studio_texts) sem escrever nada, com regras duras de coerência.
type: feature
---

Marca autoral (`studio_brands.content_source = 'authorial'`, ex.: **@lovechronicleswithpain**): o motor textual NÃO escreve. As artes usam somente:

- os textos autorais da marca (tabela `studio_texts`: título + corpo, por marca/usuário);
- os slogans do kit da marca (`studio_brands.slogan`).

Regras inegociáveis (`src/pages/studio-pro/authorial.ts`, teste `src/test/studio-authorial-coherence.test.ts`):
1. Fragmentação por parágrafo; parágrafo > 260 caracteres abre em frases.
2. Uma arte usa 1 a 3 fragmentos **contíguos** de **um único** texto (nunca a1+b1, nunca a2+a5).
3. Carrossel = o texto INTEIRO em ordem cronológica, até 20 slides; se houver mais fragmentos, agrupa contíguos por slide (nunca corta o final).
4. Slogan é peça própria — nunca junto de fragmento de texto.
5. Determinístico: mesma seed = mesmo lote; zero crédito de IA (não há geração de texto).

Render: `AuthorialArtBlock.tsx` (6 layouts tipográficos; fotos do acervo entram como fundo total ou em faixa, sempre esmaecidas com véu + opacidade/saturação baixas para não competir com o texto). Editor: `StudioProAuthorial.tsx` (substitui `StudioProCreate` na aba Criar). Cadastro dos textos: `BrandTextsCard.tsx` na etapa de conteúdo dos ajustes da marca.

Nunca reintroduzir copy gerada, jargão, CTA de venda ou acervo neutro nessas marcas.
