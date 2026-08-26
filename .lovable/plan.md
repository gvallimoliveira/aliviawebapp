# Aliv.iA Studio público (produto) + Studio interno preservado

Duas coisas passam a coexistir:

- **Studio interno (`/studio`)** — exatamente como está hoje: só preview + sua conta VIP, marca Aliv.iA fixa, conteúdo dos 4 mundos, favoritos e miniaturas no localStorage deste navegador. **Congelado como ferramenta pessoal**: nada de multimarca, cota, login público ou billing entra aqui. Continua sendo o seu laboratório e a fonte de verdade do aprendizado criativo.
- **Studio público (novo, `/studio-pro/*`)** — o produto SaaS, para qualquer nicho, com marca do cliente, planos e créditos. Nasce por fora, sem tocar no fluxo interno.

Decisões já fechadas: mesma base de código, rota isolada · nome "Aliv.iA Studio" mantido · brand kit por onboarding manual **e** extração por IA de site/Instagram · assinatura + créditos extras.

## 0. Preservar o que já funciona (pré-requisito de tudo)

Regras invioláveis do plano:

- `/studio` mantém rota, gate (preview + VIP), controles, atalho **H**, personas, blocos, exportação e as chaves de localStorage `studio:favorites` e `studio:favorites:thumbs` **intactas**. Nenhum favorito seu se perde.
- O motor criativo é **extraído para um núcleo compartilhado** (`src/studio-core/`): rng, composePage, personas, picker, coverage, blocos, texturas, motion, caption, exportImage. O interno passa a importar desse núcleo com o tema Aliv.iA; o público importa o mesmo núcleo com o tema do cliente. Uma melhoria feita para o produto aparece nos dois.
- Refactor sem mudança de comportamento: os testes atuais (`studio-coverage`) mais um teste de "regressão de composição" (mesma seed → mesma sequência de blocos/tratamentos) provam que o interno continua idêntico após a extração.
- **Backup do seu acervo**: exportar/importar favoritos + miniaturas em arquivo JSON no painel interno, e (opcional) sincronizar seus favoritos na conta VIP no backend, para não depender de um só navegador.

## 1. Estrutura do Studio público

- Rotas próprias, shell próprio, zero vínculo visual com o Aliv.iA clínico: `/studio-pro` (landing), `/studio-pro/entrar`, `/studio-pro/criar` (editor), `/studio-pro/marcas`, `/studio-pro/artes`, `/studio-pro/planos`, `/studio-pro/conta`.
- Nada de hambúrguer do app, "Meu painel", gateway de perfis, suporte clínico ou vocabulário de fisioterapia. Head/SEO e OG próprios na rota.
- Auth compartilhada tecnicamente (mesmo backend), mas quem entra pelo Studio só vê Studio; contas do Studio não ganham nada no produto clínico e vice-versa.
- O interno **não** aparece em nenhum link do público (e segue fora do sitemap/robots).

## 2. Multimarca (o que o público ganha e o interno não)

- **Brand Kit por conta**: nome, logo, paleta (3-5 cores), par tipográfico (presets seguros do Studio), slogan, tom de voz, site/@, CTA padrão. A assinatura obrigatória nas artes (já implementada) passa a usar o logo/nome do cliente.
- **Onboarding manual**: formulário guiado de brand kit + nicho + objetivo.
- **Extração por IA**: usuário informa site (e opcionalmente @) → função de servidor lê a página, propõe logo, cores dominantes, tom de voz e os primeiros temas de conteúdo; o usuário revisa antes de salvar.
- **Conteúdo genérico**: em vez dos 4 mundos clínicos, "temas do cliente" (produtos, serviços, provas, dúvidas, frases de marca) alimentam o mesmo `picker`/cobertura editorial. Os mundos clínicos ficam só no interno.

## 3. Dados e permissões (só do produto público)

Novas tabelas, todas com RLS por `auth.uid()` e GRANTs explícitos:

- `studio_accounts` — workspace do Studio (dono, plano, status, trial).
- `studio_brands` — brand kits; limite por plano.
- `studio_brand_topics` — temas/conteúdos por marca.
- `studio_artworks` — artes salvas/exportadas (galeria persistida, analytics, cota).
- `studio_credit_quotas` / `studio_credit_transactions` — cota mensal + créditos extras (mesmo padrão dos créditos de IA atuais).
- Storage `studio-brand-assets` (logos/imagens do cliente).
- Opcional: `studio_internal_favorites` para o backup dos seus favoritos do Studio interno.

## 4. Monetização

- **Planos Stripe (mensal/anual)**: Solo (1 marca), Studio (3 marcas), Agência (10 marcas + exportação em lote), cada um com cota de gerações/mês.
- **Créditos extras**: pacotes avulsos para quando a cota acaba (gerar versão, extrair marca por IA, legendas/carrossel).
- **Trial**: X artes grátis sem cartão; alta resolução e ausência de watermark só no pago.
- Funções: `studio-create-checkout`, `studio-check-subscription`, `studio-customer-portal`, `studio-consume-credit`. Medidor de cota no editor e bloqueio com CTA de upgrade.
- Seu acesso VIP: conta interna sem cobrança e sem cota, tanto no interno quanto no público.

## 5. Fases

1. **Núcleo compartilhado**: extrair `src/studio-core/` + testes de regressão + backup/exportação dos favoritos internos. Zero mudança visível em `/studio`.
2. **Shell público**: rotas, landing, auth e onboarding de conta do Studio (sem billing ainda).
3. **Multimarca**: tabelas, storage, brand kit manual, motor lendo o tema do cliente.
4. **Extração por IA**: site → brand kit + temas propostos.
5. **Monetização**: planos, cota, créditos, portal de cancelamento, trial.
6. **Produto**: galeria persistida, exportação em lote, calendário, formatos 9:16/1:1/4:5.
7. **Go-to-market**: SEO da landing, exemplos por nicho, onboarding de 60 segundos.

## Riscos e pontos a decidir depois

- Extração de Instagram é instável sem API oficial: começar por site; o @ entra como dado declarado.
- Fontes: só presets do Studio no início (licenciamento + estabilidade do export PNG).
- Watermark do grátis vs. assinatura de marca já obrigatória.
- Preços e limites exatos de cota por plano.
- Nome de rota do público (`/studio-pro` é provisório) e futura marca própria, se você quiser separar mais tarde.

Nada muda na sua experiência atual do Studio interno; o público nasce por fora.
