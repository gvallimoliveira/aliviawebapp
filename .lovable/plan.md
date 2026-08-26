# Aliv.iA Studio como produto aberto e rentável

Objetivo: transformar o Studio (hoje ferramenta interna, só preview + conta VIP) em um SaaS de criação de posts artísticos para qualquer nicho, morando no mesmo app mas **totalmente desassociado** do Aliv.iA clínico na experiência do usuário.

Decisões já fechadas: rota isolada dentro deste projeto · nome "Aliv.iA Studio" mantido · marca do cliente por onboarding manual **e** extração por IA de site/Instagram · monetização assinatura + créditos extras.

## 1. Isolamento do produto (o ponto mais crítico)

O Studio passa a ter shell próprio: layout, header, footer, auth e navegação exclusivos.

- Nenhum link, CTA, badge ou menu do Aliv.iA clínico dentro de `/studio/*`: sem hambúrguer do app, sem "Meu painel", sem gateway de perfis, sem suporte clínico.
- Rotas dedicadas: `/studio` (home/marketing), `/studio/entrar`, `/studio/app` (editor), `/studio/marcas`, `/studio/planos`, `/studio/conta`.
- Home do Studio é uma landing de produto criativo (o que é, exemplos de artes, planos, CTA "Criar minha primeira arte"). Zero vocabulário de fisioterapia.
- Head/SEO próprios: title, description, OG e favicon do Studio; `index.html` continua do Aliv.iA e o Studio ajusta as metas na rota.
- Sessão compartilhada tecnicamente (mesmo backend/auth), mas a UI nunca revela o outro produto. Quem entra pelo Studio só vê Studio.
- Remover o gate atual (preview + VIP) e trocar por acesso público com plano/trial.

## 2. Motor criativo multimarca

Hoje o motor tem a marca fixa (`brand.ts`, `brandDna.ts`) e conteúdo de fisioterapia (`content/`). Vira genérico:

- **Brand Kit por conta**: nome, logo, paleta (3-5 cores), par tipográfico, slogan, tom de voz, links (site/@), CTA padrão, assinatura obrigatória nas artes (já implementada — passa a usar o logo do cliente).
- **Onboarding manual**: formulário guiado de brand kit + escolha de nicho/objetivo.
- **Extração por IA**: usuário informa site ou @Instagram → função de servidor lê a página, extrai logo, cores dominantes, tipografia aparente e tom, e propõe o brand kit + primeiros temas de conteúdo para o usuário revisar antes de salvar.
- **Fonte de conteúdo genérica**: substituir o `content/` clínico por "temas do cliente" (produtos, serviços, provas, dúvidas frequentes, frases de marca) — parte preenchida no onboarding, parte gerada por IA a partir do site.
- Personas criativas, texturas, blocos, carrosséis, legendas e exportação PNG continuam como estão — passam a ler o tema do cliente em vez da marca fixa.

## 3. Dados e permissões

Novas tabelas (todas com RLS por `auth.uid()` e GRANTs):

- `studio_accounts` — conta/workspace do Studio (dono, plano, status).
- `studio_brands` — brand kits (logo em storage, cores, fontes, tom, links); limite por plano.
- `studio_brand_topics` — temas/conteúdos por marca (alimenta o motor e a cobertura editorial).
- `studio_generations` — histórico de artes geradas/exportadas (para cota, analytics e "minhas artes").
- `studio_credit_*` — cota mensal e transações de créditos extras (mesmo padrão dos créditos de IA já existentes).
- Bucket de storage `studio-brand-assets` para logos/imagens do cliente.

## 4. Monetização

- **Planos (assinatura mensal, Stripe Checkout)**: Solo (1 marca, cota base), Studio (3 marcas, cota maior), Agência (10 marcas, cota alta + exportação em lote). Toggle mensal/anual.
- **Créditos extras**: pacotes avulsos consumidos quando a cota do mês acaba (gerar versão, extrair marca por IA, gerar legenda/carrossel).
- **Trial**: X artes grátis sem cartão; exportação em alta resolução e remoção de watermark só no plano pago.
- Funções de servidor: `studio-create-checkout`, `studio-check-subscription`, `studio-customer-portal` (cancelamento self-service), `studio-consume-credit`.
- Medidor de cota visível no editor e bloqueio elegante com CTA de upgrade.

## 5. Experiência mínima de produto (além do editor atual)

- Galeria "Minhas artes" persistida na conta (hoje favoritos vivem no localStorage).
- Seletor de marca ativa no topo do editor.
- Planejador/calendário simples de publicação com exportação de legendas (já existe base de schedule).
- Exportação em lote e formatos 9:16, 1:1 e 4:5.

## 6. Fases sugeridas

1. **Isolamento**: shell, rotas, landing, remoção do gate VIP e de qualquer vínculo visual com o Aliv.iA clínico.
2. **Multimarca**: tabelas, storage, onboarding manual de brand kit, motor lendo o tema do cliente.
3. **Extração por IA**: site/Instagram → brand kit + temas sugeridos.
4. **Monetização**: planos Stripe, cota, créditos extras, portal de cancelamento, trial.
5. **Produto**: galeria persistida, lote, calendário, formatos extras.
6. **Go-to-market**: SEO da landing, exemplos por nicho, onboarding de 60 segundos.

## Riscos e pontos a decidir depois

- Extração de Instagram é instável sem API oficial (login/bloqueios); começar por site e usar o @ apenas como dado declarado.
- Fontes do cliente: só presets seguros do Studio no início (evita licenciamento e falhas de export).
- Watermark do plano grátis vs. a assinatura de marca já obrigatória nas artes.
- Preços exatos e limites de cota por plano.

Nada de usabilidade muda até você aprovar.
