# Aliv.iA Studio público — fases restantes + acesso VIP multimarca e convites

Atualização do plano do Studio público com duas demandas novas: **VIP como agência multimarca com marcas totalmente separadas** e **concessão de acesso VIP (equivalente ao plano Solo, grátis) a partir da própria conta VIP dentro do Studio**.

## Onde estamos

- Fase 1 (núcleo compartilhado, backup de favoritos, testes) — pronta.
- Fase 2 (landing `/studio-pro`, entrada `/studio-pro/entrar`, shell `/studio-pro/app`, tabelas `studio_brands` / `studio_credits` / `studio_creations` / `studio_internal_favorites`) — pronta.
- Endereço final: `aliviawebapp.com.br/studio-pro` (basta republicar).

## Fase 3 — VIP agência multimarca com separação total (nova prioridade)

Objetivo: minha conta VIP funciona como plano Agência (15 marcas, sem cobrança e sem cota), e cada marca é um espaço isolado — nada de arte de uma marca aparecer na outra.

- **Plano efetivo por conta**: helper único `resolveStudioPlan(user)` que devolve `agencia` + `unlimited` para os e-mails VIP (reaproveitando `vipEmails.ts` e a tabela `vip_users`), `solo/marca/agencia` para assinantes e `free` para o resto. Todo limite de marcas, cota e watermark passa a consultar esse helper — nunca ler o plano cru da tabela.
- **Marca ativa como contexto de navegação**: rota `/studio-pro/app/marca/:brandId` com sub-rotas `/criar`, `/artes`, `/fotos`, `/ajustes`. A marca vive na URL (persiste ao minimizar/trocar de app, mesmo padrão já usado no prontuário).
- **Seletor de marca**: página `/studio-pro/app` passa a ser o "hub de marcas" — grade de cartões com logo, cor, nicho, contagem de artes e último uso; botão de nova marca; busca quando houver muitas. No shell da marca, um switcher compacto no topo troca de marca sem perder a aba atual.
- **Isolamento dos dados**: `studio_creations` e `studio_photos` ganham `brand_id` (FK para `studio_brands`, `ON DELETE CASCADE`), com índice `(user_id, brand_id)`. Toda leitura de artes/fotos filtra pela marca ativa; nenhuma consulta sem `brand_id` na área da marca. Migração define `brand_id` das artes já existentes para a primeira marca do dono (ou deixa nulo em "sem marca", visível só numa pasta legada).
- **Pastas dentro da marca**: campo `folder` (texto livre, default "Geral") em `studio_creations`, com filtro por pasta na galeria da marca e ação de mover arte entre pastas. Cobre "pastas por cliente" do plano Agência.
- **Favoritos por marca**: chave de favoritos do público passa a ser por `brand_id`, sem tocar nas chaves do Studio interno (`studio:favorites`, `studio:favorites:thumbs`).
- **Usabilidade**: breadcrumb `Marcas › <marca> › <aba>`, cor primária da marca aplicada no shell da marca, atalho para duplicar kit de marca, e estado vazio que leva direto ao editor.

## Fase 4 — Convites VIP (acesso Solo gratuito)

Objetivo: dentro do Studio, logado com a conta VIP, eu concedo acesso gratuito equivalente ao **Solo** a quem eu quiser.

- **Tabela `studio_granted_access`**: `email` (normalizado, único), `plan` (default `solo`), `granted_by`, `note`, `revoked_at`, `created_at`. GRANTs explícitos + RLS: só VIP (função `is_studio_vip()` security definer, checando `vip_users`/whitelist) lê e escreve; o beneficiário pode ler apenas o próprio registro.
- **Resolução do plano**: `resolveStudioPlan` consulta essa tabela — e-mail com concessão ativa vira `solo` (marca única, 60 artes/mês, download sem marca d'água), sem passar por Stripe. Concessão revogada volta para `free`.
- **Painel VIP em `/studio-pro/app/vip`** (visível só para VIP): lista de concessões com e-mail, data, status, quem concedeu; formulário de concessão por e-mail com validação; ações revogar/reativar; contador de concedidos ativos.
- **Sinalização para o convidado**: selo "Acesso cortesia — plano Solo" no hub de marcas e no medidor de cota, para ficar claro que não há cobrança.
- **Convite sem conta ainda**: a concessão é por e-mail, então funciona antes do cadastro — ao criar a conta com aquele e-mail, o acesso já vale. Opcional: e-mail transacional de convite com o link `/studio-pro/entrar`.

## Fase 5 — Extração de marca por IA

Site (e @ declarado) → função de servidor propõe logo, cores dominantes, tom de voz e primeiros temas; usuário revisa antes de salvar no kit.

## Fase 6 — Monetização

Planos Stripe mensal/anual (Solo 39, Marca 99, Agência 249, anual −20%), cota mensal, créditos extras, portal de cancelamento, watermark só no grátis, medidor de cota no editor e bloqueio com CTA de upgrade. VIP e concessões ficam fora da cobrança por construção (Fases 3 e 4).

## Fase 7 — Produto

Galeria persistida com filtros, exportação em lote, calendário editorial, formatos 9:16 / 1:1 / 4:5, legendas e carrosséis.

## Fase 8 — Go-to-market

SEO da landing, exemplos por nicho, onboarding de 60 segundos, métricas de conversão e retenção.

## Detalhes técnicos

- Migrações: `ALTER TABLE studio_creations ADD COLUMN brand_id uuid REFERENCES studio_brands(id) ON DELETE CASCADE`, idem em `studio_photos`, `folder text NOT NULL DEFAULT 'Geral'`, índices, e `CREATE TABLE studio_granted_access` com GRANT + RLS na mesma migração.
- Sem mudanças em `/studio` (interno) e sem qualquer link entre Studio público e app clínico.
- Testes: regressão de composição (`studio-core-regression`) mantida, mais teste de `resolveStudioPlan` (VIP → agência ilimitado; e-mail concedido → solo; revogado → free) e teste de que consultas de artes exigem `brand_id`.
