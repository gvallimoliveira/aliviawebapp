## O que eu verifiquei (causas reais)

Diagnóstico feito agora no backend, não é suposição:

1. **O ticket da Rita existe** (`Conta pro`, 25/jul). Ou seja: o formulário gravou certo — o que falhou foi só o aviso.
2. **Push era impossível**: seus dois e-mails VIP têm **0 dispositivos registrados** para notificação push. Nunca houve destino.
3. **E-mail era impossível**: o app envia como `onboarding@resend.dev`. Esse remetente de teste só entrega para o e-mail dono da conta de envio — para qualquer outro destinatário a chamada é recusada. E o projeto **não tem domínio de e-mail verificado** configurado.
4. **Disparo frágil**: o aviso é disparado pelo navegador em modo "dispara e esquece". Se der erro, se a aba fechar, se a rede cair — ninguém percebe e nada reenvia.
5. **Stripe**: o app nunca teve alerta de venda. O webhook recebe `checkout.session.completed` mas só atualiza acesso, não avisa você. E as notificações nativas da Stripe são uma configuração da conta (fora do código).

Ou seja: as três camadas falharam por motivos diferentes. Por isso a tentativa anterior "não rodou".

## Nova abordagem

Sair do modelo "o navegador avisa" e ir para **um canal central de alertas admin, disparado pelo servidor, com reenvio automático**.

### 1. Canal central de alertas
Uma única função `notify-admin` que recebe qualquer evento (`support_ticket`, `stripe_sale`, `stripe_refund`, `erro crítico`) e dispara nos canais ativos. Todas as origens passam por ela — nunca mais três implementações diferentes.

### 2. Telegram (canal primário — funciona hoje mesmo)
Grátis, instantâneo, sem DNS, sem dispositivo registrado. Você cria um bot pelo @BotFather e me passa o token; eu descubro seu chat ID e guardo como segredo. É o único canal que fica 100% operacional já no dia da implementação.

### 3. E-mail próprio (canal formal)
Configurar `aliviawebapp.com.br` como remetente verificado e trocar todos os envios que hoje usam o remetente de teste (suporte, VIP, follow-up). Exige uma ação sua: completar o assistente de domínio (registros de DNS). Ativa quando o DNS propagar.

### 4. Push (canal de conveniência)
Adicionar no painel Admin um cartão "Meus dispositivos de notificação": mostra quantos dispositivos estão registrados, botão para ativar no aparelho atual e botão "Enviar teste". Assim nunca mais fica invisível que o push está com zero destinos.

### 5. Garantia de entrega (o ponto que faltou antes)
- Coluna `notified_at` em `support_tickets`.
- Disparo pelo servidor no momento do insert, não pelo navegador.
- **Varredura automática a cada 5 minutos**: qualquer ticket sem `notified_at` é reenviado. Se um canal cair, o alerta chega assim que voltar.
- Tabela de log de alertas para você auditar o que saiu e o que falhou.

### 6. Stripe (os dois caminhos, como você pediu)
- **No app**: no webhook, ao confirmar pagamento (e em reembolso/assinatura cancelada), enviar alerta com nome, e-mail, produto, valor bruto e taxa.
- **Na Stripe**: te passo o passo a passo para ligar as notificações nativas de pagamento na conta — redundância independente do nosso código.

## Detalhes técnicos

- Nova edge function `notify-admin` (Telegram + e-mail + push, cada canal isolado em try/catch — um canal quebrado não derruba os outros).
- `notify-admin-support` vira um cliente fino de `notify-admin`; `SupportContactForm` deixa de ser responsável pelo envio.
- Trigger no insert de `support_tickets` chamando a função via `pg_net`, mais job `pg_cron` de 5 em 5 minutos como rede de segurança.
- Migração: `support_tickets.notified_at`, tabela `admin_alert_log` (RLS: leitura só admin, escrita só service role, com GRANTs).
- `stripe-webhook`: chamada a `notify-admin` dentro de `EdgeRuntime.waitUntil` para não atrasar o ACK da Stripe.
- Segredos novos: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`.

## Prova antes de declarar pronto (Portão 3)

1. Inserir um ticket de teste e mostrar o `admin_alert_log` com status `sent` no Telegram.
2. Reprocessar um evento de pagamento real de teste e mostrar o alerta gerado.
3. Consulta mostrando o ticket da Rita com `notified_at` preenchido após o reenvio da varredura.

## O que precisa de você

- Token do bot do Telegram (2 minutos no @BotFather).
- Completar o assistente de domínio de e-mail (DNS) — só para o canal e-mail.
- Ativar notificações no celular quando o cartão novo aparecer no Admin.

## Ordem sugerida

Fase 1 (mesma sessão): canal central + Telegram + garantia de entrega + alerta Stripe no webhook + reenvio do ticket da Rita.
Fase 2: domínio de e-mail e troca do remetente em todas as funções.
Fase 3: cartão de dispositivos push no Admin.
