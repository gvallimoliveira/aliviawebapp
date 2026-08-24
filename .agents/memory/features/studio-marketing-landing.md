---
name: Studio Marketing Landing
description: Landing mutável /studio (só preview + admin) para gerar material de marketing dos 4 mundos do Aliv.iA
type: feature
---

# Aliv.iA Studio (`/studio`)

Landing **mutável**, exclusiva de preview, criada para gravar tela / capturar seções para Instagram.
Nunca deve ser linkada nas páginas publicadas, nem entrar no sitemap (`public/robots.txt` tem `Disallow: /studio`).

- Acesso: só em origem de preview/localhost **e** e-mail VIP admin (`isFallbackVip`); em localhost o dev
  sandbox libera para desenvolvimento. Em domínio publicado a rota mostra apenas um aviso interno.
- Controles flutuantes (`StudioControls.tsx`): mundo (Profissional / Paciente / Acadêmico / Clínica),
  formato (9:16, 1:1, Livre), "Nova landing preview" (nova seed), copiar link da versão, ocultar (tecla **H**).
- Estado vive na URL (`?world=&format=&seed=`) → o mesmo link reabre exatamente a mesma versão.
- `rng.ts` = PRNG determinístico por seed. `composePage.ts` monta a ordem das seções
  (sempre hero no início, closing no fim, exatamente 1 momento escuro kinetic no meio).
- Conteúdo por mundo em `src/pages/studio/content/*.ts` (headlines, kickers, kinetic, métricas,
  comparativos, jornadas, features, quotes, marquee, closings). Ampliar os pools = mais variedade de posts.
- Blocos em `src/pages/studio/blocks/` com "treatments" (variações de alinhamento/superfície).
- Regra de identidade: tipografia e paleta do projeto são fixas (tokens semânticos); só composição,
  densidade, alinhamento e ordem variam.
- Favoritos: `useStudioFavorites.ts` (localStorage `studio:favorites`, guarda mundo+formato+seed) e
  painel `StudioFavorites.tsx`. "Evoluir favorito" gera nova seed com `?from=<mundo>:<seed>`; o
  `composePage` herda ~60% da composição aprovada e sorteia o resto como novidade.
- Barra de ferramentas pode ser ocultada (botão "Ocultar" ou tecla **H**); quando oculta sobra apenas
  uma pílula discreta "Studio" no canto inferior direito para reabrir.
- Exportação: `StudioCapture.tsx` envolve cada seção e baixa PNG em `pixelRatio: 3` via `html-to-image`
  (arquivo `alivia-studio-<mundo>-<seed>-<n>-<bloco>.png`). O botão some junto com a barra (tecla H) e
  é excluído da captura por `data-studio-no-export="1"`.

## Regra de coerência (obrigatória)

- Toda `image` de bloco (features/journeys) deve mostrar **exatamente a tela do assunto** do título/tag.
  Nada de reaproveitar screenshot genérico (ex.: relatório PDF ilustrando "painel"). Sem pontas soltas.
- Mundo acadêmico: **nunca** afirmar "sem paciente real". O estudante usa o fluxo com pacientes reais
  (estágio, familiares) — a ressalva correta é que a conduta final é do supervisor com CREFITO ativo.
  O simulado é treino complementar, não limite do produto.
