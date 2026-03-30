

## Chat entre Paciente e Profissional

### Conceito

Criar um sistema de mensagens diretas dentro do ecossistema, permitindo que pacientes que encontraram um profissional na busca (`/professionals`) possam iniciar uma conversa. O profissional vê e responde pelo Painel Profissional. Ambos acessam via nova aba "Mensagens" no Dashboard.

### Arquitetura do banco de dados

**Tabela `conversations`**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | — |
| patient_user_id | uuid (NOT NULL) | Quem iniciou |
| professional_id | uuid (NOT NULL) | Ref ao `professionals.id` |
| created_at | timestamptz | — |
| updated_at | timestamptz | Atualizado a cada nova mensagem |

**Tabela `messages`**
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | uuid (PK) | — |
| conversation_id | uuid (NOT NULL) | FK para conversations |
| sender_user_id | uuid (NOT NULL) | auth.uid() de quem enviou |
| content | text (NOT NULL) | Texto da mensagem (max 2000 chars) |
| read_at | timestamptz (nullable) | Quando foi lida |
| created_at | timestamptz | — |

**RLS:**
- SELECT/INSERT em ambas tabelas: apenas participantes da conversa (patient_user_id = auth.uid() OU professional.user_id = auth.uid())
- Função `is_conversation_participant(conv_id, user_id)` SECURITY DEFINER para evitar recursão

**Realtime:**
- `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;` para entrega instantânea

### Regras de negócio

1. **Quem inicia:** Apenas o paciente, a partir da página de busca de profissionais ou do card de encaminhamento (referral)
2. **Uma conversa por par:** Se já existe conversa entre aquele paciente e profissional, reabre a existente
3. **Acesso:** Somente usuários logados com acesso premium podem enviar mensagens (mesma regra do acesso à busca de profissionais)
4. **Sem anexos na v1:** Apenas texto, para simplicidade e segurança
5. **Indicador de não lidas:** Badge numérico na aba "Mensagens" mostrando contagem de não lidas

### Componentes e páginas

| Arquivo | Descrição |
|---------|-----------|
| `src/components/chat/ConversationList.tsx` | Lista de conversas com última mensagem, timestamp, badge de não lidas |
| `src/components/chat/ChatWindow.tsx` | Área de mensagens com scroll, input de texto, indicador de leitura |
| `src/components/chat/ChatBubble.tsx` | Bolha de mensagem (estilo diferente para enviada/recebida) |

### Integração no Dashboard

- **Aba "Minha Saúde":** Adicionar sub-aba ou seção "Mensagens" com `ConversationList` filtrando por `patient_user_id = auth.uid()`
- **Aba "Painel Profissional":** Adicionar sub-aba "Mensagens" com `ConversationList` filtrando por `professional_id`
- Ao clicar em uma conversa, abre o `ChatWindow` inline (sem navegar para outra página)

### Ponto de entrada (iniciar conversa)

- Na página `/professionals`, adicionar botão "Enviar mensagem" no card do profissional
- Ao clicar: cria ou recupera a conversa existente e redireciona para `/dashboard?tab=messages&conv=<id>`

### Riscos mitigados

| Risco | Mitigação |
|-------|-----------|
| Spam | Rate limit: max 1 msg/segundo via validação client-side + RLS impede envio para conversas alheias |
| Conteúdo impróprio | v1 sem moderação automática, mas limite de 2000 chars e sem anexos reduz superfície |
| Performance | Realtime do Supabase com channel por conversation_id, não global |
| Privacidade | RLS restrito a participantes; sem acesso admin às mensagens |
| Complexidade | Sem grupos, sem typing indicator, sem edição/exclusão na v1 |

### Traduções

Novas chaves em `LanguageContext.tsx` para: título da aba, placeholder do input, "Enviar mensagem", "Sem conversas ainda", timestamps relativos, badge de não lidas.

### Suporte

Adicionar item na página de Suporte explicando o recurso de mensagens para ambos os perfis.

### Arquivos envolvidos

| Ação | Arquivo |
|------|---------|
| Migração | Nova tabela `conversations` + `messages` + RLS + realtime |
| Criar | `src/components/chat/ConversationList.tsx` |
| Criar | `src/components/chat/ChatWindow.tsx` |
| Criar | `src/components/chat/ChatBubble.tsx` |
| Editar | `src/pages/Dashboard.tsx` (nova aba Mensagens) |
| Editar | `src/pages/ProfessionalSearch.tsx` (botão "Enviar mensagem") |
| Editar | `src/contexts/LanguageContext.tsx` (traduções) |
| Editar | `src/pages/Support.tsx` (documentação do recurso) |

