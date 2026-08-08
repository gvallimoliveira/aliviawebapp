# Notificações por tipo de conta (paciente x profissional)

Hoje a lista "O que você quer receber" é idêntica para todos: avaliações/reavaliações recebidas, red flags, questionários — coisas que só fazem sentido para quem atende pacientes. Além disso, os avisos que realmente importam para o usuário pessoal (diário de dor, exercícios do HEP, boleto, sugestão de reavaliação) hoje são disparados sem categoria, ou seja, não obedecem a nenhum toggle.

## O que o usuário pessoal (paciente) passa a ver

Quatro opções, escritas na ótica de quem tem dor:

1. **Meu tratamento e exercícios** — lembrete diário do HEP, diário de dor, marcos de sequência (streak).
2. **Minha avaliação** — avaliação incompleta para retomar, resultado/plano pronto, sugestão de reavaliação após 30 dias.
3. **Mensagens do meu fisioterapeuta** — novas mensagens no chat e chamadas de vídeo.
4. **Pagamentos** — boleto a vencer, pagamento confirmado, premium disponível.

Ficam fora (nunca aparecem para conta pessoal): novas avaliações recebidas por link, red flags de pacientes, questionários respondidos, avisos de assinatura profissional.

## O que o profissional continua vendo

A lista completa do print atual (avaliações e reavaliações, mensagens e ligações, red flags, questionários e exercícios, assinatura e cobrança) **mais** os itens pessoais quando ele também usa o app como paciente, num bloco separado ("Uso pessoal"), já que a mesma conta acumula os dois papéis.

## Como o app decide qual lista mostrar

Mesma regra já usada no painel para liberar o modo profissional: existe registro em `professionals` considerado real (ativo, CREFITO válido, assinatura ou parceiro/clínica). Sem isso → lista de paciente. Membro de clínica também conta como profissional.

## Detalhes técnicos

- **Banco**: adicionar em `notification_preferences` as colunas `care_plan`, `my_assessment`, `payments` (boolean default true), mantendo as atuais para o lado profissional. GRANTs/RLS já existentes seguem válidos.
- **`NotificationPreferences.tsx`**: aceitar `variant: "patient" | "professional"`, com dois conjuntos de textos (pt/en/es) e a renderização em grupos; ler/gravar as novas colunas.
- **`Account.tsx`**: buscar o registro de `professionals` (+ `clinic_members`) e passar a variante correta; ajustar também a descrição do card de Notificações, que hoje fala de "avaliações e videochamadas" mesmo para paciente.
- **`supabase/functions/push-cron/index.ts`**: passar categoria nos lembretes que hoje vão sem nenhuma — diário de dor, exercícios, streaks → `care_plan`; avaliação incompleta, premium disponível, convite de avaliação, sugestão de reavaliação → `my_assessment`; boleto expirando → `payments`. `send-push-notification` já filtra por categoria, então os toggles passam a valer de fato.
- **Suporte**: atualizar `Support.tsx` e `ClinicSupport.tsx` (pt/en/es) descrevendo os dois conjuntos de notificações.
