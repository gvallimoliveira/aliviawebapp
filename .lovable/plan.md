

# Arquivamento de tickets de suporte + tabela de backup

## Abordagem

Não deletar tickets — usar **soft delete** via campo `archived_at`. Tickets arquivados saem da listagem principal mas continuam no banco. Além disso, criar uma tabela `support_tickets_archive` como backup permanente: antes de arquivar, copiar o ticket inteiro para lá.

## 1. Migration — adicionar campo + tabela de backup

```sql
-- Campo de arquivamento (soft delete)
ALTER TABLE public.support_tickets ADD COLUMN archived_at timestamptz DEFAULT NULL;

-- Tabela de backup permanente
CREATE TABLE public.support_tickets_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_ticket_id uuid NOT NULL,
  user_id uuid NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL,
  admin_reply text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  archived_by uuid NOT NULL
);

-- RLS: apenas admins podem ver/inserir no archive
ALTER TABLE public.support_tickets_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage archive"
  ON public.support_tickets_archive FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
```

## 2. Edge function — ação `archive_ticket`

No `manage-vip-users/index.ts`, adicionar action `archive_ticket` que:
1. Busca o ticket pelo ID (service role)
2. Insere cópia na `support_tickets_archive` com `archived_by = user.id`
3. Atualiza o ticket original com `archived_at = now()`

## 3. UI — botão de arquivar + filtro

No `SupportTicketManagement.tsx`:
- Adicionar botão `Archive` (ícone Archive) nos tickets com status `closed` ou `replied`
- Filtro padrão: ocultar tickets com `archived_at` preenchido (query `.is("archived_at", null)`)
- Toggle "Mostrar arquivados" para ver histórico completo
- Tickets arquivados aparecem com visual diferenciado (opacity reduzida) e badge "Arquivado"
- Confirmação antes de arquivar

## 4. Traduções no mapa interno do componente

Chaves: `archive`, `archived`, `show_archived`, `archive_confirm`, `archive_success`

## Arquivos a alterar

1. **Migration** — `archived_at` na `support_tickets` + tabela `support_tickets_archive` com RLS
2. `supabase/functions/manage-vip-users/index.ts` — action `archive_ticket`
3. `src/components/admin/SupportTicketManagement.tsx` — botão arquivar, filtro, toggle

