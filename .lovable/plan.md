

## Plano: Seção B2B na Landing Page + Admin Parceiros Gratuitos

### 1. Nova seção na Landing Page para Fisioterapeutas

Criar componente `ProfessionalSection.tsx` posicionado entre `TestimonialsSection` e `FaqSection` na Index. Conteudo focado em venda B2B:

- Titulo: "Fisioterapeuta, potencialize suas consultas"
- 3-4 cards de beneficios com icones (Clock: "Economize 30min por consulta", Target: "Avaliações mais assertivas", FileText: "Anamnese + questionários prontos", TrendingUp: "Impressione com relatórios profissionais")
- Argumento central: "Receba seus pacientes com anamnese completa, mapa de dor e questionários validados antes da primeira consulta. Avaliações mais assertivas, tratamentos mais eficazes."
- CTA: "Assinar Plano Profissional — R$49/mês" → navega para `/professional/register`
- Visual: gradiente sutil, badge "Para Profissionais", design premium

### 2. Admin: Gestão de Parceiros Gratuitos

Adicionar nova seção no `Admin.tsx` com um card "Parceiros — Acesso Gratuito":

- Input de email do profissional cadastrado
- Ao clicar "Liberar", uma Edge Function (`manage-vip-users` ou nova) busca o profissional pelo email na tabela `professionals` e seta `subscription_status = 'active'` sem Stripe
- Lista de profissionais com status "partner" (parceiros com acesso gratuito)
- Botão para revogar acesso gratuito (volta `subscription_status` para `inactive`)

**Abordagem técnica para parceiros:**
- Adicionar coluna `is_partner` (boolean, default false) na tabela `professionals` — distingue parceiros gratuitos de assinantes pagos
- Modificar `check-pro-subscription`: se `is_partner = true`, retorna `{ subscribed: true }` sem verificar Stripe
- Admin pode setar `is_partner = true/false` via edge function (reusa `manage-vip-users` com novo action ou cria endpoint dedicado no mesmo)
- No `ProDashboard`, parceiros veem badge "Parceiro" ao inves de "Ativo" e nao veem botao "Gerenciar assinatura"

### 3. Migracao SQL

```sql
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS is_partner boolean NOT NULL DEFAULT false;
```

### 4. Traduções

Novas chaves PT/EN para seção B2B na landing e para o admin de parceiros.

### Arquivos a criar/editar

| Arquivo | Ação |
|---|---|
| `src/components/ProfessionalSection.tsx` | Novo — seção B2B landing |
| `src/pages/Index.tsx` | Adicionar ProfessionalSection |
| `src/pages/Admin.tsx` | Adicionar card de gestão de parceiros |
| `supabase/functions/check-pro-subscription/index.ts` | Verificar `is_partner` antes de Stripe |
| `supabase/functions/manage-vip-users/index.ts` | Adicionar action PATCH para toggle `is_partner` |
| `src/components/dashboard/ProDashboard.tsx` | Badge "Parceiro" para partners |
| `src/contexts/LanguageContext.tsx` | Novas traduções |
| Migration SQL | Coluna `is_partner` |

