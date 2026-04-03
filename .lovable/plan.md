

# Otimizar Indicações Profissionais + Integração com Mensagens

## Situação Atual

**Indicações:** O profissional vê apenas "Indicação de paciente" + badge de status genérico. Sem nome, sem data, sem ação.

**Mensagens:** Pacientes podem iniciar conversa com qualquer profissional via `/buscar-profissional`. Profissionais não podem iniciar contato — nem com pacientes indicados.

**Regra de negócio desejada:**
- Via regra geral: só o paciente inicia conversa (pela lista de profissionais) ✅ já funciona
- Exceção: se o paciente está na lista de indicações do profissional, o profissional pode iniciar o contato

## Plano de Implementação

### 1. Enriquecer a seção de Indicações Recebidas no Dashboard

**Arquivo:** `src/pages/Dashboard.tsx` (renderReferrals) + `src/components/dashboard/ProDashboard.tsx`

Mover a seção de referrals para dentro do `ProDashboard` para acesso aos dados de pacientes. Cada card de indicação mostrará:
- Nome do paciente (via join com profiles usando `patient_user_id`)
- Data da indicação formatada
- Badge de status (pending/accepted/declined)
- Botão "Aceitar" / "Recusar" para gerenciar indicações
- Botão "Enviar Mensagem" — cria conversa com o paciente indicado

### 2. Permitir profissional iniciar conversa com pacientes indicados

**Arquivo:** `src/components/dashboard/ProDashboard.tsx`

No botão "Enviar Mensagem" de cada indicação:
1. Verificar se já existe conversa entre o `professional_id` e o `patient_user_id`
2. Se sim, navegar para `?tab=messages&conv={id}`
3. Se não, criar nova conversa e navegar

**Tabela `conversations`:** A RLS de INSERT só permite `auth.uid() = patient_user_id`. Precisamos adicionar uma policy que permita profissionais criarem conversas quando existe uma indicação pendente/aceita para aquele paciente.

### 3. Migration — Nova RLS policy para conversations

```sql
CREATE POLICY "Professionals can create conversations with referred patients"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.professionals p
    WHERE p.id = professional_id AND p.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.professional_referrals pr
    WHERE pr.professional_id = professional_id
    AND pr.patient_user_id = patient_user_id
  )
);
```

### 4. Enriquecer os cards de indicação

**Buscar dados do paciente:** Para cada referral, fazer lookup em `profiles` usando `patient_user_id` para obter `full_name`.

Layout do card:
```text
┌──────────────────────────────────────────┐
│ 👤 João Silva          12 Mar 2026       │
│ Status: [Pendente]                       │
│ [✓ Aceitar] [✗ Recusar] [💬 Mensagem]   │
└──────────────────────────────────────────┘
```

### 5. Ações de aceitar/recusar indicação

A tabela `professional_referrals` já tem RLS de UPDATE para profissionais. Basta atualizar o `status` para `accepted` ou `declined`.

### 6. Traduções (pt/en/es)

Novas chaves:
- `prof.referral_accept` / `prof.referral_decline`
- `prof.referral_status_pending` / `accepted` / `declined`
- `prof.referral_send_message`
- `prof.referral_patient_name`

## Arquivos a alterar

1. **Migration** — nova RLS policy em `conversations` para profissionais com indicações
2. `src/pages/Dashboard.tsx` — remover `renderReferrals()` e `referrals` state (mover para ProDashboard)
3. `src/components/dashboard/ProDashboard.tsx` — seção de indicações enriquecida com nome, data, ações e botão de mensagem
4. `src/locales/pt.json`, `en.json`, `es.json` — novas chaves de tradução

