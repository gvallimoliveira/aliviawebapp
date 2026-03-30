## Dashboard Admin de Leads Capturados

### Objetivo

Criar um componente `LeadManagement` no painel admin para visualizar os e-mails capturados nas avaliações básicas (usuários não logados). E permita exportar esses dados fazer download ou enviar via PDF no WhatsApp 

### Alterações

**Novo arquivo: `src/components/admin/LeadManagement.tsx**`

- Consulta `assessments` filtrando `type = 'basic'` e `patient_email IS NOT NULL`
- Exibe tabela com colunas: E-mail, Data, Status da avaliação, Score de dor
- Contador total de leads no header do card
- Ordenação por data decrescente
- Busca/filtro por e-mail
- Badge colorido para status (in_progress / completed)
- Usa o mesmo padrão visual dos outros componentes admin (Card + Table)

**Editar: `src/pages/Admin.tsx**`

- Importar e renderizar `<LeadManagement />` após `SupportTicketManagement`

### Observação sobre acesso

A query usa a service role indiretamente — o admin já é validado pelo fluxo VIP existente. As avaliações básicas com `user_id IS NULL` são acessíveis via RLS existente (`Anyone can view professional assessments`) mas para basic sem user_id precisaremos de uma edge function ou RLS adicional. A abordagem mais segura é criar uma edge function `list-leads` que usa service role para buscar esses registros, seguindo o padrão do `manage-vip-users`.

### Detalhes técnicos


| Arquivo                                        | Ação                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/components/admin/LeadManagement.tsx`      | Criar componente                                                                                  |
| `src/pages/Admin.tsx`                          | Importar e adicionar ao layout                                                                    |
| `supabase/functions/manage-vip-users/index.ts` | Adicionar action `list_leads` que busca assessments básicos com patient_email usando service role |
