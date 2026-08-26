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
- Sem fallback de imagem: bloco sem screenshot correspondente renderiza só tipografia.
- A imagem NÃO é mais escolhida na copy: vem só de `imageForTopic(topic)` no registro canônico.
  Detalhe completo do sistema mestre (tópicos, cobertura editorial, guardas de teste) em
  `.agents/memory/features/studio-editorial-coverage.md` — consulte antes de gerar conteúdo.


## Volume e animação (ago/2026)

- `composePage` monta ~13-17 blocos por versão (miolo de 9-12 seções sem repetir a mesma
  seção em sequência) e **2** momentos kinéticos, em terços diferentes da página.
- ~50% dos blocos recebem animação de scroll via `blocks/StudioMotion.tsx`
  (`focusPull`, `zoomIn`, `zoomOut`, `gradientDrift`, `parallaxScrub`, `maskWipe`, `tiltRise`).
  Hero e closing sempre animam; nunca dois efeitos iguais em sequência.
- Contrato de captura: todo efeito é **neutro** quando o bloco está centralizado
  (progress ~0.5), para o PNG exportado nunca sair borrado/zoomado.

## Kit gráfico (2026-08-26, 2ª leva)

- `src/pages/studio/blocks/Texture.tsx` centraliza o repertório visual:
  - **TEXTURES** (8 tramas geométricas): quadriculado, pontos, hachura diagonal, colunas
    editoriais, anéis concêntricos, xadrez, plus (SVG inline), chevron. Todas com alfa baixo
    sobre tokens da marca; cada uma tem versão clara/escura (`style(dark)`).
  - **TextureLayer** — camada de fundo pronta, rotacionada por `persona.textureShift`.
  - **GeoOrnament** — 5 formas em contorno (anel, quadrado rotacionado, cluster de plus,
    anéis duplos, barras) sempre parcialmente fora do quadro.
  - **renderAccent(texto, variante)** — destaca a palavra mais longa da frase com 6 estilos
    contrastantes (cor teal, chip teal, chip tinta, chip areia, sublinhado grosso, contorno
    vazado). `DARK_ACCENT_INDEXES` restringe o sorteio em fundos escuros (chip tinta sumiria).
- Personas ganharam `textureShift` (0-7) e o movimento `slideDrift` (deriva horizontal,
  neutro no centro) entrou em `StudioMotion`/`MOTION_KINDS` e nos gostos de Marina, Otto e Bia.
- `KineticStatement` aceita `textureStyle?` opcional — o momento escuro do Studio recebe trama
  sem afetar as landings cinematográficas (que não passam a prop).
- TypoBlock agora tem 6 tratamentos (3 originais + 3 chips); TREATMENT_COUNT.typo = 6.
- MarqueeBlock varia o separador geométrico (ponto, losango, plus, quadrado) por persona.

## Estratégia de conteúdo (2026-08-27, decisões do fundador)

- Objetivo do perfil: converter fisios (Pro), atrair pacientes (B2C) e branding/autoridade.
- Tom de voz: equilibrado com provocação leve. Provas reais sempre anonimizadas
  ("CASO REAL, NOME PROTEGIDO"). CTA aponta para a landing do mundo do post.
- `content/brandDna.ts` codifica o DNA: posicionamento, léxico (frases proibidas como
  "a IA diagnostica por você"), pilares de conteúdo e regras de provocação.
- `src/pages/studio/brand.ts` é o módulo único de lockups (BRAND_LOGO/NAME/SLOGAN) —
  fundação para o futuro Studio-as-a-product multi-tenant. Todo bloco usa daí.
- Novos formatos de bloco (todos no `TREATMENT_COUNT` e no `caption.ts`):
  - **StoryBlock** (3 trat.) — storytelling de caso anonimizado: kicker → beats → virada → moral.
  - **ListBlock** (3 trat.) — lista editorial de valor ("4 sinais de que..."), fecho amarra na marca.
  - **BrandBlock** (4 trat.) — lockups institucionais (logo gigante, wordmark, selo) com
    `BRAND_DNA.statements`; só existe em versões de marca/autoridade.
  - **CarouselBlock** (3 trat.) — o compositor expande 1 bloco `carousel` em sequência
    capa → 2-4 slides → CTA (máx. 6 artes), com `slide={index,total,group}` estável:
    o `group` (posição na página) ancora o roteiro, então toda a sequência usa o mesmo
    carrossel. `composePage(rng, persona, inspiration, carousels)` recebe o pool como
    4º argumento; sem roteiros, degrada para `typo`. Slides do miolo podem mostrar a
    screenshot do `topic` (mesma regra de coerência dos demais blocos).
- WorldContent ganhou `stories`, `lists`, `carousels` (obrigatórios; acadêmico/clínica
  usam os defaults de `content/defaults.ts`).

## Formatos visuais de referência externa (2026-08-26, 3ª leva)

Referências aprovadas pelo fundador (posts "marun" e "RELOAD" + vídeos de carrossel):
- **EchoBlock** (`blocks/EchoBlock.tsx`, kind `echo`, 3 tratamentos): palavra-chave do
  acervo cinético repetida 7× em coluna, todas em contorno fino exceto a central
  preenchida (teal no claro, claro no escuro). Vem do `picker` de `content.kinetic`,
  então registra cobertura editorial. Linhas em contorno levam `data-studio-stroke`
  e são repintadas no canvas pelo exportImage (validado: PNG sai com contornos).
- **BrandBlock treatments 4 e 5**: wordmark "Aliv.iA" vertical cortado na lateral
  (estilo "marun"). Letras são spans empilhados (NUNCA writing-mode vertical — o
  repintador de stroke do export não reproduz writing-mode). Trat. 4 contorno à
  direita, trat. 5 preenchido baixa opacidade à esquerda; conteúdo central leva
  padding lateral (pr/pl) para nunca colidir com a coluna.
- **CarouselBlock treatment 3**: "palco central" — logo+nome pequenos no topo,
  headline gigante centrada, pill de CTA ("link na bio") e dots no rodapé.
- `TREATMENT_COUNT`: echo 3, brand 6, carousel 4. Personas com bias: Marina
  (echo 2, brand 4-5), Caio (echo 1), Enzo (echo 2,1).

## Equipe criativa (personas) — 2026-08-26
- `src/pages/studio/personas.ts`: 6 personas (Marina, Caio, Luma, Otto, Bia, Enzo) derivadas da seed via `personaForSeed`. Cada uma viesa superfícies (rotação), tratamentos, densidade, nº de blocos cinéticos, marquees e motion.
- `composePage(rng, persona?, inspiration?)` — persona é o 2º argumento (não trocar a ordem; captionFile.kindAt depende dela para reconstruir favoritos).
- Novos blocos: `StatsBlock` (stats com nota de rodapé), `TriptychBlock` (3 palavras), `TypoBlock` (tipografia-herói), `PinupBlock` (cartaz com arte autoral — exceção à regra "imagem só do tópico"; posters vivem em `src/assets/studio/poster-*.jpg` e são declarados na feature como `poster` + `headline`).
- Novos campos de copy em `WorldContent`: `stats`, `triptychs`, `typos` (mundo pro tem repertório próprio; demais mundos usam `content/defaults.ts`).
- `shared.ts`: `SURFACES` com 6 variantes, `personaSurface(persona, index)`, `pickHeadline(rng, headlines, taste)`.
- Badge da persona visível na barra do Studio (ícone PenTool).
