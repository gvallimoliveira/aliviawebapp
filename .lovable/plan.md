## Plano: Desbloqueio de Plano de Tratamento para Avaliações Profissionais (R$19,90)

### Contexto

Atualmente, avaliações profissionais (`type: "professional"`) geram apenas hipótese diagnóstica + resumo, sem plano de tratamento. A proposta é oferecer ao fisioterapeuta a possibilidade de desbloquear o plano de tratamento por R$9,90 por avaliação, usando a mesma estratégia de "blurred preview" já utilizada na conversão basic→premium.

---

### 1. Constante de Preço

`**src/constants/pricing.ts**` — Adicionar:

```typescript
export const PRO_TREATMENT_PRICE = 19.90;
export const PRO_TREATMENT_PRICE_FORMATTED = `R$ 19,90`;
```

### 2. Produto e Preço no Stripe

Criar produto "Pro Treatment Unlock" com preço R$9,90 (one-time) via ferramenta Stripe.

### 3. Edge Function: `create-pro-treatment-payment`

Nova edge function que:

- Autentica o profissional (deve ser dono da avaliação via `professional_id`)
- Recebe `assessment_id` no body
- Cria checkout session Stripe com `mode: "payment"`, preço R$9,90
- `success_url` → `/payment-success?session_id={CHECKOUT_SESSION_ID}&type=pro_treatment&assessment_id=<id>`
- Metadata inclui `assessment_id` e `user_id`

### 4. Lógica de Verificação e Geração

Estender `verify-payment` ou criar lógica no fluxo de sucesso:

- Ao verificar pagamento de `type=pro_treatment`, invocar `generate-treatment` com os dados da avaliação profissional
- Salvar o `treatment_plan` na avaliação e marcar `payment_status` como `"treatment_paid"` (ou usar campo adicional)

Alternativa mais simples: na página de sucesso, após verificação do pagamento, chamar `generate-treatment` diretamente do frontend (o profissional está autenticado e os dados já estão no banco).

### 5. UI — Blurred Preview na Visualização da Avaliação Profissional

`**src/pages/AssessmentView.tsx**` — Quando `assessment.type === "professional"`:

- Após o resultado do diagnóstico, mostrar preview desfocada do plano de tratamento (similar ao `BlurredPreview` do `DiagnosisResult.tsx`)
- Se `treatment_plan` já existe → mostra normalmente
- Se não existe → mostra 3 cards blurred (fases curto/médio/longo prazo com conteúdo fake) + CTA de desbloqueio R$9,90
- CTA invoca `create-pro-treatment-payment` com o `assessment_id`

### 6. UI — Indicador na Lista de Avaliações (ProDashboard)

`**src/components/dashboard/ProDashboard.tsx**` — Na lista de avaliações do profissional:

- Adicionar badge sutil "Tratamento disponível" nas avaliações que têm diagnóstico mas não têm `treatment_plan`
- Badge "Tratamento desbloqueado" nas que já têm `treatment_plan`

### 7. Página de Sucesso do Pagamento

`**src/pages/PaymentSuccess.tsx**` — Estender para:

- Detectar `type=pro_treatment` nos search params
- Após verificação, gerar tratamento automaticamente (chamando `generate-treatment`)
- Redirecionar para `/assessment/view/<id>` com tratamento já gerado

### 8. Traduções

`**src/contexts/LanguageContext.tsx**` — Novas chaves para:

- Textos do CTA de desbloqueio
- Badge de tratamento disponível/desbloqueado
- Mensagens de sucesso de pagamento pro treatment

---

### Arquivos a criar/editar


| Arquivo                                                    | Mudança                                                          |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/constants/pricing.ts`                                 | Nova constante `PRO_TREATMENT_PRICE`                             |
| `supabase/functions/create-pro-treatment-payment/index.ts` | **Novo** — checkout Stripe R$9,90                                |
| `supabase/functions/verify-payment/index.ts`               | Estender para lidar com `type=pro_treatment`                     |
| `src/pages/PaymentSuccess.tsx`                             | Fluxo pro_treatment: gerar tratamento + redirect                 |
| `src/pages/AssessmentView.tsx`                             | Blurred preview + CTA desbloqueio para assessments profissionais |
| `src/components/dashboard/ProDashboard.tsx`                | Badge tratamento disponível/desbloqueado                         |
| `src/contexts/LanguageContext.tsx`                         | Traduções                                                        |
| `supabase/config.toml`                                     | Registrar nova function                                          |
