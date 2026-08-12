# LGPD: protocolo, prova documental e exclusão em 1 clique

## O problema confirmado

No histórico, o e-mail do solicitante aparece como "e-mail indisponível" porque o painel busca o e-mail **ao vivo** em `auth.users`. Quando a conta é excluída (como no pedido da Nice Ferreira), o login deixa de existir e o e-mail desaparece do registro — exatamente no momento em que ele mais importa como prova. Hoje o pedido também não tem número de protocolo: só um id técnico (UUID).

## O que vai mudar

### 1. Protocolo e identidade congelada (prova documental)
Cada pedido passa a guardar, no próprio registro, um retrato imutável do solicitante no momento da abertura:

- **Número de protocolo** legível e único: `LGPD-2026-0001` (sequencial por ano), exibido em destaque no painel e informado ao titular.
- E-mail, nome, tipo de conta (paciente / PRO / estudante / equipe de clínica), origem do cadastro (e-mail e senha, Google) e data de criação da conta.
- Isso é gravado por gatilho no momento da solicitação, então nunca depende da conta continuar existindo.

Pedidos antigos são preenchidos retroativamente com o que ainda existir (o pedido já concluído fica com o e-mail recuperado do texto de auditoria).

### 2. Trilha de providências (auditoria estruturada)
Além do texto livre atual, o pedido ganha uma linha do tempo consultável: aberto → notificado → em análise → concluído, com quem executou, quando, o motivo informado e o resumo do que foi apagado (contagem por tabela). É o que você mostra caso precise comprovar a providência.

### 3. Exclusão em 1 clique no painel
No card do pedido, um botão **Excluir conta e dados** que já vem com o dossiê carregado (sem precisar clicar em "Investigar" antes): mostra tipo de conta, inventário por tabela e o que será preservado por guarda legal. Um clique, confirmação com motivo, e o sistema executa a purga, remove o login, marca o pedido como concluído, grava a auditoria e envia o e-mail de conclusão ao titular.

### 4. Exclusão iniciada pelo próprio titular (as duas vias)
Em "Minha conta → Privacidade e meus dados", o titular ganha **Excluir minha conta e meus dados**:

- Confirmação em duas etapas (digitar `EXCLUIR` + reautenticação implícita pela sessão), com aviso claro do que é apagado e do que é retido por lei (prontuário criado por profissional, registros de consentimento e auditoria LGPD).
- Registro automático de um pedido com protocolo, para prova, e execução imediata da purga.
- **Janela de arrependimento de 7 dias** por padrão: a conta é desativada e agendada para purga; o titular pode cancelar entrando em contato. Se você preferir purga imediata, é só dizer antes de eu construir.
- E-mail de confirmação ao titular com o número de protocolo e o que foi retido.

O caminho manual (você excluindo pelo painel) continua existindo em paralelo — para pedidos que chegam por e-mail, WhatsApp ou de contas que o titular não consegue acessar.

### 5. Aviso ao titular sobre o status
Hoje o titular só vê "solicitado" sem prazo. Passa a ver: protocolo, data de abertura, prazo legal (15 dias), status atual e, quando concluído, o que foi feito.

## Detalhes técnicos

- Migração em `data_subject_requests`: colunas `protocol` (único), `requester_email`, `requester_name`, `requester_account_type`, `requester_signup_provider`, `account_created_at`, `scheduled_purge_at`, `audit` (jsonb). Sequência anual + gatilho `BEFORE INSERT` para gerar protocolo e snapshot (função `SECURITY DEFINER` que lê `auth.users`/`profiles`/`professionals`).
- `get_dsr_admin` passa a retornar as colunas congeladas com fallback para o join atual, e o `audit` estruturado.
- Nova ação `self_purge` na edge function `admin-dsr-account` (ou função irmã `account-self-delete`) validando que o chamador é o próprio titular; reaproveita `admin_purge_user_data`.
- `admin-dsr-account` action `purge` passa a gravar `audit` estruturado (não só texto) e disparar o e-mail de conclusão via `notify-admin`/Resend.
- Backfill dos pedidos existentes em migração.
- UI: `AdminLgpdCenter.tsx` (protocolo, identidade congelada, timeline, botão direto), `DsrAccountPanel.tsx` (dossiê pré-carregado), `PrivacyRightsCard.tsx` (autoexclusão + status com protocolo).
- Memória `features/lgpd-compliance.md` atualizada com protocolo e as duas vias de exclusão.
