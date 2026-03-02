
# Programa de Indicacao - "Indique e Ganhe"

## Resumo
Sistema de referral onde cada usuario gera um codigo/link unico. Quando um amigo se cadastra e paga pela avaliacao Premium usando esse codigo, o indicador recebe um cupom de desconto para sua proxima avaliacao.

---

## 1. Banco de Dados

### Nova tabela `referral_codes`
Armazena o codigo unico de cada usuario:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL) - dono do codigo
- `code` (text, UNIQUE, NOT NULL) - codigo curto (ex: "ALIVIA-AB12CD")
- `created_at` (timestamptz)

### Nova tabela `referral_rewards`
Registra cada indicacao bem-sucedida e o desconto gerado:
- `id` (uuid, PK)
- `referrer_user_id` (uuid, NOT NULL) - quem indicou
- `referred_user_id` (uuid, NOT NULL) - quem foi indicado
- `referral_code_id` (uuid, FK -> referral_codes.id)
- `status` (text, default 'pending') - pending | rewarded | used
- `discount_percent` (integer, default 20) - % de desconto concedido
- `created_at` (timestamptz)
- `rewarded_at` (timestamptz, nullable)

### RLS Policies
- `referral_codes`: usuarios veem/criam apenas seus proprios codigos; SELECT publico para validar codigos (sem expor user_id)
- `referral_rewards`: usuarios veem apenas rewards onde sao referrer ou referred

---

## 2. Fluxo do Sistema

```text
1. Usuario acessa Dashboard → ve card "Indique e Ganhe"
2. Codigo gerado automaticamente (ou no primeiro clique)
3. Usuario compartilha link: alivia.app/?ref=ALIVIA-AB12CD
4. Amigo se cadastra → ref code salvo no profile ou localStorage
5. Amigo paga Premium → edge function "create-payment" registra referral_reward
6. Indicador recebe desconto (cupom Stripe) na proxima compra
```

---

## 3. Edge Function: `create-payment` (atualizar)

Adicionar logica para:
- Receber `referral_code` opcional no body
- Se presente, validar o codigo na tabela `referral_codes`
- Verificar que o usuario nao esta se auto-indicando
- Criar registro em `referral_rewards` com status 'pending'
- Criar um Stripe Coupon (20% off, once) e associar ao `referrer_user_id` para uso futuro
- Atualizar `referral_rewards.status` para 'rewarded' apos pagamento confirmado

---

## 4. Edge Function: `verify-payment` (atualizar)

No modo `check_access`, incluir na resposta:
- `available_discount`: retornar desconto disponivel (se houver reward com status 'rewarded' nao usado)
- Quando o usuario usar o desconto, marcar como 'used'

---

## 5. Frontend

### Landing Page (captura do ref code)
- `Index.tsx`: capturar query param `?ref=CODIGO` e salvar em `localStorage`

### Dashboard - Card "Indique e Ganhe"
- Mostrar codigo de indicacao do usuario (gerar se nao existir)
- Botao "Copiar Link" com link completo
- Botao "Compartilhar" (Web Share API em mobile)
- Contador: "X amigos indicados"
- Se houver desconto disponivel: badge destacado "Voce tem 20% de desconto!"

### Fluxo de Pagamento
- Na tela de Premium, se `localStorage` tiver ref code, enviar junto ao `create-payment`
- Na tela de Premium, se usuario tiver desconto disponivel, mostrar preco com desconto riscado

---

## 6. Traducoes (i18n)

Novas chaves PT/EN:
- `referral.title` / "Indique e Ganhe" / "Refer & Earn"
- `referral.subtitle` / "Indique amigos e ganhe desconto" / "Refer friends and earn discounts"
- `referral.copy_link` / "Copiar Link" / "Copy Link"
- `referral.copied` / "Copiado!" / "Copied!"
- `referral.share` / "Compartilhar" / "Share"
- `referral.friends_referred` / "amigos indicados" / "friends referred"
- `referral.discount_available` / "Voce tem desconto!" / "You have a discount!"
- `referral.discount_applied` / "Desconto de indicacao aplicado" / "Referral discount applied"

---

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---------|------|
| `supabase/migrations/` | Tabelas `referral_codes` e `referral_rewards` com RLS |
| `supabase/functions/create-payment/index.ts` | Logica de referral + cupom Stripe |
| `supabase/functions/verify-payment/index.ts` | Retornar desconto disponivel |
| `src/pages/Index.tsx` | Capturar `?ref=` param |
| `src/pages/Dashboard.tsx` | Card "Indique e Ganhe" com codigo + compartilhamento |
| `src/pages/Assessment.tsx` | Mostrar desconto se disponivel, enviar ref code |
| `src/contexts/LanguageContext.tsx` | Novas traducoes |
