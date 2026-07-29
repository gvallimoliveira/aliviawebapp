## Situação atual (verificada no código)

- O push **já é aberto a qualquer usuário logado**: `src/pages/Account.tsx` tem o card "Notificações" usando `usePushNotifications`, e `push_subscriptions` guarda um registro por aparelho. O card do Admin (`AdminAlertDevices`) é só um atalho extra para você.
- Gatilhos que já existem hoje: nova mensagem no chat, avaliação concluída por link do profissional, red flag (link profissional e clínica) e chamadas de vídeo.
- Só para admin (permanece assim): vendas, assinaturas novas e reembolsos, via `notify-admin` (Telegram + e-mail + push), restrito aos e-mails VIP.

Faltam: avaliação recebida por link de clínica e reavaliação, questionário/HEP respondido, renovação confirmada, cobrança falhou/assinatura expirando — e um lugar onde o usuário escolha o que quer receber.

## O que será construído

### 1. Preferências por tipo
Nova tabela `notification_preferences` (uma linha por usuário) com liga/desliga para:
- Novas avaliações e reavaliações recebidas
- Mensagens e ligações na plataforma
- Red flag detectada
- Questionário / HEP respondido pelo paciente
- Assinatura: renovação confirmada, cobrança falhou, plano expirando

Padrão: tudo ligado. Acesso restrito ao próprio usuário.

### 2. Filtro central no envio
`send-push-notification` passa a aceitar uma `category` e, antes de enviar, descarta destinatários que desligaram aquela categoria. Chamadas de vídeo e red flag continuam podendo ser marcadas como críticas. Nada muda para quem não mexer nas preferências.

### 3. Tela de controle
No card "Notificações" da Minha Conta: switch por categoria (além do liga/desliga do aparelho), em pt/en/es. O mesmo card fica visível para paciente, profissional, estudante e clínica — mostrando só as categorias que fazem sentido para o perfil.

### 4. Novos gatilhos
- **Avaliação recebida por link de clínica** e **reavaliação**: push para o profissional responsável (e para dono/secretária, no modo clínica) — hoje só o red flag avisa nesse caminho.
- **Questionário pendente respondido** e **exercícios do HEP marcados**: push para o profissional.
- **Assinatura**: no `stripe-webhook`, avisos ao próprio assinante em renovação confirmada (`invoice.paid` de renovação), cobrança recusada (`invoice.payment_failed`) e assinatura prestes a vencer/cancelada. Os alertas de venda continuam exclusivos do admin.

### 5. Suporte e memória
Atualizar Support.tsx, ClinicSupport.tsx e as três traduções com a seção de notificações, e registrar as regras na memória do projeto.

## Detalhes técnicos

- Tabela `notification_preferences` com colunas booleanas por categoria, RLS por `auth.uid()` e GRANTs para `authenticated`/`service_role`; leitura pelo service role dentro da edge function.
- `send-push-notification` ganha o parâmetro opcional `category`; ausência de categoria mantém o comportamento atual (compatível com chamadas antigas).
- Aviso de "assinatura expirando" via varredura no cron já existente (`push-cron`), evitando nova infraestrutura.
- Nenhuma alteração no service worker nem nas chaves VAPID — o registro por aparelho continua igual ao que acabou de funcionar no seu celular.
